import TeamCard from '../components/TeamCard'
import { ErrorState, LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getTeams } from '../services/api'

/**
 * 车队列表页（数据来自后端 API，按赛季排名顺序展示）
 */
export default function Teams() {
  const { data: teams, meta, loading, error, reload } = useApi(getTeams, [])

  if (loading) {
    return <LoadingState label="正在加载车队列表..." height={480} />
  }
  if (error) {
    return <ErrorState message={error} onRetry={reload} height={480} />
  }

  // API 已按积分排名返回，保险起见客户端再排一次
  const sortedTeams = [...(teams || [])].sort(
    (a, b) => a.seasonPosition - b.seasonPosition
  )

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="heading-display text-3xl text-white sm:text-4xl">
          {meta.season || '2026'} 赛季 F1 车队
        </h1>
        <p className="mt-1 text-sm text-racing-muted">
          {sortedTeams.length} 支车队角逐赛车运动的最高荣誉
        </p>
      </div>

      {/* 车队卡片网格 */}
      <div className="grid gap-4 md:grid-cols-2">
        {sortedTeams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  )
}
