import { db } from './index'

const initialColumns = [
  { id: 'col-todo', title: 'Todo 📝', position: 0 },
  { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
  { id: 'col-done', title: 'Done ✅', position: 2 },
]

export async function seed() {
  const existing = await db.column.findFirst()
  if (existing) return

  for (const column of initialColumns) {
    await db.column.upsert({ where: { id: column.id }, create: column, update: {} })
  }
}

seed().catch(console.error)
