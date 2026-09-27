import Flag from './Flag'

/**
 * 车队卡片
 * 展示车队名称、成立年份、车队冠军数、当前车手阵容与赛季积分，
 * 卡片顶部使用车队主题色作为品牌识别。
 */
export default function TeamCard({ team }) {
  return (
    <div className="card card-hover group relative overflow-hidden">
      {/* 车队主题色顶部条 */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${team.color}, ${team.color}33)`,
        }}
      />

      <div className="p-6">
        {/* 头部：名称 + 赛季排名 */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: team.color }}
              />
              <Flag code={team.flag} width={24} />
            </div>
            <h3 className="mt-2 font-display text-xl font-bold leading-tight text-white">
              {team.name}
            </h3>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-racing-muted">
              成立于 {team.founded} · {team.headquarters}
            </p>
          </div>
          <span className="shrink-0 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-center">
            <span className="block font-display text-lg font-bold text-white">
              {team.seasonPosition}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-racing-muted">
              排名
            </span>
          </span>
        </div>

        {/* 简介 */}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-racing-muted">
          {team.bio}
        </p>

        {/* 当前车手 */}
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-racing-muted">
            车手阵容
          </p>
          <div className="flex flex-wrap gap-2">
            {team.drivers.map((name) => (
              <span
                key={name}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* 底部数据 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <p className="font-display text-2xl font-bold" style={{ color: team.color }}>
              {team.championships}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-racing-muted">
              车队冠军
            </p>
          </div>
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <p className="font-display text-2xl font-bold text-white">
              {team.seasonPoints}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-racing-muted">
              2026 积分
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
