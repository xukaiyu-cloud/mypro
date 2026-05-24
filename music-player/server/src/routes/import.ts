import { Router, Request, Response } from 'express'
import multer from 'multer'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { authMiddleware } from '../middleware/auth'
import { getPlaylistSongs } from '../services/ncm'

const router = Router()
router.use(authMiddleware)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/file', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ code: 400, message: '请上传文件', data: null })
      return
    }
    const text = req.file.buffer.toString('utf-8')
    const songs = parseText(text)
    res.json({ code: 200, message: `解析成功，共 ${songs.length} 首`, data: songs })
  } catch {
    res.status(500).json({ code: 500, message: '解析文件失败', data: null })
  }
})

router.post('/link', async (req: Request, res: Response) => {
  try {
    const { url, platform } = req.body
    if (!url) {
      res.status(400).json({ code: 400, message: '请提供链接', data: null })
      return
    }

    // Extract URL from share text that may contain extra text
    const urlMatch = url.match(/https?:\/\/[^\s]+/)
    const cleanUrl = urlMatch ? urlMatch[0] : url
    const platformHint = platform && platform !== 'auto' && platform !== 'other' ? platform : null
    const detectedPlatform = platformHint || detectPlatform(cleanUrl)

    let songs: Record<string, string | number>[] = []

    if (detectedPlatform === 'kugou') {
      songs = await resolveKugou(cleanUrl)
    } else if (detectedPlatform === 'netease') {
      songs = await resolveNetease(cleanUrl)
    } else {
      // Fallback: try HTML parsing for unknown platforms
      const html = await fetchPage(cleanUrl)
      songs = parseLinkHtml(html, detectedPlatform)
    }

    if (songs.length === 0) {
      res.status(400).json({
        code: 400,
        message: '未能从链接中解析到歌曲，请将歌单内容复制后使用"粘贴文本"方式导入',
        data: [],
      })
      return
    }
    res.json({ code: 200, message: `解析成功，共 ${songs.length} 首`, data: songs })
  } catch (e: unknown) {
    const msg = (e as { message?: string }).message || ''
    if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      res.status(400).json({ code: 400, message: '无法访问该链接', data: null })
    } else {
      res.status(400).json({
        code: 400,
        message: `链接解析失败，请将歌单内容复制后使用"粘贴文本"方式导入`,
        data: [],
      })
    }
  }
})

router.post('/text', (req: Request, res: Response) => {
  try {
    const { text } = req.body
    if (!text || !text.trim()) {
      res.status(400).json({ code: 400, message: '请提供文本内容', data: null })
      return
    }
    const songs = parseText(text)
    if (songs.length === 0) {
      res.status(400).json({ code: 400, message: '未识别到歌曲，请检查格式：歌名 - 歌手 - 专辑', data: [] })
      return
    }
    res.json({ code: 200, message: `解析成功，共 ${songs.length} 首`, data: songs })
  } catch {
    res.status(500).json({ code: 500, message: '解析文本失败', data: null })
  }
})

// --- Platform detection ---

function detectPlatform(url: string): string | null {
  const host = (() => { try { return new URL(url).hostname } catch { return url } })()
  if (/kugou\.com/.test(host)) return 'kugou'
  if (/music\.163\.com|163\.cn/.test(host)) return 'netease'
  if (/qq\.com.*music|y\.qq\.com/.test(host)) return 'qq'
  return null
}

// --- Kugou resolver (JSON API) ---

async function resolveKugou(url: string): Promise<Record<string, string | number>[]> {
  let specialId = extractKugouId(url)

  // Resolve short links via Kugou share chain API
  if (!specialId) {
    specialId = await resolveKugouShortLink(url)
  }

  if (!specialId) return []

  // Call Kugou mobile playlist API (must use mobile UA, desktop UA gets HTML redirect)
  return fetchPlaylistSongs(specialId)
}

async function resolveKugouShortLink(url: string): Promise<string | null> {
  // Extract chain id from URL
  let chainId: string | null = null

  // Pattern 1: Direct short link like t1.kugou.com/song.html?id=XXXX
  const chainMatch = url.match(/[?&]id=([a-zA-Z0-9]+)/)
  if (chainMatch) chainId = chainMatch[1]

  // Pattern 2: Share page URL like share/song.html?chain=XXXX
  if (!chainId) {
    const shareMatch = url.match(/[?&]chain=([a-zA-Z0-9]+)/)
    if (shareMatch) chainId = shareMatch[1]
  }

  if (!chainId) return null

  try {
    // Call Kugou share chain transfer API
    const { data } = await axios.get(`https://m3ws.kugou.com/schain/transfer`, {
      params: { chain: chainId },
      timeout: 10000,
      headers: mobileHeaders,
    })

    const info = data?.info
    if (!info) return null

    // share_type: "special" = playlist, "album" = album, "rank" = chart
    if (info.share_type === 'special' || info.share_type === 'rank' || info.share_type === 'album') {
      return String(info.id || '')
    }
    return null
  } catch {
    return null
  }
}

async function fetchPlaylistSongs(specialId: string): Promise<Record<string, string | number>[]> {
  // Use mobilecdn API which supports proper pagination (plist/list only returns first 10)
  const apiUrl = `http://mobilecdn.kugou.com/api/v3/special/song`
  const { data } = await axios.get(apiUrl, {
    params: { specialid: specialId, page: 1, pagesize: 200, format: 'json' },
    timeout: 10000,
    headers: mobileHeaders,
  })

  const info = (data as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  const songs = info?.info as Record<string, unknown>[] | undefined

  if (!songs || !Array.isArray(songs)) return []

  const baseId = Date.now()
  return songs.map((item, index) => {
    const filename = String(item.filename || '')
    const dashParts = filename.split(/\s*[-–—]\s*/)
    let title: string, artist: string
    if (dashParts.length >= 2) {
      artist = dashParts[0].trim()
      title = dashParts.slice(1).join(' - ').trim()
    } else {
      title = filename.trim()
      artist = ''
    }

    const coverTpl = String((item.trans_param as Record<string, unknown> | null)?.union_cover || '')
    const coverUrl = coverTpl.replace('{size}', '400')

    return {
      id: baseId + index,
      title: title || '未知歌曲',
      artist: artist || '未知歌手',
      album: String((item.trans_param as Record<string, unknown> | null)?.language || '') || '未知专辑',
      duration: Number(item.duration) || 240,
      filePath: String(item.hash || ''),
      coverUrl,
      albumId: String(item.album_id || ''),
      sourcePlatform: 'kugou',
    }
  })
}

// --- Netease resolver (weapi) ---

async function resolveNetease(url: string): Promise<Record<string, string | number>[]> {
  const id = extractNeteaseId(url)
  if (!id) return []

  const songs = await getPlaylistSongs(id)
  if (!songs) return []

  return songs.map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    filePath: s.filePath,
    coverUrl: s.coverUrl,
    albumId: s.albumId,
    sourcePlatform: 'netease',
  }))
}

function extractNeteaseId(url: string): string | null {
  // Patterns: playlist?id=xxx, #/playlist?id=xxx, 163cn.tv short links
  const match = url.match(/[?&]id=(\d+)/)
  if (match) return match[1]
  const pathMatch = url.match(/playlist\/(\d+)/)
  if (pathMatch) return pathMatch[1]
  return null
}

function extractKugouId(url: string): string | null {
  // Patterns: songlist/{id}, plist/list/{id}, mixsong/{id}.html, plist/id/{id}
  const patterns = [
    /songlist\/([a-zA-Z0-9]+)/,
    /plist\/list\/([a-zA-Z0-9]+)/,
    /plist\/id\/([a-zA-Z0-9]+)/,
    /mixsong\/([a-zA-Z0-9]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// --- HTTP helpers ---

const mobileHeaders = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

const fetchHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9',
}

async function fetchPage(url: string): Promise<string> {
  const { data } = await axios.get(url, {
    timeout: 10000,
    headers: fetchHeaders,
    maxRedirects: 3,
  })
  return typeof data === 'string' ? data : String(data)
}

// --- HTML fallback parser (for non-Kugou platforms or as last resort) ---

function parseLinkHtml(html: string, _platform: string): Record<string, string | number>[] {
  const $ = cheerio.load(html)
  const songs: Record<string, string | number>[] = []

  // Strategy 1: JSON data in script tags
  $('script').each((_, el) => {
    const text = $(el).html() || ''
    if (songs.length > 0) return

    const jsonPatterns = [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
      /window\.pageData\s*=\s*({[\s\S]*?});/,
      /window\.__DATA__\s*=\s*({[\s\S]*?});/,
      /"songList"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"list"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
      /"songlist"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
    ]

    for (const pattern of jsonPatterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          const data = JSON.parse(match[1])
          const list = Array.isArray(data) ? data : (data.songList || data.list || data.songlist || data.songs || data.data?.songList || [])
          if (Array.isArray(list)) {
            for (const item of list) {
              const song = extractSong(item)
              if (song.title) songs.push(song)
            }
          }
          if (songs.length > 0) return
        } catch { /* JSON parse failed, try next pattern */ }
      }
    }
  })

  // Strategy 2: HTML song elements
  if (songs.length === 0) {
    $('.song_item, .song-item, .songItem, .music-item, tr.song').each((_, el) => {
      const $el = $(el)
      const song = {
        id: songs.length + 1,
        title: $el.find('.song_name, .song-name, .songname, .title, [class*="title"]').first().text().trim(),
        artist: $el.find('.singer, .artist, .author, [class*="singer"], [class*="artist"]').first().text().trim(),
        album: $el.find('.album, [class*="album"]').first().text().trim(),
        duration: 240,
        filePath: '',
        coverUrl: '',
      }
      if (song.title) songs.push(song)
    })
  }

  // Strategy 3: Text extraction fallback
  if (songs.length === 0) {
    const bodyText = $('body').text()
    const lines = bodyText.split(/\n/).map(l => l.trim()).filter(l => {
      return /[-–—]/.test(l) && l.length < 200 && !/html|script|style|function|window\./i.test(l)
    })
    if (lines.length >= 2) {
      return parseText(lines.join('\n'))
    }
  }

  return songs
}

function extractSong(item: Record<string, unknown>): Record<string, string | number> {
  const title = String(
    item.title || item.name || item.songName || item.songname || item.song_name || item.SongName || ''
  )
  const artist = String(
    item.artist || item.singer || item.author || item.Artist || item.Singer || item.singerName || item.singer_name || ''
  )
  const album = String(item.album || item.Album || item.albumName || item.album_name || '')
  const duration = Number(item.duration || item.time || item.Duration || item.length) || 240

  return {
    id: 0,
    title: title.trim(),
    artist: artist.trim() || '未知歌手',
    album: album.trim() || '未知专辑',
    duration: Math.round(duration),
    filePath: '',
    coverUrl: '',
  }
}

// --- Text parser ---

function parseText(raw: string): Record<string, string | number>[] {
  const lines = raw.split(/\r?\n/).filter(l => l.trim())
  const songs: Record<string, string | number>[] = []
  const baseId = Date.now()

  for (const line of lines) {
    let title = ''
    let artist = ''
    let album = ''
    let duration = 0

    const csvParts = line.split(',').map(s => s.trim())
    if (csvParts.length >= 3) {
      title = csvParts[0]
      artist = csvParts[1]
      album = csvParts[2]
      if (csvParts.length >= 4) {
        const d = parseFloat(csvParts[3])
        if (!isNaN(d)) duration = Math.round(d)
      }
    } else {
      const dashParts = line.split(/\s*[-–—]\s*/)
      title = dashParts[0]?.trim() || line.trim()
      artist = dashParts[1]?.trim() || ''
      album = dashParts[2]?.trim() || ''
      const durationMatch = album.match(/[,，]\s*(\d+)\s*$/)
      if (durationMatch) {
        album = album.slice(0, durationMatch.index).trim()
        duration = parseInt(durationMatch[1])
      }
    }

    songs.push({
      id: baseId + songs.length,
      title: title || line.trim(),
      artist: artist || '未知歌手',
      album: album || '未知专辑',
      duration: duration || 240,
      filePath: '',
      coverUrl: '',
    })
  }
  return songs
}

export default router
