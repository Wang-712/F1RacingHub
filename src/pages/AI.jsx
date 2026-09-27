import { useEffect, useRef, useState } from 'react'
import { getAIReply } from '../services/aiService'

// 欢迎消息
const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    '你好，我是 F1 Racing Hub AI 助手 🏁 目前我处于模拟模式，可以回答 2026 赛季积分、车手车队资料、赛程和 F1 历史纪录相关的问题。试试下面的问题吧！',
}

// 推荐问题
const SUGGESTIONS = [
  '谁是F1历史冠军最多的车手？',
  '2026赛季车队积分榜怎么样？',
  '下一场比赛是什么时候？',
  '介绍一下 Max Verstappen',
]

/**
 * AI 赛车助手页（ChatGPT 风格）
 * 数据层在 src/services/aiService.js，
 * 将来切换真实 GPT API 时只需修改 service，本页无需改动。
 */
export default function AI() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  // 消息列表底部锚点，用于自动滚动
  const bottomRef = useRef(null)

  // 消息更新后自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /** 发送消息 */
  const handleSend = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return

    const userMessage = { role: 'user', content }
    const history = messages
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // 调用 AI 服务层（当前为模拟，未来替换为 GPT API）
      const reply = await getAIReply(content, history)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，服务暂时不可用，请稍后再试。',
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  /** 回车发送（Shift+Enter 换行） */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* 页头 */}
      <div className="border-b border-white/[0.06] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-racing-red to-red-800 font-display text-lg font-bold text-white">
            AI
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-white">
              F1 AI 助手
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-racing-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              模拟模式 · 随时可聊
            </p>
          </div>
        </div>
      </div>

      {/* 聊天消息区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              {/* 头像 */}
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-br from-racing-red to-red-800 text-white'
                }`}
              >
                {msg.role === 'user' ? 'ME' : 'AI'}
              </span>

              {/* 气泡 */}
              <div
                className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : msg.error
                      ? 'border border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border border-white/[0.08] bg-racing-card text-zinc-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* 加载中：打字指示动画 */}
          {loading && (
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-racing-red to-red-800 text-xs font-bold text-white">
                AI
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-racing-card px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* 推荐问题（消息较少时显示） */}
      {messages.length <= 1 && (
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-4 pb-3 sm:px-6">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="rounded-full border border-white/10 bg-racing-card px-3.5 py-1.5 text-xs text-zinc-300 transition hover:border-racing-red/50 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-white/[0.06] px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="问我任何关于 F1 的问题..."
            className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-racing-card px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-racing-red focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="btn-primary h-12 w-12 shrink-0 !p-0"
            aria-label="发送消息"
          >
            {/* 纸飞机图标 */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M3.4 20.4 21.85 12.92a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.16L4 11l10 1-10 1-1.99 6.24a1 1 0 0 0 1.39 1.16Z" />
            </svg>
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-zinc-600">
          AI 助手当前运行于模拟模式 · 按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  )
}
