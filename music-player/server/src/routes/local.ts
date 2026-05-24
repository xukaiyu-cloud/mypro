import { Router, Request, Response } from 'express'
import { readdirSync, statSync } from 'fs'
import { extname, join, basename } from 'path'
import { authMiddleware } from '../middleware/auth'
import { queryAll, execute } from '../db'

const router = Router()
router.use(authMiddleware)

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma'])

interface LocalSong {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverUrl: string
  sourcePlatform: string
  externalLink: string
}

// Scan a folder for audio files, extract metadata from filenames
function scanFolder(dir: string): { filePath: string; title: string }[] {
  const results: { filePath: string; title: string }[] = []
  try {
    function walk(d: string): void {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry)
        let st
        try { st = statSync(full) } catch { continue }
        if (st.isDirectory()) {
          walk(full)
        } else if (AUDIO_EXTS.has(extname(entry).toLowerCase())) {
          const name = basename(entry, extname(entry))
          results.push({ filePath: full, title: name })
        }
      }
    }
    walk(dir)
  } catch { /* permission errors etc */ }
  return results
}

// Extract artist from folder structure: Music/Artist/Album/song.mp3
function guessArtistAlbum(filePath: string, baseDir: string): { artist: string; album: string } {
  const rel = filePath.replace(baseDir, '').replace(/^[\\/]+/, '')
  const parts = rel.split(/[\\/]/)
  // If 2+ levels deep, guess artist=top folder, album=second folder
  if (parts.length >= 2) {
    return { artist: parts[0], album: parts[1] }
  }
  return { artist: '', album: '' }
}

// POST /api/local/scan — scan a folder and return parsed songs
router.post('/scan', (req: Request, res: Response) => {
  try {
    const { folder } = req.body
    if (!folder) {
      res.status(400).json({ code: 400, message: '请提供文件夹路径', data: null })
      return
    }
    const files = scanFolder(folder)
    if (files.length === 0) {
      res.json({ code: 200, message: '未找到音频文件', data: [] })
      return
    }
    const songs: LocalSong[] = files.map((f, i) => {
      const meta = guessArtistAlbum(f.filePath, folder)
      return {
        id: 0,
        title: f.title,
        artist: meta.artist,
        album: meta.album,
        duration: 0,
        filePath: f.filePath,
        coverUrl: '',
        sourcePlatform: 'local',
        externalLink: '',
      }
    })
    res.json({ code: 200, message: `扫描到 ${songs.length} 首歌曲`, data: songs })
  } catch (e) {
    console.error('[local/scan] error:', e)
    res.status(500).json({ code: 500, message: '扫描失败', data: null })
  }
})

// POST /api/local/import — import scanned songs into DB
router.post('/import', (req: Request, res: Response) => {
  try {
    const { songs } = req.body as { songs: LocalSong[] }
    if (!songs || !Array.isArray(songs) || songs.length === 0) {
      res.status(400).json({ code: 400, message: '没有要导入的歌曲', data: null })
      return
    }
    let imported = 0
    for (const s of songs) {
      // Skip duplicates by file_path
      const existing = queryAll(
        'SELECT id FROM song WHERE file_path = ? AND source_platform = ?',
        [s.filePath, 'local']
      )
      if (existing.length > 0) continue
      execute(
        'INSERT INTO song (title, artist, album, duration, file_path, cover_url, source_platform) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.title, s.artist, s.album, s.duration, s.filePath, s.coverUrl, 'local']
      )
      imported++
    }
    res.json({ code: 200, message: `成功导入 ${imported} 首歌曲`, data: { imported } })
  } catch (e) {
    console.error('[local/import] error:', e)
    res.status(500).json({ code: 500, message: '导入失败', data: null })
  }
})

// GET /api/local/songs — get all imported local songs
router.get('/songs', (_req: Request, res: Response) => {
  try {
    const rows = queryAll(
      'SELECT id, title, artist, album, duration, file_path as filePath, cover_url as coverUrl, source_platform as sourcePlatform FROM song WHERE source_platform = ? ORDER BY artist, album, title',
      ['local']
    )
    res.json({ code: 200, message: 'ok', data: rows })
  } catch (e) {
    console.error('[local/songs] error:', e)
    res.status(500).json({ code: 500, message: '获取失败', data: null })
  }
})

export default router