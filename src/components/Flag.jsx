import { useState } from 'react'

/**
 * 将国旗 emoji（区域指示符，如 🇳🇱）转换为 ISO 3166-1 alpha-2 代码（nl）。
 * 背景：Windows 系统不内置国旗 emoji 字体，直接显示会变成 "NL" 字母，
 * 因此统一改用 flagcdn.com 的国旗图片。
 */
function emojiToIsoCode(emoji) {
  try {
    return [...emoji]
      .filter((ch) => {
        const cp = ch.codePointAt(0)
        return cp >= 0x1f1e6 && cp <= 0x1f1ff
      })
      .map((ch) => String.fromCharCode(97 + (ch.codePointAt(0) - 0x1f1e6)))
      .join('')
  } catch {
    return ''
  }
}

/**
 * 国旗组件
 * @param {string} code 国旗 emoji 字符串
 * @param {number} width 显示宽度（px），高度按 4:3 自适应
 *
 * 图片加载失败（如离线）时降级为国家代码徽章
 */
export default function Flag({ code, width = 22, className = '' }) {
  const [failed, setFailed] = useState(false)
  const iso = emojiToIsoCode(code || '')

  if (!iso || failed) {
    return (
      <span
        className={`inline-flex items-center rounded-[3px] bg-white/10 px-1 text-[10px] font-bold text-zinc-200 ${className}`}
        style={{ height: Math.round(width * 0.7) }}
      >
        {iso.toUpperCase() || '??'}
      </span>
    )
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      srcSet={`https://flagcdn.com/w80/${iso}.png 2x`}
      alt={iso.toUpperCase()}
      width={width}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 rounded-[3px] object-cover ring-1 ring-white/15 ${className}`}
    />
  )
}
