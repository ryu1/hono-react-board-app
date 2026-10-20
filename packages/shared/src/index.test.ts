import { describe, it, expect } from 'vitest'
import { insertTaskSchema, insertSprintSchema } from './index'

describe('shared schemas', () => {
  it('insertTaskSchema rejects empty title', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })

  it('insertTaskSchema accepts valid task', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: 'My task',
      position: 0,
    })
    expect(result.success).toBe(true)
  })

  it('insertSprintSchema rejects inverted dates', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(result.success).toBe(false)
  })
})
