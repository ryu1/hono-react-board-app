'use client'

import { useActionState } from 'react'
import { moveTaskAction } from '@/app/actions'
import TaskCard from './TaskCard'
import CreateForm from './CreateForm'

interface ColumnProps {
  column: { id: string; title: string; position: number }
  tasks: Task[]
  onTaskMove: (taskId: string, targetColumnId: string) => Promise<void>
}

interface Task {
  id: string
  columnId: string
  title: string
  description: string | null
  position: number
}

export default function Column({ column, tasks, onTaskMove }: ColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    await onTaskMove(taskId, column.id)
  }

  return (
    <div
      style={styles.column}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div style={styles.columnHeader}>
        <h3 style={styles.columnTitle}>{column.title}</h3>
        <span style={styles.badge}>{tasks.length}</span>
      </div>

      <div style={styles.taskList}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={() => {}}
          />
        ))}
      </div>

      <CreateForm column={column} taskCount={tasks.length} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
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
}