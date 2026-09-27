import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 应用入口：挂载根组件
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
