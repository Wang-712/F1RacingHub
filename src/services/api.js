/**
 * 前端统一数据访问层（DAL）
 * -------------------------------------------------------------
 * 所有页面只允许通过本模块访问后端，不直接使用 fetch：
 * - 统一 baseURL / 错误处理 / JSON 解析
 * - 统一解包后端响应包络 { data, meta }
 * - 将来更换后端地址或加入鉴权头时只需修改这里
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/** 自定义请求错误，附带 HTTP 状态码 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * 基础请求方法
 * @returns {Promise<{data: any, meta: object}>}
 */
async function request(path) {
  let response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new ApiError('Cannot reach the F1 API server. Is the backend running?', 0)
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body && body.detail) detail = body.detail
    } catch {
      /* 忽略非 JSON 错误体 */
    }
    throw new ApiError(detail, response.status)
  }

  const body = await response.json()
  // 后端统一返回 { data, meta }
  return { data: body.data, meta: body.meta || {} }
}

// ============ 领域 API ============

/** 首页赛季概览 */
export const getSeason = () => request('/season')

/** 车手积分榜 */
export const getDrivers = () => request('/drivers')

/** 单个车手详情 */
export const getDriverDetail = (driverId) => request(`/drivers/${encodeURIComponent(driverId)}`)

/** 车队积分榜 */
export const getTeams = () => request('/teams')

/** 赛季赛历 */
export const getRaces = () => request('/races')

/** 数据分析（冠军/胜场/车队积分/最快圈） */
export const getStatistics = () => request('/statistics')

/** F1 新闻 */
export const getNews = () => request('/news')
