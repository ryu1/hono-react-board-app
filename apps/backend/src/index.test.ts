import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import app from './index'
import { db } from './db'
import { ensureTestSprint } from './db/test-fixtures'

let cols: { todoId: string; progressId: string; doneId: string }

beforeAll(async () => {
  await db.task.deleteMany({ where: { id: 'test-task-1' } })
  cols = await ensureTestSprint()
})

async function getBoard() {
  const res = await app.request('/api/board')
  return res
}

async function createTask(body: unknown) {
  const res = await app.request('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res
}

describe('GET /api/board', () => {
  it('returns columns and tasks', async () => {
    const res = await getBoard()
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('columns')
    expect(data).toHaveProperty('tasks')
    expect(Array.isArray(data.columns)).toBe(true)
    expect(data.columns.length).toBeGreaterThanOrEqual(3)
  })
})

describe('POST /api/tasks', () => {
  it('rejects empty title with 400', async () => {
    const res = await createTask({
      id: 'test-invalid',
      columnId: cols.todoId,
      title: '',
      position: 0,
    })
    expect(res.status).toBe(400)
  })

  it('creates a valid task', async () => {
    const res = await createTask({
      id: 'test-task-1',
      columnId: cols.todoId,
      title: 'Test Task',
      position: 0,
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.title).toBe('Test Task')
  })
})

describe('PATCH /api/tasks/move', () => {
  it('moves a task to another column', async () => {
    const res = await app.request('/api/tasks/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        columnId: cols.progressId,
        position: 0,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.columnId).toBe(cols.progressId)
  })
})

describe('PUT /api/tasks/update', () => {
  it('updates task title and description', async () => {
    const res = await app.request('/api/tasks/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        title: 'Updated Title',
        description: 'Updated desc',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.title).toBe('Updated Title')
    expect(data.data.description).toBe('Updated desc')
  })

  it('rejects empty title with 400', async () => {
    const res = await app.request('/api/tasks/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'test-task-1',
        title: '',
        description: null,
      }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('deletes a task', async () => {
    const res = await app.request('/api/tasks/test-task-1', {
      method: 'DELETE',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.id).toBe('test-task-1')
  })
})

describe('nonexistent resources return 404', () => {
  it('PATCH /api/tasks/move returns 404 for a nonexistent id', async () => {
    const res = await app.request('/api/tasks/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'does-not-exist-move',
        columnId: cols.progressId,
        position: 0,
      }),
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })

  it('PUT /api/tasks/update returns 404 for a nonexistent id', async () => {
    const res = await app.request('/api/tasks/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'does-not-exist-update',
        title: 'Nope',
        description: null,
      }),
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })

  it('DELETE /api/tasks/:id returns 404 for a nonexistent id', async () => {
    const res = await app.request('/api/tasks/does-not-exist-delete', {
      method: 'DELETE',
    })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })
})

async function cleanupSprints(ids: string[]) {
  const sprints = await db.sprint.findMany({
    where: { id: { in: ids } },
    include: { columns: true },
  })
  const columnIds = sprints.flatMap((s) => s.columns.map((c) => c.id))
  await db.task.deleteMany({ where: { columnId: { in: columnIds } } })
  await db.column.deleteMany({ where: { id: { in: columnIds } } })
  await db.sprint.deleteMany({ where: { id: { in: ids } } })
}

async function createSprint(body: unknown) {
  return app.request('/api/sprints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/sprints', () => {
  it('creates a sprint with 3 columns', async () => {
    await cleanupSprints(['sp-create-1'])
    const res = await createSprint({
      id: 'sp-create-1', name: 'Sprint A', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data.name).toBe('Sprint A')

    const columns = await db.column.findMany({
      where: { sprintId: 'sp-create-1' },
      orderBy: { position: 'asc' },
    })
    expect(columns.map((c) => c.title)).toEqual(['Todo 📝', 'In Progress 🚀', 'Done ✅'])
    expect(columns.map((c) => c.id)).toEqual([
      'col-sp-create-1-todo', 'col-sp-create-1-progress', 'col-sp-create-1-done',
    ])
  })

  it('rejects inverted dates with 400', async () => {
    const res = await createSprint({
      id: 'sp-create-2', name: 'Bad', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.success).toBe(false)
  })

  it('rejects empty name with 400', async () => {
    const res = await createSprint({
      id: 'sp-create-3', name: '', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/sprints', () => {
  it('returns sprints ordered by startDate desc with progress aggregates', async () => {
    await cleanupSprints(['sp-list-a', 'sp-list-b', 'sp-list-prog'])
    await createSprint({ id: 'sp-list-a', name: 'A', startDate: '2026-01-01', endDate: '2026-01-14' })
    await createSprint({ id: 'sp-list-b', name: 'B', startDate: '2026-06-01', endDate: '2026-06-14' })
    await createSprint({ id: 'sp-list-prog', name: 'Prog', startDate: '2026-03-01', endDate: '2026-03-14' })
    await db.task.create({
      data: { id: 'sp-task-1', columnId: 'col-sp-list-prog-todo', title: 'Todo task', position: 0 },
    })
    await db.task.create({
      data: { id: 'sp-task-2', columnId: 'col-sp-list-prog-done', title: 'Done task', position: 0 },
    })

    const res = await app.request('/api/sprints')
    expect(res.status).toBe(200)
    const data: Array<{ id: string; taskCount: number; doneCount: number; progress: number }> =
      await res.json()

    const idxA = data.findIndex((s) => s.id === 'sp-list-a')
    const idxB = data.findIndex((s) => s.id === 'sp-list-b')
    expect(idxB).toBeLessThan(idxA)

    const prog = data.find((s) => s.id === 'sp-list-prog')
    expect(prog).toMatchObject({ taskCount: 2, doneCount: 1, progress: 50 })
  })

  it('returns progress 0 for a sprint with no tasks', async () => {
    await cleanupSprints(['sp-list-empty'])
    await createSprint({ id: 'sp-list-empty', name: 'Empty', startDate: '2026-02-01', endDate: '2026-02-14' })
    const res = await app.request('/api/sprints')
    const data: Array<{ id: string; taskCount: number; doneCount: number; progress: number }> =
      await res.json()
    const empty = data.find((s) => s.id === 'sp-list-empty')
    expect(empty).toMatchObject({ taskCount: 0, doneCount: 0, progress: 0 })
  })
})

describe('PATCH /api/sprints/:id', () => {
  it('updates name and period', async () => {
    await cleanupSprints(['sp-patch-1'])
    await createSprint({ id: 'sp-patch-1', name: 'Before', startDate: '2026-10-01', endDate: '2026-10-14' })
    const res = await app.request('/api/sprints/sp-patch-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'After', startDate: '2026-11-01', endDate: '2026-11-14' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.name).toBe('After')
    expect(data.data.startDate).toBe('2026-11-01')
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-patch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', startDate: '2026-10-01', endDate: '2026-10-14' }),
    })
    expect(res.status).toBe(404)
  })

  it('rejects inverted dates with 400', async () => {
    await cleanupSprints(['sp-patch-2'])
    await createSprint({ id: 'sp-patch-2', name: 'Tmp', startDate: '2026-10-01', endDate: '2026-10-14' })
    const res = await app.request('/api/sprints/sp-patch-2', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', startDate: '2026-10-14', endDate: '2026-10-01' }),
    })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/sprints/:id', () => {
  it('deletes sprint with cascading columns and tasks', async () => {
    await cleanupSprints(['sp-del-1'])
    await createSprint({ id: 'sp-del-1', name: 'Doomed', startDate: '2026-10-01', endDate: '2026-10-14' })
    await db.task.create({
      data: { id: 'sp-del-task-1', columnId: 'col-sp-del-1-todo', title: 'Gone', position: 0 },
    })

    const res = await app.request('/api/sprints/sp-del-1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toEqual({ success: true, id: 'sp-del-1' })

    expect(await db.sprint.findUnique({ where: { id: 'sp-del-1' } })).toBeNull()
    expect(await db.task.findUnique({ where: { id: 'sp-del-task-1' } })).toBeNull()
    const orphans = await db.column.findMany({ where: { sprintId: 'sp-del-1' } })
    expect(orphans).toHaveLength(0)
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-del', { method: 'DELETE' })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/sprints/:id/board', () => {
  it('returns sprint, its columns, and only its tasks', async () => {
    await cleanupSprints(['sp-board-1', 'sp-board-2'])
    await createSprint({ id: 'sp-board-1', name: 'Board 1', startDate: '2026-10-01', endDate: '2026-10-14' })
    await createSprint({ id: 'sp-board-2', name: 'Board 2', startDate: '2026-10-15', endDate: '2026-10-28' })
    await db.task.create({
      data: { id: 'sp-board-task-1', columnId: 'col-sp-board-1-todo', title: 'Mine', position: 0 },
    })
    await db.task.create({
      data: { id: 'sp-board-task-2', columnId: 'col-sp-board-2-todo', title: 'Others', position: 0 },
    })

    const res = await app.request('/api/sprints/sp-board-1/board')
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.sprint.id).toBe('sp-board-1')
    expect(data.columns).toHaveLength(3)
    expect(data.columns.map((col: { title: string }) => col.title)).toEqual([
      'Todo 📝', 'In Progress 🚀', 'Done ✅',
    ])
    expect(data.tasks.map((t: { id: string }) => t.id)).toEqual(['sp-board-task-1'])
  })

  it('returns 404 for a nonexistent sprint', async () => {
    const res = await app.request('/api/sprints/does-not-exist-board/board')
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Not Found')
  })
})

afterAll(async () => {
  await cleanupSprints([
    'sp-create-1', 'sp-create-2', 'sp-create-3',
    'sp-list-a', 'sp-list-b', 'sp-list-prog', 'sp-list-empty',
    'sp-patch-1', 'sp-patch-2', 'sp-del-1',
    'sp-board-1', 'sp-board-2',
  ])
})
