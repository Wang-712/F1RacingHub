/**
 * 异步状态展示组件
 * - LoadingState：赛车风格加载动画
 * - ErrorState：错误提示 + 重试按钮
 */

export function LoadingState({ label = '正在加载数据...', height = 320 }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 text-racing-muted"
      style={{ minHeight: height }}
    >
      {/* 方格旗风格脉冲圆点 */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-3 w-3 rounded-sm ${
              i % 2 === 0 ? 'bg-racing-red' : 'bg-white/70'
            }`}
            style={{
              animation: 'pulse-dot 1s ease-in-out infinite',
              animationDelay: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium uppercase tracking-widest">{label}</p>
    </div>
  )
}

export function ErrorState({
  message = '数据加载失败。',
  onRetry,
  height = 320,
}) {
  return (
    <div
      className="card flex flex-col items-center justify-center gap-4 p-8 text-center"
      style={{ minHeight: height }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-racing-red/15 text-2xl">
        ⚠️
      </span>
      <div>
        <p className="font-display text-lg font-bold text-white">
          数据不可用
        </p>
        <p className="mt-1 max-w-md text-sm text-racing-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          重试
        </button>
      )}
    </div>
  )
}

/**
 * 数据来源标识：实时数据显示 LIVE，降级快照显示 SAMPLE
 */
export function DataSourceBadge({ source }) {
  if (!source) return null
  const isLive = source === 'jolpica'
  return (
    <span
      className={`badge ${
        isLive
          ? 'bg-green-500/15 text-green-400'
          : 'bg-yellow-500/15 text-yellow-400'
      }`}
      title={isLive ? '来自 F1 数据接口的实时数据' : '离线快照数据'}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isLive ? 'animate-pulse-dot bg-green-400' : 'bg-yellow-400'
        }`}
      />
      {isLive ? '实时数据' : '示例数据'}
    </span>
  )
}
