import { useMemo, useState } from 'react'
import DriverCard from '../components/DriverCard'
import DriverLightbox from '../components/DriverLightbox'
import { ErrorState, LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getDrivers, getTeams } from '../services/api'

/**
 * 车手列表页（数据来自后端 API）
 * - 支持按姓名 / 车队 / 国家关键词搜索
 * - 支持按车队下拉筛选与积分/胜场/冠军排序
 */
export default function Drivers() {
  const { data: drivers, meta, loading, error, reload } = useApi(getDrivers, [])
  const { data: teams } = useApi(getTeams, [])

  const [keyword, setKeyword] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [sortBy, setSortBy] = useState('points') // points | seasonWins | championships
  // 当前正在预览大图的车手（null = 关闭）
  const [preview, setPreview] = useState(null)

  const allDrivers = drivers || []
  const allTeams = teams || []

  // 积分榜原始名次（按积分排序前的 API 顺序）
  const standingsRank = useMemo(() => {
    const map = {}
    allDrivers.forEach((d, i) => {
      map[d.id] = i + 1
    })
    return map
  }, [allDrivers])

  // 过滤 + 排序
  const filteredDrivers = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const list = allDrivers.filter((d) => {
      const matchKeyword =
        !kw ||
        d.name.toLowerCase().includes(kw) ||
        d.team.toLowerCase().includes(kw) ||
        (d.country || '').toLowerCase().includes(kw)
      const matchTeam = teamFilter === 'all' || d.teamId === teamFilter
      return matchKeyword && matchTeam
    })
    return [...list].sort((a, b) => b[sortBy] - a[sortBy])
  }, [allDrivers, keyword, teamFilter, sortBy])

  if (loading) {
    return <LoadingState label="正在加载车手列表..." height={480} />
  }
  if (error) {
    return <ErrorState message={error} onRetry={reload} height={480} />
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="heading-display text-3xl text-white sm:text-4xl">
            {meta.season || '2026'} 赛季 F1 车手
          </h1>
          <p className="mt-1 text-sm text-racing-muted">
            完整车手阵容 —— {allTeams.length} 支车队、{allDrivers.length} 名车手
          </p>
        </div>
        {meta.source && meta.source !== 'jolpica' && (
          <span className="badge bg-yellow-500/15 text-yellow-400">
            当前展示离线快照数据
          </span>
        )}
      </div>

      {/* 搜索与筛选工具栏 */}
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="按车手、车队或国家搜索..."
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-racing-red focus:outline-none"
        />
        <div className="flex gap-3">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
          >
            <option value="all">全部车队</option>
            {allTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.shortName}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-racing-red focus:outline-none"
          >
            <option value="points">排序：积分</option>
            <option value="seasonWins">排序：胜场</option>
            <option value="championships">排序：冠军数</option>
          </select>
        </div>
      </div>

      {/* 车手卡片网格 */}
      {filteredDrivers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDrivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              rank={sortBy === 'points' ? standingsRank[driver.id] : undefined}
              onPreview={setPreview}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center text-racing-muted">
          没有符合条件的车手。
        </div>
      )}

      {/* 定妆照大图预览 */}
      <DriverLightbox photo={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
