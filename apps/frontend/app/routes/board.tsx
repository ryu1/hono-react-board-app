import { useState } from 'react'
import { useLoaderData, useFetcher, useFetchers } from 'react-router'
import { parseWithZod } from '@conform-to/zod'
import { useForm, getFormProps, getInputProps } from '@conform-to/react'
import { insertTaskSchema } from '@my-app/shared'
import { client } from '../client'

export async function clientLoader() {
  const res = await client.api.board.$get()
  if (!res.ok) throw new Error('データ取得失敗')
  return await res.json()
}

export async function clientAction({ request }: { request: Request }) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'delete') {
    const id = String(formData.get('id'))
    await client.api.tasks[':id'].$delete({ param: { id } })
    return { success: true }
  }

  if (intent === 'update') {
    const id = String(formData.get('id'))
    const title = String(formData.get('title'))
    const description = String(formData.get('description'))
    await client.api.tasks.update.$put({ json: { id, title, description } })
    return { success: true }
  }

  const submission = parseWithZod(formData, { schema: insertTaskSchema })
  if (submission.status !== 'success') return submission.reply()
  await client.api.tasks.$post({ json: submission.value })
  return submission.reply({ resetForm: true })
}

export default function Board() {
  const { columns, tasks: serverTasks } = useLoaderData<typeof clientLoader>()
  const fetcher = useFetcher<typeof clientAction>()
  const moveFetcher = useFetcher()
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  const fetchers = useFetchers()
  let tasks = [...serverTasks]

  for (const f of fetchers) {
    if (!f.formData) continue
    const intent = f.formData.get('intent')
    if (intent === 'delete') {
      const id = String(f.formData.get('id'))
      tasks = tasks.filter((t) => t.id !== id)
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId)
  }

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    await client.api.tasks.move.$patch({
      json: { id: taskId, columnId: targetColumnId, position: 999 },
    })
    moveFetcher.load('/')
  }

  const [form, fields] = useForm({
    lastResult: fetcher.data as any,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: insertTaskSchema })
    },
    shouldValidate: 'onBlur',
  })

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 超高速フルスタック・タスクボード</h1>
        <p style={styles.subtitle}>End-to-End 型安全なフルスタック・カンバンアプリ</p>
      </header>

      <div style={styles.board}>
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.columnId === column.id)

          return (
            <div
              key={column.id}
              style={styles.column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div style={styles.columnHeader}>
                <h3 style={styles.columnTitle}>{column.title}</h3>
                <span style={styles.badge}>{columnTasks.length}</span>
              </div>

              <div style={styles.taskList}>
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    style={styles.card}
                  >
                    {editingTaskId === task.id ? (
                      <moveFetcher.Form method="post" onSubmit={() => setEditingTaskId(null)}>
                        <input type="hidden" name="intent" value="update" />
                        <input type="hidden" name="id" value={task.id} />
                        <input
                          type="text"
                          name="title"
                          defaultValue={task.title}
                          style={styles.editInput}
                          required
                        />
                        <textarea
                          name="description"
                          defaultValue={task.description || ''}
                          style={styles.editTextarea}
                          placeholder="説明..."
                        />
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          <button type="submit" style={styles.saveBtn}>保存</button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            style={styles.cancelBtn}
                          >閉じる</button>
                        </div>
                      </moveFetcher.Form>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div
                            style={styles.cardTitle}
                            onClick={() => setEditingTaskId(task.id)}
                          >
                            {task.title}
                          </div>
                          <moveFetcher.Form method="post" style={{ display: 'inline' }}>
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={task.id} />
                            <button type="submit" style={styles.deleteBtn}>×</button>
                          </moveFetcher.Form>
                        </div>
                        {task.description && <div style={styles.cardDesc}>{task.description}</div>}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <fetcher.Form method="post" {...getFormProps(form)} style={styles.form}>
                <input {...getInputProps(fields.id, { type: 'hidden' })} value={crypto.randomUUID()} readOnly />
                <input {...getInputProps(fields.columnId, { type: 'hidden' })} value={column.id} readOnly />
                <input {...getInputProps(fields.position, { type: 'hidden' })} value={columnTasks.length} readOnly />
                <input
                  {...getInputProps(fields.title, { type: 'text' })}
                  placeholder="+ 新しいタスク..."
                  style={styles.input}
                />
                <button type="submit" style={styles.button}>追加</button>
              </fetcher.Form>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: { marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
  board: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
  column: {
    width: '300px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '85vh',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  columnTitle: { fontSize: '16px', fontWeight: 700, color: '#334155', margin: 0 },
  badge: {
    backgroundColor: '#cbd5e1',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '9999px',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
    flex: 1,
    minHeight: '50px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '14px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    cursor: 'grab',
  },
  cardTitle: { fontSize: '14px', fontWeight: 600, color: '#1e293b', flex: 1, cursor: 'pointer' },
  cardDesc: { fontSize: '12px', color: '#64748b', marginTop: '6px', whiteSpace: 'pre-wrap' },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  editInput: {
    width: '100%',
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    marginBottom: '6px',
    boxSizing: 'border-box',
  },
  editTextarea: {
    width: '100%',
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '12px',
    height: '60px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  saveBtn: {
    padding: '4px 10px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '4px 10px',
    backgroundColor: '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
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
