import { client } from './client'
import SprintList from '@/components/SprintList'

export default async function SprintListPage() {
  const res = await client.api.sprints.$get()
  if (!res.ok) {
    throw new Error('データ取得失敗')
  }
  const sprints = await res.json()

  return <SprintList initialSprints={sprints} />
}
