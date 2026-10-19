'use client'

import { useState } from 'react'
import Link from 'next/link'
import { moveTaskAction } from '../app/actions'
import Column from './Column'
import type { Task } from './Column'

interface BoardProps {
  initialColumns: { id: string; title: string; position: number }[]
  initialTasks: Task[]
  sprintName?: string
  sprintPeriod?: string
}

export default function Board({ initialColumns, initialTasks, sprintName, sprintPeriod }: BoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isMoving, setIsMoving] = useState(false)

  const handleTaskMove = async (taskId: string, targetColumnId: string) => {
    setIsMoving(true)
    const formData = new FormData()
    formData.set('id', taskId)
    formData.set('columnId', targetColumnId)
    formData.set('position', '999')
    await moveTaskAction(formData)
    setIsMoving(false)
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        {sprintName && (
          <Link href="/" style={styles.backLink}>
            ← 一覧へ戻る
          </Link>
        )}
        <h1 style={styles.title}>
          {sprintName ?? '🚀 超高速フルスタック・タスクボード'}
        </h1>
        <p style={styles.subtitle}>
          {sprintPeriod ?? 'End-to-End 型安全なフルスタック・カンバンアプリ'}
        </p>
      </header>

      <div style={styles.board}>
        {initialColumns.map((column) => {
          const columnTasks = tasks.filter((t) => t.columnId === column.id)
          return (
            <Column
              key={column.id}
              column={column}
              tasks={columnTasks}
              onTaskMove={handleTaskMove}
            />
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
  backLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: '#2563eb',
    textDecoration: 'none',
    marginBottom: '8px',
  },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
  board: { display: 'flex', gap: '24px', alignItems: 'flex-start' },
}