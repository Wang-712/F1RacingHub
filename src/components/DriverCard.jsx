import { Link } from 'react-router-dom'
import Flag from './Flag'

/**
 * 车手卡片
 * 顶部为大号车号 + 车队配色渐变的视觉区域（替代头像），
 * 下方展示车手基本信息与赛季数据，点击跳转车手详情页。
 */
export default function DriverCard({ driver, rank }) {
  return (
    <Link
      to={`/drivers/${driver.id}`}
      className="card card-hover group relative flex flex-col overflow-hidden"
    >
      {/* 顶部车号视觉区：随车队主题色变化 */}
      <div
        className="relative flex h-28 items-center justify-between overflow-hidden px-5"
        style={{
          background: `linear-gradient(120deg, ${driver.teamColor}26 0%, rgba(10,10,15,0) 70%)`,
        }}
      >
        {/* 左侧车队色条 */}
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: driver.teamColor }}
        />
        <span className="text-5xl font-bold text-white/15 transition-colors duration-300 group-hover:text-white/25">
          {String(driver.number).padStart(2, '0')}
        </span>
        <Flag
          code={driver.flag}
          width={38}
          className="transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        <h3 className="font-display text-xl font-bold text-white">
          {driver.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-racing-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: driver.teamColor }}
          />
          {driver.team}
        </p>

        {/* 数据指标 */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4 text-center">
          <div>
            <p className="font-display text-xl font-bold text-white">
              {driver.points}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-racing-muted">
              积分
            </p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-white">
              {driver.seasonWins}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-racing-muted">
              胜场
            </p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-racing-red">
              {driver.championships}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-racing-muted">
              冠军
            </p>
          </div>
        </div>
      </div>

      {/* 排行榜角标（可选） */}
      {rank != null && (
        <span className="absolute right-4 top-3 rounded-md bg-black/40 px-2 py-0.5 font-display text-xs font-bold text-white/70">
          P{rank}
        </span>
      )}
    </Link>
  )
}
