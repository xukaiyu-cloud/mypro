import { Router, Request, Response } from 'express'
import axios from 'axios'
import crypto from 'crypto'
import { authMiddleware } from '../middleware/auth'
import { getSongUrl as getNeteaseSongUrl, getLyrics as getNeteaseLyrics, searchSong } from '../services/ncm'
import { getConfig, updateConfig } from '../services/platformConfig'

const router = Router()
router.use(authMiddleware)

function generateKgMid(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let rand = ''
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)]
  return crypto.createHash('md5').update(rand).digest('hex')
}

router.post('/lyrics', async (req: Request, res: Response) => {
  try {
    const { hash, sourcePlatform, title, artist } = req.body
    if (!hash) {
      res.status(400).json({ code: 400, message: '缺少参数', data: null })
      return
    }

    // Netease: direct lookup by song ID
    if (sourcePlatform === 'netease' || !sourcePlatform) {
      const lrc = await getNeteaseLyrics(hash)
      if (lrc) {
        res.json({ code: 200, message: 'ok', data: { lyrics: lrc } })
        return
      }
    }

    // Kugou: cross-platform fallback via Netease search
    if (sourcePlatform === 'kugou' && title && artist) {
      try {
        const results = await searchSong(`${title} ${artist}`, 3)
        for (const song of results) {
          const lrc = await getNeteaseLyrics(song.filePath)
          if (lrc) {
            res.json({ code: 200, message: 'ok', data: { lyrics: lrc } })
            return
          }
        }
      } catch { /* cross-platform lyrics fallback failed */ }
    }

    res.json({ code: 200, message: '未找到歌词', data: { lyrics: '' } })
  } catch {
    res.status(500).json({ code: 500, message: '获取歌词失败', data: null })
  }
})

// Get current platform cookie config
router.get('/config', (_req: Request, res: Response) => {
  const config = getConfig()
  res.json({
    code: 200,
    message: 'ok',
    data: {
      neteaseCookie: config.neteaseCookie ? '***已设置***' : '',
      kugouCookie: config.kugouCookie ? '***已设置***' : '',
      hasNeteaseCookie: !!config.neteaseCookie,
      hasKugouCookie: !!config.kugouCookie,
    },
  })
})

// Update platform cookies
router.put('/config', (req: Request, res: Response) => {
  const { neteaseCookie, kugouCookie } = req.body
  updateConfig({
    neteaseCookie: neteaseCookie ?? undefined,
    kugouCookie: kugouCookie ?? undefined,
  })
  res.json({ code: 200, message: '配置已更新', data: null })
})

router.post('/resolve', async (req: Request, res: Response) => {
  try {
    const { hash, albumId, sourcePlatform, title, artist } = req.body
    if (!hash) {
      res.status(400).json({ code: 400, message: '缺少参数', data: null })
      return
    }

    // Auto-detect: Kugou hashes are 32-char hex, Netease IDs are numeric
    const looksLikeKugou = /^[A-Fa-f0-9]{32}$/.test(hash)
    const platform = sourcePlatform || (looksLikeKugou ? 'kugou' : 'netease')

    if (platform === 'netease') {
      const neteaseUrl = await getNeteaseSongUrl(hash)
      if (neteaseUrl) {
        res.json({ code: 200, message: 'ok', data: { url: neteaseUrl } })
        return
      }
    }

    if (platform === 'kugou') {
      const kgMid = generateKgMid()
      try {
        const params: Record<string, string> = {
          r: 'play/getdata', hash,
          appid: '1014', platid: '4', mid: kgMid,
        }
        if (albumId) params.album_id = albumId

        const userCookie = getConfig().kugouCookie
        const cookieStr = userCookie
          ? `kg_mid=${kgMid}; ${userCookie}`
          : `kg_mid=${kgMid}`

        const { data: webData } = await axios.get('https://wwwapi.kugou.com/yy/index.php', {
          params,
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookieStr,
            'Referer': 'https://www.kugou.com/',
          },
        })
        if (webData?.data?.play_url) {
          res.json({ code: 200, message: 'ok', data: { url: webData.data.play_url } })
          return
        }
      } catch { /* Kugou failed */ }

      // Kugou failed — cross-platform fallback via Netease search
      if (title && artist) {
        const keyword = `${title} ${artist}`
        try {
          const results = await searchSong(keyword, 3)
          for (const song of results) {
            const neteaseUrl = await getNeteaseSongUrl(song.filePath)
            if (neteaseUrl) {
              res.json({ code: 200, message: 'ok', data: { url: neteaseUrl } })
              return
            }
          }
        } catch { /* cross-platform fallback failed */ }
      }
    }

    res.json({ code: 200, message: '无法获取播放链接', data: { url: '' } })
  } catch {
    res.status(500).json({ code: 500, message: '解析播放链接失败', data: null })
  }
})

export default router
