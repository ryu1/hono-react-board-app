import { client } from './client'
import Board from '@/components/Board'

export default async function BoardPage() {
  const res = await client.api.board.$get()
  if (!res.ok) {
    throw new Error('データ取得失敗')
  }
  const { columns, tasks } = await res.json()
  
  return <Board initialColumns={columns} initialTasks={tasks} />
}