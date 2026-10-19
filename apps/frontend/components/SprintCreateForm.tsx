'use client'

import { useActionState } from 'react'
import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { insertSprintSchema } from '@my-app/shared'
import { createSprintAction } from '../app/actions'

export default function SprintCreateForm() {
  const [formState, formAction, isPending] = useActionState(
    async (prevState: unknown, formData: FormData) => {
      return await createSprintAction(formData)
    },
    undefined
  )

  const [form, fields] = useForm({
    lastResult: formState,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: insertSprintSchema })
    },
    shouldValidate: 'onBlur',
  })

  return (
    <form action={formAction} {...getFormProps(form)} style={styles.form}>
      <input {...getInputProps(fields.id, { type: 'hidden' })} value={crypto.randomUUID()} readOnly />
      <input
        {...getInputProps(fields.name, { type: 'text' })}
        placeholder="例: スプリント1"
        style={styles.input}
        disabled={isPending}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <label style={styles.dateLabel}>
          開始日
          <input {...getInputProps(fields.startDate, { type: 'date' })} style={styles.input} disabled={isPending} />
        </label>
        <label style={styles.dateLabel}>
          終了日
          <input {...getInputProps(fields.endDate, { type: 'date' })} style={styles.input} disabled={isPending} />
        </label>
      </div>
      {(fields.name.errors || fields.startDate.errors || fields.endDate.errors) && (
        <div style={{ color: '#dc2626', fontSize: '12px' }}>
          {fields.name.errors ?? fields.startDate.errors ?? fields.endDate.errors}
        </div>
      )}
      <button type="submit" style={styles.button} disabled={isPending}>
        {isPending ? '作成中...' : '作成'}
      </button>
    </form>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  dateLabel: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' },
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
