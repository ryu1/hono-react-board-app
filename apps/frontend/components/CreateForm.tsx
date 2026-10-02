'use client'

import { useActionState } from 'react'
import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { insertTaskSchema } from '@my-app/shared'
import { createTaskAction } from '../app/actions'

interface CreateFormProps {
  column: { id: string; title: string; position: number }
  taskCount: number
}

export default function CreateForm({ column, taskCount }: CreateFormProps) {
  const [formState, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      return await createTaskAction(formData)
    },
    undefined
  )
  
  const [form, fields] = useForm({
    lastResult: formState,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: insertTaskSchema })
    },
    shouldValidate: 'onBlur',
  })

  return (
    <form action={formAction} {...getFormProps(form)} style={styles.form}>
      <input {...getInputProps(fields.id, { type: 'hidden' })} value={crypto.randomUUID()} readOnly />
      <input {...getInputProps(fields.columnId, { type: 'hidden' })} value={column.id} readOnly />
      <input {...getInputProps(fields.position, { type: 'hidden' })} value={taskCount} readOnly />
      <input
        {...getInputProps(fields.title, { type: 'text' })}
        placeholder="+ 新しいタスク..."
        style={styles.input}
        disabled={isPending}
      />
      {fields.title.errors && (
        <div style={{ color: '#dc2626', fontSize: '12px' }}>{fields.title.errors}</div>
      )}
      <button type="submit" style={styles.button} disabled={isPending}>
        {isPending ? '追加中...' : '追加'}
      </button>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: { marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  button: {
    padding: '8px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}