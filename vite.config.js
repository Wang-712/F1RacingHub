import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 前端请求 /api/* 时由 Vite 开发服务器转发到 FastAPI 后端 (:8000)，
      // 这样浏览器看到的始终是同源请求，无需在开发环境处理跨域。
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
