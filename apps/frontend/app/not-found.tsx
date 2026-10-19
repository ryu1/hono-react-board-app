import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ページが見つかりません</h1>
      <Link href="/" style={styles.link}>
        ← スプリント一覧へ戻る
      </Link>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    textAlign: 'center',
    paddingTop: '80px',
  },
  title: { fontSize: '24px', fontWeight: 700, color: '#0f172a' },
  link: { color: '#2563eb', fontSize: '14px' },
}
