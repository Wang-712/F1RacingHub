import { useEffect, useRef } from 'react'
// 按需引入 ECharts 模块，减小打包体积
import * as echarts from 'echarts/core'
import { LineChart, BarChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  CanvasRenderer,
])

/**
 * 通用 ECharts 封装组件
 * @param {object} option  ECharts 配置项
 * @param {number|string} height 图表高度（px 或 CSS 值）
 * @param {string} className 额外样式类
 *
 * 说明：
 * - 组件挂载时初始化实例，卸载时自动 dispose，防止内存泄漏
 * - 通过 ResizeObserver 监听容器尺寸，实现响应式重绘
 * - option 变化时以 notMerge 模式刷新图表
 */
export default function Chart({ option, height = 320, className = '' }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)

  // 初始化 & 销毁图表实例
  useEffect(() => {
    const chart = echarts.init(containerRef.current)
    chartRef.current = chart

    // 容器尺寸变化（窗口缩放 / 移动端旋转）时自动 resize
    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // option 更新时重新渲染
  useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true)
    }
  }, [option])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height }}
      role="img"
    />
  )
}
