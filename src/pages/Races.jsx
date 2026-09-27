import { useMemo, useState } from 'react'
import RaceCard from '../components/RaceCard'
import { ErrorState, LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getRaces } from '../services/api'

// 状态筛选选项
const FILTERS = [
  { key: 'all', label: '全部比赛' },
  { key: 'upcoming', label: '即将开赛' },
  { key: 'completed', label: '已完赛' },
]

/**
 * 比赛日历页（数据来自后端 API）
 * - All / Upcoming / Completed 三种筛选
 * - 按轮次顺序展示
 */
export default function Races() {
  const { data: races, meta, loading, error, reload } = useApi(getRaces, [])
  const [filter, setFilter] = useState('all')

  const allRaces = races || []

  const filteredRaces = useMemo(() => {
    const list =
      filter === 'all' ? allRaces : allRaces.filter((r) => r.status === filter)
    return [...list].sort((a, b) => a.round - b.round)
  }, [allRaces, filter])

  if (loading) {
    return <LoadingState label="正在加载赛历..." height={480} />
  }
  if (error) {
    return <ErrorState message={error} onRetry={reload} height={480} />
  }

  const completedCount = allRaces.filter((r) => r.status === 'completed').length
  const upcomingCount = allRaces.length - completedCount

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-display text-3xl text-white sm:text-4xl">
            {meta.season || '2026'} 赛季赛历
          </h1>
          <p className="mt-1 text-sm text-racing-muted">
            共 {allRaces.length} 轮 · 已完赛 {completedCount} 场 · 剩余 {upcomingCount} 场
          </p>
        </div>

        {/* 状态切换 */}
        <div className="flex rounded-xl border border-white/10 bg-racing-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filter === f.key
                  ? 'bg-racing-red text-white'
                  : 'text-racing-muted hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* 比赛卡片网格 */}
      {filteredRaces.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRaces.map((race) => (
            <RaceCard key={race.id} race={race} />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center text-racing-muted">
          该分类下暂无比赛。
        </div>
      )}
    </div>
  )
}
