import { Link } from 'react-router-dom'
import DriverPhoto from './DriverPhoto'

/**
 * 车手卡片
 * 顶部为车手专属定妆照（带车队配色渐变与车号水印），
 * 下方展示车手基本信息与赛季数据。
 * - 点击照片：打开定妆照大图预览（DriverPhoto 内部处理）
 * - 点击卡片其余区域：跳转车手详情页（绝对定位覆盖层链接）
 */
export default function DriverCard({ driver, rank, onPreview }) {
  return (
    <div className="card card-hover group relative flex flex-col overflow-hidden">
      {/* 整卡跳转覆盖层（照片按钮层级更高，不会被它拦截） */}
      <Link
        to={`/drivers/${driver.id}`}
        aria-label={`查看 ${driver.name} 的车手档案`}
        className="absolute inset-0 z-0"
      />

      {/* 排行榜角标 */}
      {rank != null && (
        <span className="absolute left-3 top-3 z-20 rounded-md bg-black/55 px-2 py-0.5 font-display text-xs font-bold text-white/80 backdrop-blur-sm">
          P{rank}
        </span>
      )}

      {/* 车手定妆照 */}
      <DriverPhoto
        driver={driver}
        variant="card"
        onPreview={onPreview}
        className="relative z-10 rounded-b-none border-x-0 border-t-0"
      />

      {/* 信息区 */}
      <div className="relative z-0 flex flex-1 flex-col px-5 pb-5 pt-4">
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
    </div>
  )
}
