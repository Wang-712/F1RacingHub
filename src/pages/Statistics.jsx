import { useMemo } from 'react'
import Chart from '../components/Chart'
import { ErrorState, LoadingState } from '../components/AsyncState'
import useApi from '../hooks/useApi'
import { getStatistics } from '../services/api'
import {
  palette,
  baseTooltip,
  baseAxis,
  categoryAxis,
} from '../utils/chartTheme'

/**
 * 数据分析页（数据来自后端 API）
 * 四张 ECharts 图表：
 * 1. 历史车手世界冠军数量（柱状图）
 * 2. 历史胜场排行榜（横向柱状图）
 * 3. 本赛季车队积分比较（柱状图，车队品牌色）
 * 4. 本赛季最快圈统计（柱状图，真实赛果聚合）
 */
export default function Statistics() {
  const { data, meta, loading, error, reload } = useApi(getStatistics, [])

  /* ---------- 图 1：历史冠军数量 ---------- */
  const championshipsOption = useMemo(() => {
    const records = data?.champions || []
    return {
      color: [palette[0]],
      tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 24, right: 20, bottom: 60, left: 40 },
      xAxis: {
        type: 'category',
        ...categoryAxis,
        data: records.map((r) => r.name),
        axisLabel: { color: '#8b8b98', fontSize: 10, rotate: 35 },
      },
      yAxis: { type: 'value', ...baseAxis, minInterval: 1 },
      series: [
        {
          name: 'World Titles',
          type: 'bar',
          barWidth: '52%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#ff3b30' },
                { offset: 1, color: '#b30500' },
              ],
            },
          },
          label: { show: true, position: 'top', color: '#fff', fontWeight: 'bold' },
          data: records.map((r) => r.value),
        },
      ],
    }
  }, [data])

  /* ---------- 图 2：车手胜场排名（横向） ---------- */
  const winsOption = useMemo(() => {
    const records = [...(data?.careerWins || [])].reverse() // 最大值置顶
    return {
      color: [palette[3]],
      tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 16, right: 40, bottom: 24, left: 110 },
      xAxis: { type: 'value', ...baseAxis },
      yAxis: {
        type: 'category',
        ...categoryAxis,
        splitLine: { show: false },
        data: records.map((r) => r.name),
        axisLabel: { color: '#c7c7d1', fontSize: 11 },
      },
      series: [
        {
          name: 'Grand Prix Wins',
          type: 'bar',
          barWidth: '58%',
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#0d8f78' },
                { offset: 1, color: '#27F4D2' },
              ],
            },
          },
          label: {
            show: true, position: 'right',
            color: '#fff', fontWeight: 'bold', fontSize: 11,
          },
          data: records.map((r) => r.value),
        },
      ],
    }
  }, [data])

  /* ---------- 图 3：车队积分比较 ---------- */
  const teamsOption = useMemo(() => {
    const records = data?.teams || []
    return {
      tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 24, right: 20, bottom: 70, left: 44 },
      xAxis: {
        type: 'category',
        ...categoryAxis,
        data: records.map((t) => t.name),
        axisLabel: { color: '#8b8b98', fontSize: 10, rotate: 35 },
      },
      yAxis: { type: 'value', ...baseAxis },
      series: [
        {
          name: `${meta.season || '2026'} Constructor Points`,
          type: 'bar',
          barWidth: '52%',
          itemStyle: { borderRadius: [6, 6, 0, 0] },
          label: {
            show: true, position: 'top',
            color: '#fff', fontWeight: 'bold', fontSize: 11,
          },
          // 每根柱子使用车队自己的品牌色
          data: records.map((t) => ({
            value: t.value,
            itemStyle: { color: t.color },
          })),
        },
      ],
    }
  }, [data, meta.season])

  /* ---------- 图 4：本赛季最快圈统计（真实赛果） ---------- */
  const fastestLapsOption = useMemo(() => {
    const records = data?.fastestLaps || []
    return {
      color: [palette[6]],
      tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 24, right: 20, bottom: 60, left: 40 },
      xAxis: {
        type: 'category',
        ...categoryAxis,
        data: records.map((r) => r.name),
        axisLabel: { color: '#8b8b98', fontSize: 10, rotate: 30 },
      },
      yAxis: { type: 'value', ...baseAxis, minInterval: 1 },
      series: [
        {
          name: 'Fastest Laps',
          type: 'bar',
          barWidth: '50%',
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#FEC93B' },
                { offset: 1, color: '#c8950a' },
              ],
            },
          },
          label: { show: true, position: 'top', color: '#FEC93B', fontWeight: 'bold' },
          data: records.map((r) => r.value),
        },
      ],
    }
  }, [data])

  // 图表卡片公共外壳
  const ChartCard = ({ title, subtitle, option, height = 360 }) => (
    <div className="card p-5 sm:p-6">
      <h2 className="heading-display text-xl text-white">{title}</h2>
      <p className="mb-3 text-sm text-racing-muted">{subtitle}</p>
      <Chart option={option} height={height} />
    </div>
  )

  if (loading) {
    return <LoadingState label="正在整理数据..." height={520} />
  }
  if (error) {
    return <ErrorState message={error} onRetry={reload} height={520} />
  }

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="heading-display text-3xl text-white sm:text-4xl">
            数据统计与纪录
          </h1>
          <p className="mt-1 text-sm text-racing-muted">
            历史纪录与 {meta.season || '2026'} 赛季数据分析
          </p>
        </div>
        <span
          className={`badge ${
            meta.source === 'fallback'
              ? 'bg-yellow-500/15 text-yellow-400'
              : 'bg-green-500/15 text-green-400'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              meta.source === 'fallback' ? 'bg-yellow-400' : 'animate-pulse-dot bg-green-400'
            }`}
          />
          {meta.source === 'fallback' ? '示例赛季数据' : '实时赛季数据'}
        </span>
      </div>

      {/* 图 1 & 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="车手世界冠军数量排行"
          subtitle="F1 历史上车手世界冠军次数最多的车手"
          option={championshipsOption}
        />
        <ChartCard
          title="历史分站胜场排行"
          subtitle="F1 历史胜场最多的前十名车手"
          option={winsOption}
        />
      </div>

      {/* 图 3 & 4 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={`${meta.season || '2026'} 赛季车队积分`}
          subtitle="当前车队积分榜对比"
          option={teamsOption}
        />
        <ChartCard
          title={`${meta.season || '2026'} 赛季最快圈`}
          subtitle="本赛季获得最快圈次数最多的车手（实时赛果）"
          option={fastestLapsOption}
        />
      </div>
    </div>
  )
}
