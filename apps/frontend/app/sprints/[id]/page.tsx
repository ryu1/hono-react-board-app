import { notFound } from 'next/navigation'
import { client } from '@/client'
import Board from '@/components/Board'

export const dynamic = 'force-dynamic'

export default async function SprintBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const res = await client.api.sprints[':id'].board.$get({ param: { id } })
  if (res.status === 404) {
    notFound()
  }
  if (!res.ok) {
    throw new Error('データ取得失敗')
  }
  const { sprint, columns, tasks } = await res.json()

  return (
    <Board
      initialColumns={columns}
      initialTasks={tasks}
      sprintName={sprint.name}
      sprintPeriod={`${sprint.startDate} 〜 ${sprint.endDate}`}
    />
  )
}
