import { useEffect, useState } from 'react'

/**
 * 🏆 冠军纪念横幅 —— 庆祝 Kimi Antonelli 成为 2026 F1 最年轻世界冠军
 * ------------------------------------------------------------------
 * 视觉层次：
 *   1. 顶部大字报 —— 方格旗 + 金色奖杯 + 震撼标题
 *   2. 关键纪录数据卡 —— 20岁68天 等
 *   3. 主视频区 —— 庆祝瞬间自动播放
 *   4. 图片墙 —— 6 张精选冠军瞬间 + 点击放大
 */

const HIGHLIGHTS = [
  { label: '最年轻世界冠军', value: '20', suffix: '岁' },
  { label: '夺冠天数', value: '68', suffix: '天' },
  { label: '赛季胜场', value: '8', suffix: '场' },
  { label: '赛季积分', value: '302', suffix: '分' },
]

const PHOTOS = [
  '/champion/pic-1.avif',
  '/champion/pic-2.avif',
  '/champion/pic-3.avif',
  '/champion/pic-4.avif',
  '/champion/pic-5.avif',
  '/champion/pic-6.avif',
]

/** 方格旗 SVG 背景装饰 */
function CheckerFlag({ className = '' }) {
  return (
    <div
      className={`pointer-events-none ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)',
        backgroundSize: '14px 14px',
        backgroundPosition: '0 0, 0 7px, 7px -7px, -7px 0',
        backgroundColor: '#fff',
      }}
    />
  )
}

/** 冠军横幅 */
export default function ChampionBanner() {
  const [lightbox, setLightbox] = useState(null) // 当前放大的图片索引
  const [videoReady, setVideoReady] = useState(false)

  // ESC 关闭 lightbox
  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowRight')
        setLightbox((i) => (i + 1) % PHOTOS.length)
      if (e.key === 'ArrowLeft')
        setLightbox((i) => (i - 1 + PHOTOS.length) % PHOTOS.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-yellow-500/20">
        {/* ============ 背景层 ============ */}
        {/* 深色渐变 + 金色光晕 */}
        <div className="absolute inset-0 bg-gradient-to-br from-racing-red/30 via-racing-dark to-black" />
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-racing-red/30 blur-3xl" />

        {/* 顶部方格旗横条 */}
        <div className="absolute left-0 right-0 top-0 h-3 overflow-hidden">
          <CheckerFlag className="h-full w-full opacity-70" />
        </div>
        {/* 底部方格旗横条 */}
        <div className="absolute bottom-0 left-0 right-0 h-3 overflow-hidden">
          <CheckerFlag className="h-full w-full opacity-70" />
        </div>

        {/* 金色细线边框（方格旗内侧） */}
        <div className="pointer-events-none absolute inset-3 rounded-2xl border border-yellow-500/25" />

        {/* ============ 内容层 ============ */}
        <div className="relative px-6 py-14 sm:px-10 sm:py-16 lg:px-14">
          {/* 顶部标签 */}
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
              <span className="text-base">🏆</span> Season 2026 · World Champion
            </span>
            <span className="hidden text-xs text-yellow-500/60 sm:block">
              打破 F1 历史最年轻冠军纪录
            </span>
          </div>

          {/* ===== 大标题 ===== */}
          <div className="mb-10 max-w-4xl">
            {/* 副标题 */}
            <p className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.5em] text-yellow-500/80">
              Andrea Kimi Antonelli
            </p>
            {/* 主标题 */}
            <h1 className="font-display text-5xl font-black leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
              <span className="block">FIA Formula 1</span>
              <span className="block bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                WORLD CHAMPION
              </span>
            </h1>
            {/* 副文 */}
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              梅赛德斯青年军出身的 20 岁天才，以{' '}
              <span className="font-bold text-yellow-400">20 岁零 68 天</span>{' '}
              打破 F1 历史最年轻车手世界冠军纪录，书写赛车运动的全新篇章。
            </p>
          </div>

          {/* ===== 关键纪录数据卡 ===== */}
          <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.label}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-4 backdrop-blur-sm transition-all hover:border-yellow-500/40 sm:p-5"
              >
                {/* 悬停金色光晕 */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="relative mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {h.label}
                </p>
                <p className="relative flex items-baseline gap-1">
                  <span className="font-display text-3xl font-black text-white sm:text-4xl">
                    {h.value}
                  </span>
                  <span className="text-sm font-semibold text-yellow-500/80">
                    {h.suffix}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {/* ===== 主视频 + 图片墙 ===== */}
          <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
            {/* --- 主视频（占 3 列） --- */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black lg:col-span-3">
              {/* 加载骨架 */}
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-racing-red" />
                    <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                      Loading highlight...
                    </span>
                  </div>
                </div>
              )}
              <video
                className="aspect-video h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                controls
                onCanPlay={() => setVideoReady(true)}
              >
                <source src="/champion/champion.mp4" type="video/mp4" />
              </video>
              {/* 播放图标装饰 */}
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-racing-red" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                  Highlight · Auto
                </span>
              </div>
            </div>

            {/* --- 图片墙（占 2 列，3x2 网格） --- */}
            <div className="grid grid-cols-3 gap-3 lg:col-span-2 lg:grid-cols-3 lg:gap-3">
              {PHOTOS.map((src, idx) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightbox(idx)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.08] bg-black transition-all hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10"
                >
                  <img
                    src={src}
                    alt={`Champion moment ${idx + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* 悬停查看图标 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 底部赛车手签名风文字 ===== */}
          <div className="mt-10 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-6">
            <p className="font-display text-sm italic text-zinc-400">
              "Impossible is just a word. Today we made history."
            </p>
            <p className="text-[11px] uppercase tracking-[0.3em] text-yellow-500/50">
              Mercedes-AMG Petronas F1 Team · 2026
            </p>
          </div>
        </div>
      </section>

      {/* ============ 图片放大 Lightbox ============ */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 左右切换 */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox((i) => (i - 1 + PHOTOS.length) % PHOTOS.length)
            }}
            className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-8"
            aria-label="上一张"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setLightbox((i) => (i + 1) % PHOTOS.length)
            }}
            className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-8"
            aria-label="下一张"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 大图 */}
          <img
            src={PHOTOS[lightbox]}
            alt={`Champion moment ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl animate-zoom-in"
          />

          {/* 计数器 */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/70">
            {lightbox + 1} / {PHOTOS.length}
          </p>
        </div>
      )}
    </>
  )
}
