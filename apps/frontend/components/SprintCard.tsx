'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { updateSprintAction, deleteSprintAction } from '../app/actions'

interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  taskCount: number
  doneCount: number
  progress: number
}

interface SprintCardProps {
  sprint: Sprint
}

export default function SprintCard({ sprint }: SprintCardProps) {
  const [editing, setEditing] = useState(false)

  const [_updateState, updateAction, isUpdating] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await updateSprintAction(formData)
    },
    undefined
  )

  const [_deleteState, deleteAction, isDeleting] = useActionState(
    async (_: unknown, formData: FormData) => {
      return await deleteSprintAction(formData)
    },
    undefined
  )

  const prevIsUpdatingRef = useRef(isUpdating)
  useEffect(() => {
    if (prevIsUpdatingRef.current && !isUpdating && editing) {
      setEditing(false)
    }
    prevIsUpdatingRef.current = isUpdating
  }, [isUpdating, editing])

  if (editing) {
    return (
      <form action={updateAction} style={styles.card}>
        <input type="hidden" name="id" value={sprint.id} />
        <input
          type="text"
          name="name"
          defaultValue={sprint.name}
          style={styles.editInput}
          aria-label="名前"
          required
          data-testid="sprint-name-input"
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <label style={styles.dateLabel}>
            開始日
            <input
              type="date"
              name="startDate"
              defaultValue={sprint.startDate}
              style={styles.editInput}
              required
            />
          </label>
          <label style={styles.dateLabel}>
            終了日
            <input
              type="date"
              name="endDate"
              defaultValue={sprint.endDate}
              style={styles.editInput}
              required
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button type="submit" style={styles.saveBtn} disabled={isUpdating}>
            {isUpdating ? '保存中...' : '保存'}
          </button>
          <button type="button" onClick={() => setEditing(false)} style={styles.cancelBtn}>
            閉じる
          </button>
        </div>
      </form>
    )
  }

  return (
    <div style={styles.card} data-testid={`sprint-card-${sprint.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link href={`/sprints/${sprint.id}`} style={styles.nameLink}>
            {sprint.name}
          </Link>
          <div style={styles.period}>
            {sprint.startDate} 〜 {sprint.endDate}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" onClick={() => setEditing(true)} style={styles.editBtn} aria-label="編集">
            ✎
          </button>
          <form
            action={deleteAction}
            style={{ display: 'inline' }}
            onSubmit={(e) => {
              if (!window.confirm('このスプリントを削除しますか？配下のタスクもすべて削除されます。')) {
                e.preventDefault()
              }
            }}
          >
            <input type="hidden" name="id" value={sprint.id} />
            <button type="submit" style={styles.deleteBtn} disabled={isDeleting} aria-label="削除">
              {isDeleting ? '削除中...' : '🗑'}
            </button>
          </form>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={sprint.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${sprint.name} の進捗`}
        style={styles.progressTrack}
      >
        <div style={{ ...styles.progressFill, width: `${sprint.progress}%` }} />
      </div>
      <div style={styles.progressText}>
        {sprint.progress}% ({sprint.doneCount}/{sprint.taskCount})
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  nameLink: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
    textDecoration: 'none',
  },
  period: { fontSize: '12px', color: '#64748b', marginTop: '4px' },
  editBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '0 4px',
  },
  progressTrack: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '9999px',
    marginTop: '12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '9999px',
  },
  progressText: { fontSize: '12px', color: '#475569', marginTop: '6px' },
  editForm: { display: 'flex', flexDirection: 'column', gap: '6px' },
  editInput: {
    padding: '6px',
    borderRadius: '4px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
  },
  dateLabel: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: '#475569' },
  saveBtn: {
    padding: '6px 12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    backgroundColor: '#94a3b8',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
