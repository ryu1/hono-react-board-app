import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

export const columns = sqliteTable('columns', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  position: integer('position').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  columnId: text('column_id')
    .notNull()
    .references(() => columns.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  position: integer('position').notNull(),
})

export const insertTaskSchema = createInsertSchema(tasks, {
  title: (schema) => schema.title.min(1, 'タイトルは必須です'),
})
export const insertColumnSchema = createInsertSchema(columns, {
  title: (schema) => schema.title.min(1, 'タイトルは必須です'),
})

export type CreateTaskInput = z.infer<typeof insertTaskSchema>
