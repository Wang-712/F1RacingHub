import { useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Drivers from './pages/Drivers'
import DriverDetail from './pages/DriverDetail'
import Teams from './pages/Teams'
import Races from './pages/Races'
import Statistics from './pages/Statistics'
import AI from './pages/AI'

/** 路由切换时自动回到页面顶部 */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** 404 兜底（复用首页入口） */
function NotFound() {
  return (
    <div className="card flex flex-col items-center gap-4 p-16 text-center">
      <p className="font-display text-6xl font-bold text-racing-red">404</p>
      <p className="text-lg text-white">页面不存在</p>
      <a href="/" className="btn-primary">
        返回首页
      </a>
    </div>
  )
}

/**
 * 应用根组件：路由表 + 整体布局（导航栏 / 内容区 / 页脚）
 */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-racing-dark">
        <Navbar />

        {/* 主内容区：顶部留出固定导航栏高度 */}
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/drivers/:id" element={<DriverDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/races" element={<Races />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/ai" element={<AI />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* 页脚 */}
        <footer className="border-t border-white/[0.06] py-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-racing-red font-display text-xs font-bold text-white">
                F1
              </span>
              <span className="font-display text-sm font-bold tracking-wide text-white">
                RACING HUB
              </span>
            </div>
            <p className="text-xs text-racing-muted">
              © 2026 F1 Racing Hub · 演示项目，使用模拟数据 · 与一级方程式赛车无官方关联
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
