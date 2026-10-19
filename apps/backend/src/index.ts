import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from './db'
import { insertTaskSchema, insertSprintSchema, updateSprintSchema } from './db/schema'

const app = new Hono()

app.use('/api/*', cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }))

const moveTaskSchema = z.object({
  id: z.string(),
  columnId: z.string(),
  position: z.number().int(),
})

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'タイトルは必須です'),
  description: z.string().nullable(),
})

const sprintColumns = [
  { suffix: 'todo', title: 'Todo 📝', position: 0 },
  { suffix: 'progress', title: 'In Progress 🚀', position: 1 },
  { suffix: 'done', title: 'Done ✅', position: 2 },
] as const

const routes = app
  .post('/api/sprints', zValidator('json', insertSprintSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const { id, name, startDate, endDate } = c.req.valid('json')
    const sprint = await db.$transaction(async (tx) => {
      const created = await tx.sprint.create({ data: { id, name, startDate, endDate } })
      for (const col of sprintColumns) {
        await tx.column.create({
          data: {
            id: `col-${id}-${col.suffix}`,
            title: col.title,
            position: col.position,
            sprintId: created.id,
          },
        })
      }
      return created
    })
    return c.json({ success: true, data: sprint })
  })
  .get('/api/sprints', async (c) => {
    const sprints = await db.sprint.findMany({
      orderBy: { startDate: 'desc' },
      include: { columns: { include: { tasks: true } } },
    })
    const result = sprints.map((sprint) => {
      const tasks = sprint.columns.flatMap((col) => col.tasks)
      const doneColumn = sprint.columns.find((col) => col.position === 2)
      const doneCount = doneColumn
        ? tasks.filter((t) => t.columnId === doneColumn.id).length
        : 0
      const taskCount = tasks.length
      const progress = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 1000) / 10
      const { columns: _columns, ...rest } = sprint
      return { ...rest, taskCount, doneCount, progress }
    })
    return c.json(result)
  })
  .patch('/api/sprints/:id', zValidator('json', updateSprintSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const result = await db.sprint.updateMany({ where: { id }, data })
    if (result.count === 0) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const updated = await db.sprint.findUniqueOrThrow({ where: { id } })
    return c.json({ success: true, data: updated })
  })
  .delete('/api/sprints/:id', async (c) => {
    const id = c.req.param('id')
    const sprint = await db.sprint.findUnique({
      where: { id },
      include: { columns: true },
    })
    if (!sprint) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const columnIds = sprint.columns.map((col) => col.id)
    await db.$transaction([
      db.task.deleteMany({ where: { columnId: { in: columnIds } } }),
      db.column.deleteMany({ where: { sprintId: id } }),
      db.sprint.delete({ where: { id } }),
    ])
    return c.json({ success: true, id })
  })
  .get('/api/sprints/:id/board', async (c) => {
    const id = c.req.param('id')
    const sprint = await db.sprint.findUnique({ where: { id } })
    if (!sprint) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const columns = await db.column.findMany({
      where: { sprintId: id },
      orderBy: { position: 'asc' },
    })
    const tasks = await db.task.findMany({
      where: { columnId: { in: columns.map((col) => col.id) } },
      orderBy: { position: 'asc' },
    })
    return c.json({ sprint, columns, tasks })
  })
  .post('/api/tasks', zValidator('json', insertTaskSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const validated = c.req.valid('json')
    const inserted = await db.task.create({ data: validated })
    return c.json({ success: true, data: inserted })
  })
  .patch('/api/tasks/move', zValidator('json', moveTaskSchema), async (c) => {
    const { id, columnId, position } = c.req.valid('json')
    const result = await db.task.updateMany({ where: { id }, data: { columnId, position } })
    if (result.count === 0) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const updated = await db.task.findUniqueOrThrow({ where: { id } })
    return c.json({ success: true, data: updated })
  })
  .delete('/api/tasks/:id', async (c) => {
    const id = c.req.param('id')
    const result = await db.task.deleteMany({ where: { id } })
    if (result.count === 0) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    return c.json({ success: true, id })
  })
  .put('/api/tasks/update', zValidator('json', updateTaskSchema), async (c) => {
    const { id, title, description } = c.req.valid('json')
    const result = await db.task.updateMany({ where: { id }, data: { title, description } })
    if (result.count === 0) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    const updated = await db.task.findUniqueOrThrow({ where: { id } })
    return c.json({ success: true, data: updated })
  })

export type AppType = typeof routes
export default app
