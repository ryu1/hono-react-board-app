import { describe, it, expect } from 'vitest'
import { insertTaskSchema, insertColumnSchema, insertSprintSchema, updateSprintSchema } from './schema'

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
      sprintId: 's1',
    })
    expect(result.success).toBe(false)
  })
})

describe('insertSprintSchema', () => {
  it('rejects empty name', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: '', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed date', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026/10/01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(false)
  })

  it('rejects startDate after endDate', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid sprint', () => {
    const result = insertSprintSchema.safeParse({
      id: 's1', name: 'Sprint 1', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(true)
  })
})

describe('updateSprintSchema', () => {
  it('accepts payload without id', () => {
    const result = updateSprintSchema.safeParse({
      name: 'Sprint 1', startDate: '2026-10-01', endDate: '2026-10-14',
    })
    expect(result.success).toBe(true)
  })

  it('rejects startDate after endDate', () => {
    const result = updateSprintSchema.safeParse({
      name: 'Sprint 1', startDate: '2026-10-14', endDate: '2026-10-01',
    })
    expect(result.success).toBe(false)
  })
})
