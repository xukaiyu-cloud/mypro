import fs from 'fs'
import path from 'path'
import axios from 'axios'

interface AiConfig {
  aiProvider: string
  aiApiKey: string
  aiBaseUrl: string
  aiModel: string
}

export interface SearchIntent {
  type: 'keyword' | 'artist_rec' | 'genre_mood' | 'history_lookup' | 'playlist_gen'
  keywords: string[]
  artists: string[]
  genres: string[]
  mood: string
  excludeArtists: string[]
  referenceArtists: string[]
  limit: number
  explanation: string
  timeRange?: { start: string; end: string }
}

const CONFIG_PATH = path.join(__dirname, '..', '..', 'ai_config.json')

let config: AiConfig = { aiProvider: 'openai', aiApiKey: '', aiBaseUrl: 'https://api.openai.com/v1', aiModel: 'gpt-4o-mini' }

function load(): AiConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
      config = { ...config, ...JSON.parse(raw) }
    }
  } catch { /* keep defaults */ }
  return config
}

function save(): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8')
  } catch { /* non-critical */ }
}

export function getAiConfig(): AiConfig {
  return { ...config }
}

export function updateAiConfig(partial: Partial<AiConfig>): AiConfig {
  if (partial.aiApiKey !== undefined) config.aiApiKey = partial.aiApiKey
  if (partial.aiBaseUrl !== undefined) config.aiBaseUrl = partial.aiBaseUrl
  if (partial.aiModel !== undefined) config.aiModel = partial.aiModel
  save()
  return { ...config }
}

function buildPrompt(query: string): { system: string; user: string } {
  const system = `你是一个音乐搜索意图解析器。将用户的自然语言搜索转换为结构化 JSON。
严格只输出 JSON，不要输出任何其他内容。

支持的意图类型 (type):
- "keyword"       — 简单关键词搜索
- "artist_rec"    — 基于参考艺人推荐相似风格
- "genre_mood"    — 基于风格/情绪/场景搜索
- "history_lookup"— 查询用户的播放历史
- "playlist_gen"  — 生成一个主题歌单

JSON 格式:
{
  "type": "...",
  "keywords": ["关键词"],
  "artists": ["指定艺人"],
  "genres": ["风格标签"],
  "mood": "情绪/场景",
  "excludeArtists": ["排除的艺人"],
  "referenceArtists": ["参考风格的艺人"],
  "limit": 20,
  "explanation": "一句话中文解释你的搜索策略"
}

规则:
- keywords: 提取可用于歌曲搜索的关键词
- genres: 中文风格标签（中国风、摇滚、电子、民谣、说唱、流行、爵士、古典...）
- mood: 场景/情绪（跑步、睡眠、开车、伤感、开心、安静、热血...）
- explanation: 用中文友好地告诉用户你理解了TA的意图
- 如果用户输入只是简单的歌手/歌名，type 用 "keyword"
- 如果是问句或描述性语言，用相应的 type`

  return { system, user: query }
}

export async function parseIntent(query: string): Promise<SearchIntent> {
  const cfg = getAiConfig()

  // No API key configured — degrade to keyword search
  if (!cfg.aiApiKey) {
    return {
      type: 'keyword',
      keywords: [query],
      artists: [],
      genres: [],
      mood: '',
      excludeArtists: [],
      referenceArtists: [],
      limit: 20,
      explanation: '',
    }
  }

  const { system, user } = buildPrompt(query)

  try {
    const resp = await axios.post(
      `${cfg.aiBaseUrl}/chat/completions`,
      {
        model: cfg.aiModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${cfg.aiApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    )

    const content = resp.data?.choices?.[0]?.message?.content || ''
    const parsed = extractJson(content) as Record<string, unknown> | null
    if (!parsed) throw new Error('Failed to parse LLM response')

    return {
      type: (parsed.type as SearchIntent['type']) || 'keyword',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords as string[] : [query],
      artists: Array.isArray(parsed.artists) ? parsed.artists as string[] : [],
      genres: Array.isArray(parsed.genres) ? parsed.genres as string[] : [],
      mood: typeof parsed.mood === 'string' ? parsed.mood : '',
      excludeArtists: Array.isArray(parsed.excludeArtists) ? parsed.excludeArtists as string[] : [],
      referenceArtists: Array.isArray(parsed.referenceArtists) ? parsed.referenceArtists as string[] : [],
      limit: typeof parsed.limit === 'number' ? parsed.limit : 20,
      explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '',
    }
  } catch {
    // Degrade to keyword search on any failure
    return {
      type: 'keyword',
      keywords: [query],
      artists: [],
      genres: [],
      mood: '',
      excludeArtists: [],
      referenceArtists: [],
      limit: 20,
      explanation: '',
    }
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  // Try direct parse first
  try { return JSON.parse(text) as Record<string, unknown> } catch { /* continue */ }

  // Try to extract JSON block from markdown
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]) as Record<string, unknown> } catch { /* continue */ }
  }

  // Try to find JSON-like structure
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) as Record<string, unknown> } catch { /* continue */ }
  }

  return null
}

// Load on startup
load()
