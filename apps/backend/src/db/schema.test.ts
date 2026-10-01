import { describe, it, expect } from 'vitest'
import { insertTaskSchema, insertColumnSchema } from './schema'

describe('insertTaskSchema', () => {
  it('rejects empty title', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid task with optional description', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: 'Valid',
      position: 0,
    })
    expect(result.success).toBe(true)
  })

  it('accepts string position from FormData (coerces to number)', () => {
    const result = insertTaskSchema.safeParse({
      id: 't1',
      columnId: 'c1',
      title: 'From form',
      position: '2',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.position).toBe(2)
  })
})

describe('insertColumnSchema', () => {
  it('rejects empty title', () => {
    const result = insertColumnSchema.safeParse({
      id: 'c1',
      title: '',
      position: 0,
    })
    expect(result.success).toBe(false)
  })
})
