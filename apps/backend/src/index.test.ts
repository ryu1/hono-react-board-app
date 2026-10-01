import { describe, it, expect, beforeAll } from 'vitest'
import app from './index'

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
      columnId: 'col-todo',
      title: '',
      position: 0,
    })
    expect(res.status).toBe(400)
  })

  it('creates a valid task', async () => {
    const res = await createTask({
      id: 'test-task-1',
      columnId: 'col-todo',
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
        columnId: 'col-progress',
        position: 0,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.columnId).toBe('col-progress')
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
