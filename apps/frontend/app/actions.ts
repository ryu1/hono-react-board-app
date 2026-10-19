'use server'

import { revalidatePath } from 'next/cache'
import { client } from './client'
import { insertTaskSchema, insertSprintSchema, updateSprintSchema } from '@my-app/shared'
import { parseWithZod } from '@conform-to/zod'

export async function createTaskAction(formData: FormData) {
  const submission = parseWithZod(formData, { schema: insertTaskSchema })
  if (submission.status !== 'success') {
    return submission.reply()
  }
  await client.api.tasks.$post({ json: submission.value })
  return submission.reply({ resetForm: true })
}

export async function deleteTaskAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'Missing id' }
  await client.api.tasks[':id'].$delete({ param: { id } })
  return { success: true }
}

export async function updateTaskAction(formData: FormData) {
  const id = formData.get('id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  
  if (!id || !title) return { success: false, error: 'Missing required fields' }
  
  await client.api.tasks.update.$put({ json: { id, title, description } })
  return { success: true }
}

export async function moveTaskAction(formData: FormData) {
  const id = formData.get('id') as string
  const columnId = formData.get('columnId') as string
  const position = parseInt(formData.get('position') as string, 10)
  
  if (!id || !columnId || isNaN(position)) {
    return { success: false, error: 'Missing required fields' }
  }
  
  await client.api.tasks.move.$patch({ json: { id, columnId, position } })
  return { success: true }
}

export async function createSprintAction(formData: FormData) {
  const submission = parseWithZod(formData, { schema: insertSprintSchema })
  if (submission.status !== 'success') {
    return submission.reply()
  }
  await client.api.sprints.$post({ json: submission.value })
  revalidatePath('/')
  return submission.reply({ resetForm: true })
}

export async function updateSprintAction(formData: FormData) {
  const id = formData.get('id') as string
  const submission = parseWithZod(formData, { schema: updateSprintSchema })
  if (submission.status !== 'success') {
    return submission.reply()
  }
  if (!id) {
    return submission.reply({ formErrors: ['ID がありません'] })
  }
  await client.api.sprints[':id'].$patch({ param: { id }, json: submission.value })
  revalidatePath('/')
  revalidatePath(`/sprints/${id}`)
  return submission.reply({ resetForm: true })
}

export async function deleteSprintAction(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'Missing id' }
  await client.api.sprints[':id'].$delete({ param: { id } })
  revalidatePath('/')
  return { success: true }
}
