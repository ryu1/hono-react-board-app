'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { updateTaskAction, deleteTaskAction, moveTaskAction } from '../app/actions'

interface Task {
  id: string
  columnId: string
  title: string
  description: string | null
  position: number
}

interface TaskCardProps {
  task: Task
  onDragStart: (e: React.DragEvent, taskId: string) => void
}

export default function TaskCard({ task, onDragStart }: TaskCardProps) {
  const [editing, setEditing] = useState(false)
  
  const [updateState, updateAction, isUpdating] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await updateTaskAction(formData)
    },
    undefined
  )
  
  const [deleteState, deleteAction, isDeleting] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await deleteTaskAction(formData)
    },
    undefined
  )

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id)
    onDragStart?.(e, task.id)
  }

  const handleMove = async (targetColumnId: string) => {
    const formData = new FormData()
    formData.set('id', task.id)
    formData.set('columnId', targetColumnId)
    formData.set('position', '999')
    await moveTaskAction(formData)
  }

  if (editing) {
    return (
      <form action={updateAction} style={styles.editForm}>
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
          <button type="submit" style={styles.saveBtn} disabled={isUpdating}>
            {isUpdating ? '保存中...' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            style={styles.cancelBtn}
          >
            閉じる
          </button>
        </div>
      </form>
    )
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={styles.card}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={styles.cardTitle}
          onClick={() => setEditing(true)}
        >
          {task.title}
        </div>
        <form action={deleteAction} style={{ display: 'inline' }}>
          <input type="hidden" name="id" value={task.id} />
          <button type="submit" style={styles.deleteBtn} disabled={isDeleting}>
            {isDeleting ? '削除中...' : '×'}
          </button>
        </form>
      </div>
      {task.description && <div style={styles.cardDesc}>{task.description}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
  editForm: { display: 'flex', flexDirection: 'column', gap: '6px' },
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
}