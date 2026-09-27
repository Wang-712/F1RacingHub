import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import Chart from '../components/Chart'
import Flag from '../components/Flag'
import { LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getDriverDetail } from '../services/api'
import {
  baseTooltip,
  baseAxis,
  categoryAxis,
} from '../utils/chartTheme'

/**
 * 车手详情页（数据来自后端 API）
 * - 展示车手档案与职业统计
 * - ECharts 雷达图呈现六维能力
 * - 折线图展示本赛季积分走势
 */
export default function DriverDetail() {
  const { id } = useParams()
  // id 变化时重新请求（useApi 依赖项）
  const { data: driver, meta, loading, error, reload } = useApi(
    () => getDriverDetail(id),
    [id]
  )

  // 雷达图配置（依赖 driver）
  const radarOption = useMemo(() => {
    if (!driver?.radar) return null
    const indicators = [
      { name: '正赛节奏', key: 'pace' },
      { name: '排位赛', key: 'qualifying' },
      { name: '稳定性', key: 'consistency' },
      { name: '轮胎管理', key: 'tyreManagement' },
      { name: '雨战能力', key: 'wetSkill' },
      { name: '比赛策略', key: 'racecraft' },
    ]
    return {
      color: [driver.teamColor],
      tooltip: { ...baseTooltip },
      radar: {
        indicator: indicators.map((i) => ({ name: i.name, max: 100 })),
        radius: '66%',
        center: ['50%', '54%'],
        axisName: { color: '#c7c7d1', fontSize: 12 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'],
          },
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: indicators.map((i) => driver.radar[i.key]),
              name: driver.name,
              areaStyle: { opacity: 0.25 },
              lineStyle: { width: 2.5 },
              symbolSize: 5,
            },
          ],
        },
      ],
    }
  }, [driver])

  // 积分走势图配置
  const progressionOption = useMemo(() => {
    if (!driver?.progression?.length) return null
    return {
      color: [driver.teamColor],
      tooltip: { ...baseTooltip, trigger: 'axis' },
      grid: { top: 24, right: 20, bottom: 32, left: 44 },
      xAxis: {
        type: 'category',
        ...categoryAxis,
        boundaryGap: false,
        data: driver.progression.map((_, i) => `R${i + 1}`),
      },
      yAxis: { type: 'value', ...baseAxis },
      series: [
        {
          name: 'Points',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: driver.teamColor + '55' },
                { offset: 1, color: driver.teamColor + '05' },
              ],
            },
          },
          data: driver.progression,
        },
      ],
    }
  }, [driver])

  // 加载中
  if (loading) {
    return <LoadingState label="正在加载车手档案..." height={520} />
  }

  // 404：车手不存在
  if (!driver) {
    const notFound = error?.toLowerCase().includes('not found')
    return (
      <div className="card p-12 text-center">
        <p className="text-lg text-white">
          {notFound ? `车手 "${id}" 不存在` : '车手不存在'}
        </p>
        {!notFound && error && (
          <p className="mx-auto mt-2 max-w-md text-sm text-racing-muted">{error}</p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          {!notFound && error && (
            <button type="button" onClick={reload} className="btn-primary">
              重试
            </button>
          )}
          <Link to="/drivers" className="btn-primary">
            ← 返回车手列表
          </Link>
        </div>
      </div>
    )
  }

  const birthDate = new Date(`${driver.birthDate}T00:00:00`)

  // 职业统计四项
  const careerStats = [
    { label: '世界冠军', value: driver.championships, accent: true },
    { label: '分站胜利', value: driver.careerWins },
    { label: '领奖台', value: driver.podiums },
    { label: '杆位', value: driver.poles },
  ]

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Link
        to="/drivers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-racing-muted transition hover:text-white"
      >
        ← 返回车手列表
      </Link>

      {/* 车手头部信息卡 */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(120deg, ${driver.teamColor}30 0%, rgba(10,10,15,0.96) 60%)`,
          }}
        />
        <div className="relative flex flex-col gap-6 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            {/* 大号车号 */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/40 sm:h-32 sm:w-32">
              <span
                className="font-display text-6xl font-bold sm:text-7xl"
                style={{ color: driver.teamColor }}
              >
                {driver.number || '-'}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Flag code={driver.flag} width={44} />
                {driver.championships > 0 && (
                  <span className="badge bg-yellow-500/15 text-yellow-400">
                    ★ {driver.championships} 届世界冠军
                  </span>
                )}
              </div>
              <h1 className="mt-2 font-display text-3xl font-bold uppercase text-white sm:text-5xl">
                {driver.name}
              </h1>
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: driver.teamColor }}
                />
                {driver.team}
              </p>
            </div>
          </div>

          {/* 本赛季积分大数字 */}
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-8 py-5 text-center backdrop-blur-sm">
            <p className="font-display text-5xl font-bold text-white">
              {driver.points}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-racing-muted">
              {meta.season || '2026'} 赛季积分
            </p>
          </div>
        </div>
      </section>

      {/* 个人信息 + 简介 */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-racing-muted">
            个人资料
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-racing-muted">出生日期</dt>
              <dd className="text-right font-medium text-white">
                {driver.birthDate
                  ? birthDate.toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-racing-muted">国籍</dt>
              <dd className="flex items-center gap-1.5 font-medium text-white">
                <Flag code={driver.flag} width={20} />
                {driver.country || '—'}
              </dd>
            </div>
            {driver.birthPlace && (
              <div className="flex justify-between gap-4">
                <dt className="text-racing-muted">出生地</dt>
                <dd className="text-right font-medium text-white">
                  {driver.birthPlace}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-racing-muted">车号</dt>
              <dd
                className="font-display text-lg font-bold"
                style={{ color: driver.teamColor }}
              >
                {driver.number || '—'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card flex flex-col p-6 lg:col-span-2">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-racing-muted">
            简介
          </h2>
          <p className="text-base leading-relaxed text-zinc-300">{driver.bio}</p>
          <Link
            to="/teams"
            className="mt-auto pt-5 text-sm font-semibold transition hover:opacity-80"
            style={{ color: driver.teamColor }}
          >
            查看 {driver.team} 车队 →
          </Link>
        </div>
      </section>

      {/* 职业统计 */}
      <section>
        <h2 className="heading-display mb-4 text-2xl text-white">
          职业生涯数据
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {careerStats.map((stat) => (
            <div key={stat.label} className="card p-6 text-center">
              <p
                className={`font-display text-4xl font-bold ${
                  stat.accent && driver.championships > 0
                    ? 'text-racing-red'
                    : 'text-white'
                }`}
              >
                {stat.value}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-racing-muted">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 图表区：雷达图 + 积分走势 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h2 className="heading-display text-xl text-white">
            能力雷达图
          </h2>
          <p className="mb-2 text-sm text-racing-muted">
            六维车手能力模型
          </p>
          {radarOption ? (
            <Chart option={radarOption} height={360} />
          ) : (
            <LoadingState height={300} />
          )}
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="heading-display text-xl text-white">
            {meta.season || '2026'} 赛季积分走势
          </h2>
          <p className="mb-2 text-sm text-racing-muted">
            逐轮累计积分
          </p>
          {progressionOption ? (
            <Chart option={progressionOption} height={360} />
          ) : (
            <LoadingState height={300} />
          )}
        </div>
      </section>
    </div>
  )
}
