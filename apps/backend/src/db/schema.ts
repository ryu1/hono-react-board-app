import { z } from 'zod'
import {
  TaskModelSchema,
  ColumnModelSchema,
  SprintModelSchema,
} from '../../generated/zod/schemas/variants/pure'

export const insertTaskSchema = TaskModelSchema.omit({ column: true }).extend({
  description: z.string().nullish(),
  position: z.coerce.number().int(),
})

export const insertColumnSchema = ColumnModelSchema.omit({ tasks: true, sprint: true })

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 形式で入力してください')
  .refine((date) => {
    const d = new Date(date)
    return d instanceof Date && !isNaN(d.getTime()) && d.toISOString().startsWith(date)
  }, '無効な日付です')

const sprintFields = SprintModelSchema.omit({ columns: true }).extend({
  startDate: isoDate,
  endDate: isoDate,
})

const dateRangeRule = (data: { startDate: string; endDate: string }) =>
  data.startDate <= data.endDate

export const insertSprintSchema = sprintFields.refine(dateRangeRule, {
  message: '開始日は終了日以前にしてください',
  path: ['endDate'],
})

export const updateSprintSchema = sprintFields.omit({ id: true }).refine(dateRangeRule, {
  message: '開始日は終了日以前にしてください',
  path: ['endDate'],
})

export type CreateTaskInput = z.infer<typeof insertTaskSchema>
export type CreateSprintInput = z.infer<typeof insertSprintSchema>
