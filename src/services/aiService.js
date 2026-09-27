/**
 * AI 赛车助手服务层
 * -------------------------------------------------------------
 * 当前为「本地模拟回复」模式（关键词匹配）。
 * 将来接入真实 GPT API 时，只需把 getAIReply 内部替换为
 * 底部注释中的 fetch 请求，页面组件无需任何改动。
 */

// 模拟网络延迟
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 模拟知识库：关键词 → 回复
const KNOWLEDGE_RULES = [
  {
    keywords: ['冠军', 'champion', 'title', 'world champion', '最多'],
    answer:
      '目前 Lewis Hamilton 和 Michael Schumacher 共同保持着 7 次车手世界冠军的历史纪录。Max Verstappen 已拿到 4 次，是现役车手中最接近的追赶者。',
  },
  {
    keywords: ['胜场', 'win', 'most wins', '胜利', '最多胜'],
    answer:
      'F1 历史胜场榜第一是 Lewis Hamilton（106 胜），其次是 Michael Schumacher（91 胜），Max Verstappen 以 71 胜位列第三。2026 赛季 Andrea Kimi Antonelli 已拿到 8 场胜利，领跑本赛季胜场榜。',
  },
  {
    keywords: ['verstappen', '维斯塔潘', 'max'],
    answer:
      'Max Verstappen，1 号车手，效力于 Red Bull Racing，4 届世界冠军。他以激进的驾驶风格和雨战能力闻名，职业生涯 71 胜 51 杆 134 领奖台。2026 赛季他以 163 分位列车手积分榜第六。',
  },
  {
    keywords: ['hamilton', '汉密尔顿'],
    answer:
      'Lewis Hamilton，44 号车手，7 届世界冠军，2026 赛季转投 Ferrari。他保持着 F1 历史最多胜场（106）、最多杆位（107）和最多领奖台（207）的纪录。2026 赛季他以 199 分位列车手积分榜第三。',
  },
  {
    keywords: ['norris', '诺里斯', 'lando'],
    answer:
      'Lando Norris，4 号车手，效力于 McLaren。2026 赛季他拿到 2 场胜利、186 分，位列车手积分榜第四，与队友 Piastri 一起帮助 McLaren 位列车队积分榜第三。',
  },
  {
    keywords: ['车队', 'constructor', 'team', 'constructors'],
    answer:
      '2026 赛季车队积分榜：Mercedes（538 分）领跑，Ferrari（378 分）第二，McLaren（306 分）第三，Red Bull Racing（263 分）第四。历史上 Ferrari 以 16 次车队冠军排名第一。',
  },
  {
    keywords: ['下一场', 'next race', 'next', '赛程', '赛历', 'schedule'],
    answer:
      '下一场比赛是 2026 年 10 月 4 日的 Bahrain GP in Malaysia，在马来西亚雪邦国际赛道（Sepang International Circuit）进行。',
  },
  {
    keywords: ['杆位', 'pole'],
    answer:
      '历史杆位纪录由 Lewis Hamilton 保持（107 杆）。现役车手中，Max Verstappen 以 51 个杆位居首，Charles Leclerc 以 24 个杆位紧随其后。',
  },
  {
    keywords: ['积分榜', 'standings', '排名', '领跑', '第一'],
    answer:
      '2026 赛季车手积分榜：Andrea Kimi Antonelli（Mercedes，302 分）领跑，George Russell（Mercedes，236 分）第二，Lewis Hamilton（Ferrari，199 分）第三。车队积分榜由 Mercedes 以 538 分领跑。',
  },
  {
    keywords: ['antonelli', '安东内利'],
    answer:
      'Andrea Kimi Antonelli，梅赛德斯青年军出身的 20 岁天才车手，2026 赛季表现惊艳，以 8 场胜利、302 分领跑车手积分榜，被视为未来的世界冠军。',
  },
  {
    keywords: ['你好', 'hello', 'hi', 'hey', '在吗'],
    answer:
      '你好！我是 F1 Racing Hub AI 助手 🏁 你可以问我车手数据、车队排名、赛程赛历或 F1 历史纪录，我会尽力解答！',
  },
  {
    keywords: ['ferrari', '法拉利'],
    answer:
      'Scuderia Ferrari 是 F1 历史上最成功、也是唯一参加了全部赛季的车队，共获得 16 次车队冠军和 15 次车手冠军。2026 赛季由 Leclerc 和 Hamilton 搭档，目前以 378 分位列车队积分榜第二。',
  },
  {
    keywords: ['mercedes', '奔驰', '梅赛德斯'],
    answer:
      'Mercedes-AMG Petronas 是涡轮增压混动时代的霸主，2026 赛季以 538 分领跑车队积分榜。旗下车手 Andrea Kimi Antonelli（302 分）和 George Russell（236 分）包揽车手积分榜前两名。',
  },
]

// 兜底回复
const FALLBACK_ANSWER =
  '我目前运行在模拟模式，掌握的信息包括：2026 赛季积分与排名、车手/车队资料、赛程赛历以及 F1 历史纪录。你可以试试问我「谁是冠军最多的车手？」「下一场比赛是什么时候？」或「介绍一下 Hamilton」。'

/**
 * 获取 AI 回复（模拟）
 * @param {string} userText 用户输入
 * @param {Array} history 历史消息 [{role:'user'|'assistant', content}]
 * @returns {Promise<string>} 回复内容
 */
export async function getAIReply(userText, history = []) {
  await delay(600 + Math.random() * 600) // 模拟网络耗时 0.6~1.2s

  const lower = userText.toLowerCase()
  const hit = KNOWLEDGE_RULES.find((rule) =>
    rule.keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
  )
  return hit ? hit.answer : FALLBACK_ANSWER
}

/* =============================================================
 * 将来接入真实 GPT / OpenAI 兼容接口的参考实现
 * -------------------------------------------------------------
 * export async function getAIReply(userText, history = []) {
 *   const messages = [
 *     { role: 'system', content: '你是一个专业的 F1 赛车数据助手。' },
 *     ...history,
 *     { role: 'user', content: userText },
 *   ]
 *
 *   const res = await fetch(import.meta.env.VITE_AI_BASE_URL + '/chat/completions', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       Authorization: `Bearer ${import.meta.env.VITE_AI_API_KEY}`,
 *     },
 *     body: JSON.stringify({
 *       model: 'gpt-4o-mini',
 *       messages,
 *       temperature: 0.7,
 *     }),
 *   })
 *
 *   if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
 *   const data = await res.json()
 *   return data.choices[0].message.content
 * }
 * ============================================================= */
