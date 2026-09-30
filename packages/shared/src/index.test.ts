import { describe, it, expect } from 'vitest'
import { insertTaskSchema } from './index'

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
})
