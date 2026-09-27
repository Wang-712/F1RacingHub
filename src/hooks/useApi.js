import { useCallback, useEffect, useState } from 'react'

/**
 * 通用异步数据请求 Hook
 * @param {Function} fetcher  返回 Promise 的 api 层函数
 * @param {Array} deps        重新请求的依赖项
 * @returns {{ data, meta, loading, error, reload }}
 *
 * 用法：
 *   const { data: drivers, loading, error, reload } = useApi(getDrivers)
 */
export default function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 注意：effect 的清理函数必须是普通函数，不能返回 async 函数产生的 Promise，
  // 否则 React 卸载时会把 Promise 当作 destroy 调用而崩溃。
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    fetcher()
      .then((result) => {
        if (!alive) return
        setData(result.data)
        setMeta(result.meta || {})
      })
      .catch((err) => {
        if (alive) setError(err.message || 'Something went wrong')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // 手动重试：独立于 effect 生命周期
  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result.data)
      setMeta(result.meta || {})
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, meta, loading, error, reload }
}
