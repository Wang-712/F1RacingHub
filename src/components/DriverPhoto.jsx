import { useState } from 'react'
import Flag from './Flag'
import { getDriverPhoto, hasDriverPhoto } from '../data/driverPhotos'

/**
 * 车手定妆照
 * -------------------------------------------------------------
 * - 透明底官方肖像（WebP），叠加车队色渐变背景
 * - loading="lazy" + decoding="async"，srcSet 适配高分屏
 * - 加载中：骨架微光；无资源 / 加载失败：车号 + 剪影占位图
 * - 整个组件是 button，点击触发 onPreview 打开大图预览
 *
 * @param {object} driver  车手对象（id/name/number/teamColor/flag）
 * @param {'card'|'hero'} variant  card=车手卡片 / hero=详情页头部
 * @param {Function} onPreview  点击回调，参数为大图预览数据
 * @param {boolean} eager  是否立即加载（详情页首屏 LCP 图建议 true）
 * @param {string} className  追加在最外层的类名
 */
export default function DriverPhoto({
  driver,
  variant = 'card',
  onPreview,
  eager = false,
  className = '',
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  const available = hasDriverPhoto(driver?.id)
  const cardUrl = available ? getDriverPhoto(driver.id, 'card') : null
  const hdUrl = available ? getDriverPhoto(driver.id, 'hd') : null
  const largeUrl = available ? getDriverPhoto(driver.id, 'large') : null
  const color = driver?.teamColor || '#e10600'

  const isHero = variant === 'hero'

  const handleClick = () => {
    if (onPreview && largeUrl) {
      onPreview({
        src: largeUrl,
        alt: `${driver.name} 定妆照`,
        title: driver.name,
        subtitle: driver.team,
        color,
      })
    }
  }

  // 不同布局下图片在视口中的大致宽度，帮助浏览器从 srcSet 选择合适资源
  const sizes = isHero
    ? '(min-width:1024px) 224px, (min-width:640px) 192px, 160px'
    : '(max-width:639px) 92vw, (max-width:1023px) 46vw, (max-width:1279px) 31vw, 296px'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!largeUrl}
      aria-label={largeUrl ? `查看 ${driver?.name} 定妆照大图` : `${driver?.name} 定妆照暂缺`}
      className={[
        'group/photo relative block shrink-0 select-none overflow-hidden',
        'border border-white/10 bg-black/30 text-left',
        isHero
          ? 'aspect-[5/6] w-36 rounded-2xl sm:w-44 lg:w-52'
          : 'aspect-[5/6] w-full rounded-t-2xl',
        largeUrl ? 'cursor-zoom-in' : 'cursor-default',
        className,
      ].join(' ')}
    >
      {/* 车队色渐变背景 */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: `linear-gradient(155deg, ${color}38 0%, rgba(12,12,18,0.55) 52%, ${color}1f 100%)`,
        }}
      />

      {/* 大号车号水印 */}
      {driver?.number ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 left-0 font-display text-[6.5rem] font-black leading-none text-white/[0.07] sm:text-[7.5rem]"
        >
          {String(driver.number).padStart(2, '0')}
        </span>
      ) : null}

      {available && !failed ? (
        <>
          {/* 加载中骨架微光 */}
          {!loaded && (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.06]"
            />
          )}
          <img
            src={cardUrl}
            srcSet={`${cardUrl} 440w, ${hdUrl} 768w`}
            sizes={sizes}
            alt={`${driver?.name} 定妆照`}
            width={isHero ? 208 : 440}
            height={isHero ? 250 : 528}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={[
              'relative h-full w-full object-cover transition-all duration-500 ease-out',
              loaded ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0',
              largeUrl ? 'group-hover/photo:scale-[1.04]' : '',
            ].join(' ')}
          />
        </>
      ) : (
        /* 占位图：剪影 + 车号（无资源或加载失败时显示） */
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <svg
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="h-20 w-20 text-white/20"
            fill="currentColor"
          >
            <circle cx="32" cy="22" r="13" />
            <path d="M10 58c1.8-12.4 11.2-19 22-19s20.2 6.6 22 19z" />
          </svg>
          <span className="font-display text-xs font-bold uppercase tracking-widest text-white/30">
            {driver?.number ? `#${driver.number}` : 'No Photo'}
          </span>
        </span>
      )}

      {/* 国旗角标（卡片样式） */}
      {!isHero && driver?.flag && (
        <span className="absolute right-3 top-3 z-10 drop-shadow">
          <Flag code={driver.flag} width={30} />
        </span>
      )}

      {/* 悬停放大提示 */}
      {largeUrl && (
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 z-10 inline-flex translate-y-1 items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover/photo:translate-y-0 group-hover/photo:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" strokeLinecap="round" />
          </svg>
          预览
        </span>
      )}
    </button>
  )
}
