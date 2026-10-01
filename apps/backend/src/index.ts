import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { db } from './db'
import { tasks, insertTaskSchema } from './db/schema'
import { seed } from './db/seed'

const app = new Hono()

app.use('/api/*', cors({ origin: 'http://localhost:5173' }))

seed().catch(console.error)

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

const routes = app
  .get('/api/board', async (c) => {
    const allColumns = await db.query.columns.findMany({
      orderBy: (columns, { asc }) => [asc(columns.position)],
    })
    const allTasks = await db.query.tasks.findMany({
      orderBy: (tasks, { asc }) => [asc(tasks.position)],
    })
    return c.json({ columns: allColumns, tasks: allTasks })
  })
  .post('/api/tasks', zValidator('json', insertTaskSchema, (result, c) => {
    if (!result.success) {
      return c.json({ success: false, error: result.error.flatten() }, 400)
    }
  }), async (c) => {
    const validated = c.req.valid('json')
    const [inserted] = await db.insert(tasks).values(validated).returning()
    return c.json({ success: true, data: inserted })
  })
  .patch('/api/tasks/move', zValidator('json', moveTaskSchema), async (c) => {
    const { id, columnId, position } = c.req.valid('json')
    const [updated] = await db
      .update(tasks)
      .set({ columnId, position })
      .where(eq(tasks.id, id))
      .returning()
    if (!updated) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    return c.json({ success: true, data: updated })
  })
  .delete('/api/tasks/:id', async (c) => {
    const id = c.req.param('id')
    const [deleted] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
    if (!deleted) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    return c.json({ success: true, id })
  })
  .put('/api/tasks/update', zValidator('json', updateTaskSchema), async (c) => {
    const { id, title, description } = c.req.valid('json')
    const [updated] = await db
      .update(tasks)
      .set({ title, description })
      .where(eq(tasks.id, id))
      .returning()
    if (!updated) {
      return c.json({ success: false, error: 'Not Found' }, 404)
    }
    return c.json({ success: true, data: updated })
  })

export type AppType = typeof routes
export default app
