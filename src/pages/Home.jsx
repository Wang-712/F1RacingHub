import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Chart from '../components/Chart'
import Flag from '../components/Flag'
import { DataSourceBadge, ErrorState, LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getDrivers, getNews, getSeason, getTeams } from '../services/api'
import {
  palette,
  baseTooltip,
  baseLegend,
  categoryAxis,
  baseAxis,
} from '../utils/chartTheme'

/** 倒计时 Hook：每秒计算到目标日期的剩余时间 */
function useCountdown(targetDate) {
  const calc = () => {
    const diff = new Date(`${targetDate}T00:00:00`).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }
  const [time, setTime] = useState(calc)

  useEffect(() => {
    const timer = setInterval(() => setTime(calc()), 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate])

  return time
}

/** 首页 Dashboard（全部数据来自 FastAPI 后端） */
export default function Home() {
  // 三个独立数据源
  const seasonReq = useApi(getSeason, [])
  const driversReq = useApi(getDrivers, [])
  const teamsReq = useApi(getTeams, [])
  const newsReq = useApi(getNews, [])

  const season = seasonReq.data
  const drivers = driversReq.data || []
  const teams = teamsReq.data || []
  const news = newsReq.data || []

  const topDrivers = useMemo(() => drivers.slice(0, 8), [drivers])
  const nextRace = season?.nextRace
  const countdown = useCountdown(nextRace?.date || '2026-12-31')

  // 数据来源（用于 LIVE / SAMPLE 标识）
  const source = seasonReq.meta.source || driversReq.meta.source

  const nextRaceDate = nextRace
    ? new Date(`${nextRace.date}T00:00:00`).toLocaleDateString('zh-CN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  // 积分走势图模式：'contenders' 仅冠军争夺者（前5），'all' 全部车手
  const [pointsMode, setPointsMode] = useState('contenders')

  /** 构造单个车手的 series 配置 */
  const buildDriverSeries = (d, opts = {}) => {
    const {
      color,
      lineType = 'solid',
      lineWidth = 2.5,
      showArea = false,
      showSymbol = true,
      symbolSize = 6,
      opacity = 1,
    } = opts
    const series = {
      name: d.name,
      type: 'line',
      smooth: true,
      symbol: showSymbol ? 'circle' : 'none',
      symbolSize,
      itemStyle: { color, opacity },
      lineStyle: { width: lineWidth, color, type: lineType, opacity },
      emphasis: { focus: 'series' },
      data: d.progression || [],
    }
    if (showArea) {
      series.areaStyle = {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '33' },
            { offset: 1, color: color + '00' },
          ],
        },
      }
    }
    return series
  }

  /** 积分变化折线图（根据模式切换） */
  const pointsChartOption = useMemo(() => {
    if (drivers.length === 0) return null
    const rounds = drivers[0].progression?.length || 0
    const xData = Array.from({ length: rounds }, (_, i) => `R${i + 1}`)

    if (pointsMode === 'all') {
      // 所有车手视图：每位车用车队代表色，同车队第二位用虚线区分
      const top5 = drivers.slice(0, 5)
      const teamSeen = {}
      const series = drivers.map((d) => {
        const color = d.teamColor || '#6b7280'
        const teamKey = d.teamId || d.team
        const isFirst = !teamSeen[teamKey]
        teamSeen[teamKey] = true
        // 前 5 名高亮（线宽 2.5、显示数据点），其余淡化（线宽 1.5、无数据点、半透明）
        const isTop = d.seasonPosition <= 5
        return buildDriverSeries(d, {
          color,
          lineType: isFirst ? 'solid' : 'dashed',
          lineWidth: isTop ? 2.5 : 1.5,
          showArea: false,
          showSymbol: isTop,
          symbolSize: 5,
          opacity: isTop ? 1 : 0.7,
        })
      })
      return {
        tooltip: { ...baseTooltip, trigger: 'axis' },
        legend: { ...baseLegend, data: top5.map((d) => d.name), top: 0 },
        grid: { top: 44, right: 16, bottom: 32, left: 40 },
        xAxis: { type: 'category', ...categoryAxis, boundaryGap: false, data: xData },
        yAxis: { type: 'value', ...baseAxis },
        series,
      }
    }

    // 冠军争夺者视图：前5名，车队色、同车队虚实线、面积填充
    const top5 = drivers.slice(0, 5)
    const teamSeen = {}
    return {
      tooltip: { ...baseTooltip, trigger: 'axis' },
      legend: { ...baseLegend, data: top5.map((d) => d.name), top: 0 },
      grid: { top: 44, right: 16, bottom: 32, left: 40 },
      xAxis: { type: 'category', ...categoryAxis, boundaryGap: false, data: xData },
      yAxis: { type: 'value', ...baseAxis },
      series: top5.map((d) => {
        const color = d.teamColor || '#ffffff'
        const teamKey = d.teamId || d.team
        const isFirst = !teamSeen[teamKey]
        teamSeen[teamKey] = true
        return buildDriverSeries(d, {
          color,
          lineType: isFirst ? 'solid' : 'dashed',
          lineWidth: 2.5,
          showArea: true,
          showSymbol: true,
          symbolSize: 6,
        })
      }),
    }
  }, [drivers, pointsMode])

  /** 车队积分走势折线图（全部车队，车队代表色） */
  const teamChartOption = useMemo(() => {
    if (teams.length === 0) return null
    const rounds = teams[0].progression?.length || 0
    if (rounds === 0) return null
    const xData = Array.from({ length: rounds }, (_, i) => `R${i + 1}`)
    return {
      tooltip: { ...baseTooltip, trigger: 'axis' },
      legend: { ...baseLegend, data: teams.map((t) => t.shortName), top: 0 },
      grid: { top: 44, right: 16, bottom: 32, left: 40 },
      xAxis: { type: 'category', ...categoryAxis, boundaryGap: false, data: xData },
      yAxis: { type: 'value', ...baseAxis },
      series: teams.map((t) => ({
        name: t.shortName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        itemStyle: { color: t.color },
        lineStyle: { width: 2.5, color: t.color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: t.color + '22' },
              { offset: 1, color: t.color + '00' },
            ],
          },
        },
        emphasis: { focus: 'series' },
        data: t.progression || [],
      })),
    }
  }, [teams])

  // 首屏关键数据未就绪：整页加载态
  if (seasonReq.loading || driversReq.loading) {
    return <LoadingState label="正在加载 F1 实时数据..." height={520} />
  }

  // 赛季与车手同时失败：错误兜底
  if (seasonReq.error && driversReq.error) {
    return (
      <ErrorState
        message={seasonReq.error}
        onRetry={() => {
          seasonReq.reload()
          driversReq.reload()
        }}
        height={480}
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* ============ Hero 赛季横幅 ============ */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        {/* 背景装饰：红色速度光带 */}
        <div className="absolute inset-0 bg-gradient-to-br from-racing-red/25 via-racing-dark to-racing-dark" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-racing-red/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)',
          }}
        />

        <div className="relative px-6 py-12 sm:px-10 sm:py-16">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-racing-red">
              赛季概览
            </p>
            <DataSourceBadge source={source} />
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-none text-white sm:text-6xl">
            {season?.season || '2026'} <span className="text-racing-red">一级方程式</span> 赛季
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            实时积分榜、赛历与深度数据分析，来自赛车运动的巅峰对决 —— 由真实 F1 数据接口驱动。
          </p>

          {/* 赛季关键数据卡片 */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* 已完成比赛 */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              <p className="font-display text-3xl font-bold text-white sm:text-4xl">
                {season?.completedRaces ?? 0}
                <span className="text-base text-racing-muted">
                  /{season?.totalRaces ?? 0}
                </span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-racing-muted">
                已完成比赛
              </p>
            </div>

            {/* 下一场比赛 */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              {nextRace ? (
                <>
                  <p className="flex items-center gap-2 truncate font-display text-lg font-bold text-white sm:text-xl">
                    <Flag code={nextRace.flag} width={24} />
                    {nextRace.shortName}
                  </p>
                  <p className="mt-1 truncate text-xs text-racing-muted">
                    {nextRace.circuit}
                  </p>
                </>
              ) : (
                <p className="font-display text-lg font-bold text-white">
                  赛季已结束
                </p>
              )}
            </div>

            {/* 比赛倒计时 */}
            <div className="rounded-2xl border border-racing-red/30 bg-racing-red/10 p-4 backdrop-blur-sm">
              <div className="flex items-baseline gap-1 font-display text-white">
                <span className="text-3xl font-bold sm:text-4xl">
                  {countdown.days}
                </span>
                <span className="text-xs text-racing-muted">天</span>
                <span className="ml-1 text-xl font-bold">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-xs text-racing-muted">时</span>
              </div>
              <p className="mt-1 text-xs uppercase tracking-wider text-racing-muted">
                开赛倒计时
              </p>
            </div>

            {/* 积分领先者 */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              {season?.leader ? (
                <>
                  <p className="flex items-center gap-2 truncate font-display text-lg font-bold text-white sm:text-xl">
                    <Flag code={season.leader.flag} width={24} />
                    {season.leader.name}
                  </p>
                  <p className="mt-1 text-xs text-racing-muted">
                    积分榜领跑者 · {season.leader.points} 分
                  </p>
                </>
              ) : (
                <p className="text-sm text-racing-muted">暂无领跑者数据</p>
              )}
            </div>
          </div>

          {nextRace && (
            <p className="mt-4 text-xs text-racing-muted">
              下一场：{nextRaceDate}
            </p>
          )}
        </div>
      </section>

      {/* ============ Top Drivers 排行榜 ============ */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="heading-display text-2xl text-white">
              车手积分榜
            </h2>
            <p className="text-sm text-racing-muted">
              {season?.season} 赛季截至目前表现最佳的车手
            </p>
          </div>
          <Link
            to="/drivers"
            className="text-sm font-semibold text-racing-red transition hover:text-red-400"
          >
            查看全部车手 →
          </Link>
        </div>

        {driversReq.error ? (
          <ErrorState message={driversReq.error} onRetry={driversReq.reload} />
        ) : (
          <div className="card overflow-hidden">
            {/* 桌面端表格 */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs uppercase tracking-wider text-racing-muted">
                  <th className="px-6 py-4 font-semibold">名次</th>
                  <th className="px-6 py-4 font-semibold">车手</th>
                  <th className="px-6 py-4 font-semibold">车队</th>
                  <th className="px-6 py-4 text-center font-semibold">胜场</th>
                  <th className="px-6 py-4 text-center font-semibold">冠军</th>
                  <th className="px-6 py-4 text-right font-semibold">积分</th>
                </tr>
              </thead>
              <tbody>
                {topDrivers.map((driver, index) => (
                  <tr
                    key={driver.id}
                    className="border-b border-white/[0.04] transition-colors last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`font-display text-lg font-bold ${
                          index < 3 ? 'text-racing-red' : 'text-zinc-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/drivers/${driver.id}`}
                        className="flex items-center gap-3 font-semibold text-white hover:text-racing-red"
                      >
                        <Flag code={driver.flag} width={24} />
                        {driver.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: driver.teamColor }}
                        />
                        {driver.team}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-300">
                      {driver.seasonWins}
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-300">
                      {driver.championships}
                    </td>
                    <td className="px-6 py-4 text-right font-display text-lg font-bold text-white">
                      {driver.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 移动端卡片列表 */}
            <ul className="divide-y divide-white/[0.05] md:hidden">
              {topDrivers.map((driver, index) => (
                <li key={driver.id}>
                  <Link
                    to={`/drivers/${driver.id}`}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <span
                      className={`w-6 text-center font-display text-lg font-bold ${
                        index < 3 ? 'text-racing-red' : 'text-zinc-500'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <Flag code={driver.flag} width={22} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {driver.name}
                      </p>
                      <p className="truncate text-xs text-racing-muted">
                        {driver.team}
                      </p>
                    </div>
                    <span className="font-display text-base font-bold text-white">
                      {driver.points}
                      <span className="ml-1 text-[10px] font-normal text-racing-muted">
                        分
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ============ 积分变化折线图 ============ */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="heading-display text-2xl text-white">
              积分走势
            </h2>
            <p className="mt-1 text-sm text-racing-muted">
              {pointsMode === 'contenders'
                ? '逐轮累计积分 —— 冠军争夺者（前 5 名）'
                : '逐轮累计积分 —— 全部车手（前 5 名高亮，其余淡灰显示）'}
            </p>
          </div>
          {/* 视图切换 */}
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => setPointsMode('contenders')}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                pointsMode === 'contenders'
                  ? 'bg-racing-red text-white'
                  : 'bg-transparent text-racing-muted hover:text-white'
              }`}
            >
              冠军争夺者
            </button>
            <button
              type="button"
              onClick={() => setPointsMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold transition ${
                pointsMode === 'all'
                  ? 'bg-racing-red text-white'
                  : 'bg-transparent text-racing-muted hover:text-white'
              }`}
            >
              全部车手
            </button>
          </div>
        </div>
        {pointsChartOption ? (
          <Chart option={pointsChartOption} height={380} />
        ) : (
          <LoadingState height={300} />
        )}
      </section>

      {/* ============ 车队积分走势 ============ */}
      <section className="card p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="heading-display text-2xl text-white">
            车队积分走势
          </h2>
          <p className="mt-1 text-sm text-racing-muted">
            逐轮累计车队积分 —— 全部 {teams.length} 支车队（车队代表色）
          </p>
        </div>
        {teamChartOption ? (
          <Chart option={teamChartOption} height={380} />
        ) : (
          <LoadingState height={300} />
        )}
      </section>

      {/* ============ 最新新闻 ============ */}
      <section>
        <h2 className="heading-display mb-4 text-2xl text-white">
          最新资讯
        </h2>
        {newsReq.loading ? (
          <LoadingState height={240} />
        ) : newsReq.error ? (
          <ErrorState message={newsReq.error} onRetry={newsReq.reload} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <article
                key={item.id}
                className="card card-hover group flex flex-col p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="badge bg-racing-red/15 text-red-400">
                    {item.category}
                  </span>
                  <span className="text-xs text-racing-muted">
                    {new Date(`${item.date}T00:00:00`).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold leading-snug text-white transition-colors group-hover:text-racing-red">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-racing-muted">
                  {item.summary}
                </p>
                <p className="mt-4 text-xs text-zinc-500">阅读 {item.readTime}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
