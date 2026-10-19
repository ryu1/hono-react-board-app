import SprintCreateForm from './SprintCreateForm'
import SprintCard from './SprintCard'

export interface SprintListItem {
  id: string
  name: string
  startDate: string
  endDate: string
  taskCount: number
  doneCount: number
  progress: number
}

interface SprintListProps {
  initialSprints: SprintListItem[]
}

export default function SprintList({ initialSprints }: SprintListProps) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>スプリント一覧</h1>
        <p style={styles.subtitle}>スプリント毎にカンバンを管理します</p>
      </header>

      <SprintCreateForm />

      {initialSprints.length === 0 ? (
        <div style={styles.empty}>スプリントがありません。最初のスプリントを作成しましょう。</div>
      ) : (
        <div style={styles.list}>
          {initialSprints.map((sprint) => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    maxWidth: '720px',
    margin: '0 auto',
  },
  header: { marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', marginTop: '6px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  empty: {
    backgroundColor: '#ffffff',
    padding: '32px',
    borderRadius: '8px',
    border: '1px dashed #cbd5e1',
    color: '#64748b',
    textAlign: 'center',
  },
}
