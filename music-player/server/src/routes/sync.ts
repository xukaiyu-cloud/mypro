import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { queryAll, queryOne, execute, run } from '../db'

const router = Router()
router.use(authMiddleware)

const userId = (req: Request) => (req as Request & { userId: number }).userId

// Upload local playlists to cloud
router.post('/upload', (req: Request, res: Response) => {
  try {
    const { playlists } = req.body as {
      playlists?: { name: string; description: string; songs: { title: string; artist: string; album: string; duration: number; filePath?: string; coverUrl?: string; sourcePlatform?: string; externalLink?: string; albumId?: string }[] }[]
    }
    if (!playlists || !Array.isArray(playlists)) {
      res.status(400).json({ code: 400, message: '无效数据', data: null })
      return
    }
    let uploaded = 0
    for (const pl of playlists) {
      // Check if playlist with same name already exists
      const existing = queryOne(
        'SELECT id FROM playlist WHERE user_id = ? AND name = ?',
        [userId(req), pl.name]
      )
      let playlistId: number
      if (existing) {
        playlistId = existing.id as number
        run('UPDATE playlist SET updated_at = datetime(\'now\') WHERE id = ?', [playlistId])
        // Clear old song associations before re-inserting
        run('DELETE FROM playlist_song WHERE playlist_id = ?', [playlistId])
      } else {
        playlistId = execute(
          'INSERT INTO playlist (user_id, name, description) VALUES (?, ?, ?)',
          [userId(req), pl.name, pl.description || '']
        )
      }
      for (const song of pl.songs || []) {
        const songId = execute(
          'INSERT INTO song (title, artist, album, duration, file_path, cover_url, source_platform, external_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [song.title, song.artist || '', song.album || '', song.duration || 0, song.filePath || '', song.coverUrl || '', song.sourcePlatform || '', song.externalLink || '']
        )
        const maxOrder = queryOne<{ m: number }>(
          'SELECT MAX(sort_order) as m FROM playlist_song WHERE playlist_id = ?', [playlistId]
        )
        execute(
          'INSERT INTO playlist_song (playlist_id, song_id, sort_order) VALUES (?, ?, ?)',
          [playlistId, songId, (maxOrder?.m ?? 0) + 1]
        )
      }
      uploaded++
    }
    res.json({ code: 200, message: `成功上传 ${uploaded} 个歌单`, data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Download cloud playlists
router.get('/download', (req: Request, res: Response) => {
  try {
    const playlists = queryAll(
      'SELECT * FROM playlist WHERE user_id = ? ORDER BY updated_at DESC',
      [userId(req)]
    )
    const result = playlists.map((pl: Record<string, unknown>) => {
      const songs = queryAll(
        `SELECT s.* FROM song s
         INNER JOIN playlist_song ps ON s.id = ps.song_id
         WHERE ps.playlist_id = ?
         ORDER BY ps.sort_order`,
        [pl.id]
      )
      return {
        id: pl.id, userId: pl.user_id, name: pl.name, description: pl.description,
        sourceType: pl.source_type, updatedAt: pl.updated_at,
        songs: (songs as Record<string, unknown>[]).map(s => ({
          id: s.id, title: s.title, artist: s.artist, album: s.album,
          duration: s.duration, filePath: s.file_path, coverUrl: s.cover_url,
          sourcePlatform: s.source_platform, externalLink: s.external_link,
        })),
      }
    })
    res.json({ code: 200, message: 'ok', data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Merge conflicts
router.post('/merge', (req: Request, res: Response) => {
  try {
    const { conflicts } = req.body as { conflicts?: Record<string, 'local' | 'cloud'> }
    if (!conflicts) {
      res.status(400).json({ code: 400, message: '无效数据', data: null })
      return
    }
    for (const [playlistId, choice] of Object.entries(conflicts)) {
      if (choice === 'cloud') {
        // Keep cloud version (already in DB), record the resolution
        run('UPDATE playlist SET updated_at = datetime(\'now\') WHERE id = ?', [playlistId])
      }
      // For 'local' choice, cloud version is already correct
    }
    res.json({ code: 200, message: '合并成功', data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

export default router
