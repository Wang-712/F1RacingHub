import { useEffect, useState } from 'react'

/**
 * 车手定妆照大图预览（Lightbox）
 * -------------------------------------------------------------
 * - 全屏遮罩 + 居中大图，遮罩 / 关闭按钮 / Esc 均可关闭
 * - 打开期间锁定 body 滚动
 * - 大图按需加载，加载中显示转圈，加载失败显示提示
 *
 * @param {object|null} photo { src, alt, title, subtitle, color }
 * @param {Function} onClose  关闭回调
 */
export default function DriverLightbox({ photo, onClose }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const open = !!photo

  useEffect(() => {
    if (!open) return
    setLoaded(false)
    setFailed(false)

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)

    // 锁定背景滚动
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, photo?.src, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.title} 定妆照预览`}
    >
      {/* 半透明遮罩：点击关闭 */}
      <button
        type="button"
        aria-label="关闭预览"
        onClick={onClose}
        className="absolute inset-0 cursor-zoom-out bg-black/85 backdrop-blur-sm"
      />

      {/* 大图容器 */}
      <div className="relative z-10 flex max-h-full animate-zoom-in flex-col items-center">
        <div
          className="relative flex max-h-[78vh] items-center justify-center rounded-3xl p-6 sm:p-10"
          style={{
            background: `radial-gradient(120% 120% at 50% 0%, ${photo.color || '#e10600'}26 0%, rgba(10,10,15,0.9) 62%)`,
          }}
        >
          {!loaded && !failed && (
            <span
              aria-hidden="true"
              className="absolute h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
            />
          )}

          {failed ? (
            <p className="px-10 py-16 text-center text-sm text-racing-muted">
              大图加载失败，请稍后重试
            </p>
          ) : (
            <img
              src={photo.src}
              alt={photo.alt}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
              className={[
                'max-h-[70vh] w-auto max-w-[88vw] object-contain transition-opacity duration-300',
                loaded ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            />
          )}
        </div>

        {/* 图注 */}
        <div className="mt-4 flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-5 py-2 backdrop-blur-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: photo.color || '#e10600' }}
          />
          <span className="font-display text-lg font-bold text-white">
            {photo.title}
          </span>
          {photo.subtitle && (
            <span className="text-sm text-racing-muted">{photo.subtitle}</span>
          )}
        </div>
      </div>

      {/* 右上角关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭预览"
        className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white transition hover:border-white/40 hover:bg-black/80 sm:right-6 sm:top-6"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
