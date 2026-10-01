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
