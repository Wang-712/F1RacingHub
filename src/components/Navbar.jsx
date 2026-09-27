import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

// 顶部导航项配置
const NAV_ITEMS = [
  { to: '/', label: '首页' },
  { to: '/drivers', label: '车手' },
  { to: '/teams', label: '车队' },
  { to: '/races', label: '赛程' },
  { to: '/statistics', label: '数据统计' },
  { to: '/ai', label: 'AI 助手' },
]

/**
 * 顶部导航栏
 * - 固定定位 + 毛玻璃背景
 * - 桌面端横向菜单，移动端汉堡菜单
 * - 当前路由高亮（红色下划线）
 */
export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  // 导航链接公共样式函数
  const linkClass = ({ isActive }) =>
    `relative px-1 py-2 text-sm font-semibold uppercase tracking-wider transition-colors duration-200 ${
      isActive
        ? 'text-white'
        : 'text-racing-muted hover:text-white'
    } after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 after:bg-racing-red after:transition-all after:duration-300 ${
      isActive ? 'after:w-full' : 'hover:after:w-full'
    }`

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-racing-dark/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo 区域 */}
        <Link
          to="/"
          className="flex items-center gap-2.5"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-racing-red font-display text-lg font-bold text-white shadow-lg shadow-racing-red/30">
            F1
          </span>
          <span className="leading-none">
            <span className="block font-display text-lg font-bold tracking-wide text-white">
              RACING HUB
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.3em] text-racing-muted">
              数据中心
            </span>
          </span>
        </Link>

        {/* 桌面端导航 */}
        <ul className="hidden items-center gap-7 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={linkClass} end={item.to === '/'}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* 移动端汉堡按钮 */}
        <button
          type="button"
          aria-label="切换导航菜单"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-white/10 lg:hidden"
        >
          <span
            className={`h-0.5 w-5 bg-white transition-transform duration-300 ${
              mobileOpen ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-white transition-opacity duration-300 ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-white transition-transform duration-300 ${
              mobileOpen ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>
      </nav>

      {/* 移动端下拉菜单 */}
      <div
        className={`overflow-hidden border-t border-white/[0.06] bg-racing-dark/95 transition-[max-height] duration-300 lg:hidden ${
          mobileOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <ul className="space-y-1 px-4 py-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-racing-red/15 text-white'
                      : 'text-racing-muted hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
