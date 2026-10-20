import { db } from './index'

const initialColumns = [
  { suffix: 'todo', title: 'Todo 📝', position: 0 },
  { suffix: 'progress', title: 'In Progress 🚀', position: 1 },
  { suffix: 'done', title: 'Done ✅', position: 2 },
] as const

export function sprintColumnId(sprintId: string, suffix: string) {
  return `col-${sprintId}-${suffix}`
}

export async function ensureTestSprint(sprintId = 'test-sprint') {
  await db.sprint.upsert({
    where: { id: sprintId },
    create: {
      id: sprintId,
      name: 'テストスプリント',
      startDate: '2026-10-01',
      endDate: '2026-10-14',
    },
    update: {},
  })
  for (const col of initialColumns) {
    await db.column.upsert({
      where: { id: sprintColumnId(sprintId, col.suffix) },
      create: {
        id: sprintColumnId(sprintId, col.suffix),
        title: col.title,
        position: col.position,
        sprintId,
      },
      update: {},
    })
  }
  return {
    todoId: sprintColumnId(sprintId, 'todo'),
    progressId: sprintColumnId(sprintId, 'progress'),
    doneId: sprintColumnId(sprintId, 'done'),
  }
}
