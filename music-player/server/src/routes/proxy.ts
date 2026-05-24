import { Router, Request, Response } from 'express'
import axios from 'axios'

const router = Router()

// Proxy remote images to avoid CORS tainting when extracting colors via Canvas
router.get('/:encodedUrl(*)', async (req: Request, res: Response) => {
  try {
    const url = decodeURIComponent(req.params.encodedUrl)
    if (!url || !/^https?:\/\//.test(url)) {
      res.status(400).end()
      return
    }
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const contentType = resp.headers['content-type'] || 'image/jpeg'
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(resp.data))
  } catch {
    res.status(404).end()
  }
})

export default router