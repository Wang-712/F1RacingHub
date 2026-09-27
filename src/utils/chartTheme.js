/**
 * ECharts 深色赛车主题的公共配置片段
 * 各图表通过展开运算复用，保证全站视觉统一
 */

// 调色板：F1 红 + 车队配色 + 科技感渐变色
export const palette = [
  '#e10600',
  '#3671C6',
  '#FF8000',
  '#27F4D2',
  '#229971',
  '#6692FF',
  '#FEC93B',
  '#B6BABD',
  '#52E252',
  '#0093CC',
]

// 公共文字颜色
const textColor = '#e8e8ee'
const mutedColor = '#8b8b98'
const splitLineColor = 'rgba(255,255,255,0.07)'

/** 公共 tooltip 样式（深色玻璃拟态） */
export const baseTooltip = {
  backgroundColor: 'rgba(19,19,26,0.95)',
  borderColor: 'rgba(255,255,255,0.12)',
  borderWidth: 1,
  textStyle: { color: textColor, fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 24px rgba(0,0,0,.5); border-radius: 12px;',
}

/** 公共网格线 & 坐标轴样式 */
export const baseAxis = {
  axisLine: { lineStyle: { color: 'rgba(255,255,255,0.2)' } },
  axisTick: { show: false },
  axisLabel: { color: mutedColor, fontSize: 11 },
  splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
}

/** 公共图例样式 */
export const baseLegend = {
  textStyle: { color: mutedColor, fontSize: 12 },
  icon: 'roundRect',
  itemWidth: 12,
  itemHeight: 4,
}

/** 分类坐标轴（无纵向分割线） */
export const categoryAxis = {
  ...baseAxis,
  splitLine: { show: false },
}

export { textColor, mutedColor }
