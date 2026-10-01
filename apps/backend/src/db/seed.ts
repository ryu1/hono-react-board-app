import { db } from './index'
import { columns } from './schema'

export async function seed() {
  const existing = await db.select().from(columns).limit(1)
  if (existing.length > 0) return

  await db.insert(columns).values([
    { id: 'col-todo', title: 'Todo 📝', position: 0 },
    { id: 'col-progress', title: 'In Progress 🚀', position: 1 },
    { id: 'col-done', title: 'Done ✅', position: 2 },
  ])
}
