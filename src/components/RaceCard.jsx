import Flag from './Flag'

/**
 * 比赛卡片
 * 用于比赛日历，支持 completed / upcoming 两种状态：
 * - completed：展示冠军车手与车队
 * - upcoming：高亮显示比赛日期
 */
export default function RaceCard({ race }) {
  const isCompleted = race.status === 'completed'
  // 将日期格式化为易读形式
  const dateLabel = new Date(`${race.date}T00:00:00`).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={`card card-hover relative overflow-hidden p-5 ${
        isCompleted ? '' : 'border-racing-red/30'
      }`}
    >
      {/* 左侧装饰：轮次 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] font-display text-base font-bold text-white">
            {String(race.round).padStart(2, '0')}
          </span>
          <div>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-tight text-white">
              <Flag code={race.flag} width={22} />
              {race.shortName}
            </h3>
            <p className="text-xs text-racing-muted">{race.country}</p>
          </div>
        </div>

        {/* 状态徽章 */}
        {isCompleted ? (
          <span className="badge bg-white/[0.06] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            已完赛
          </span>
        ) : (
          <span className="badge bg-racing-red/15 text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-racing-red" />
            即将开赛
          </span>
        )}
      </div>

      {/* 赛道信息 */}
      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-center gap-2 text-zinc-300">
          <span className="text-racing-muted">赛道：</span>
          {race.circuit}
        </p>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-zinc-300">
            <span className="text-racing-muted">圈数：</span>
            {race.laps}
          </p>
          <p
            className={`font-display text-base font-bold ${
              isCompleted ? 'text-racing-muted' : 'text-racing-red'
            }`}
          >
            {dateLabel}
          </p>
        </div>
      </div>

      {/* 已完赛：显示冠军 */}
      {isCompleted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-500/15 bg-yellow-500/[0.07] px-3 py-2">
          <span className="text-base">🏆</span>
          <p className="truncate text-xs text-yellow-200/90">
            <span className="font-semibold">{race.winner}</span>
            <span className="text-yellow-200/50"> · {race.winningTeam}</span>
          </p>
        </div>
      )}
    </div>
  )
}
