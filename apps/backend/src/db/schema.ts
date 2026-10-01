import { z } from 'zod'
import { TaskModelSchema, ColumnModelSchema } from '../../generated/zod/schemas/variants/pure'

export const insertTaskSchema = TaskModelSchema.omit({ column: true }).extend({
  description: z.string().nullish(),
  position: z.coerce.number().int(),
})

export const insertColumnSchema = ColumnModelSchema.omit({ tasks: true })

export type CreateTaskInput = z.infer<typeof insertTaskSchema>
