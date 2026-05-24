import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { queryAll, queryOne, execute, run } from '../db'

const router = Router()
router.use(authMiddleware)

const userId = (req: Request) => (req as Request & { userId: number }).userId

// List playlists
router.get('/', (req: Request, res: Response) => {
  try {
    const playlists = queryAll(
      'SELECT * FROM playlist WHERE user_id = ? ORDER BY updated_at DESC',
      [userId(req)]
    )
    const result = playlists.map((pl: Record<string, unknown>) => ({
      id: pl.id,
      userId: pl.user_id,
      name: pl.name,
      description: pl.description,
      sourceType: pl.source_type,
      updatedAt: pl.updated_at,
      songs: [] as Record<string, unknown>[],
    }))
    res.json({ code: 200, message: 'ok', data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Create playlist
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    if (!name) {
      res.status(400).json({ code: 400, message: '歌单名称不能为空', data: null })
      return
    }
    const id = execute(
      'INSERT INTO playlist (user_id, name, description) VALUES (?, ?, ?)',
      [userId(req), name, description || '']
    )
    const pl = queryOne('SELECT * FROM playlist WHERE id = ?', [id]) as Record<string, unknown>
    res.json({
      code: 200, message: '创建成功',
      data: {
        id: pl.id, userId: pl.user_id, name: pl.name, description: pl.description,
        sourceType: pl.source_type, updatedAt: pl.updated_at, songs: [],
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Update playlist
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    const pl = queryOne('SELECT * FROM playlist WHERE id = ? AND user_id = ?', [req.params.id, userId(req)])
    if (!pl) {
      res.status(404).json({ code: 404, message: '歌单不存在', data: null })
      return
    }
    if (name !== undefined) run('UPDATE playlist SET name = ?, updated_at = datetime(\'now\') WHERE id = ?', [name, req.params.id])
    if (description !== undefined) run('UPDATE playlist SET description = ?, updated_at = datetime(\'now\') WHERE id = ?', [description, req.params.id])
    const updated = queryOne('SELECT * FROM playlist WHERE id = ?', [req.params.id]) as Record<string, unknown>
    res.json({
      code: 200, message: '更新成功',
      data: {
        id: updated.id, userId: updated.user_id, name: updated.name, description: updated.description,
        sourceType: updated.source_type, updatedAt: updated.updated_at, songs: [],
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Delete playlist
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const pl = queryOne('SELECT id FROM playlist WHERE id = ? AND user_id = ?', [req.params.id, userId(req)])
    if (!pl) {
      res.status(404).json({ code: 404, message: '歌单不存在', data: null })
      return
    }
    run('DELETE FROM playlist_song WHERE playlist_id = ?', [req.params.id])
    run('DELETE FROM playlist WHERE id = ?', [req.params.id])
    res.json({ code: 200, message: '删除成功', data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Get songs in playlist
router.get('/:id/songs', (req: Request, res: Response) => {
  try {
    const pl = queryOne('SELECT id FROM playlist WHERE id = ? AND user_id = ?', [req.params.id, userId(req)])
    if (!pl) {
      res.status(404).json({ code: 404, message: '歌单不存在', data: null })
      return
    }
    const songs = queryAll(
      `SELECT s.* FROM song s
       INNER JOIN playlist_song ps ON s.id = ps.song_id
       WHERE ps.playlist_id = ?
       ORDER BY ps.sort_order`,
      [req.params.id]
    )
    const result = (songs as Record<string, unknown>[]).map(s => ({
      id: s.id, title: s.title, artist: s.artist, album: s.album,
      duration: s.duration, filePath: s.file_path, coverUrl: s.cover_url,
      sourcePlatform: s.source_platform, externalLink: s.external_link,
    }))
    res.json({ code: 200, message: 'ok', data: result })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Add song to playlist
router.post('/:id/songs', (req: Request, res: Response) => {
  try {
    const pl = queryOne('SELECT id FROM playlist WHERE id = ? AND user_id = ?', [req.params.id, userId(req)])
    if (!pl) {
      res.status(404).json({ code: 404, message: '歌单不存在', data: null })
      return
    }
    const { title, artist, album, duration, filePath, coverUrl, sourcePlatform, externalLink } = req.body
    const songId = execute(
      'INSERT INTO song (title, artist, album, duration, file_path, cover_url, source_platform, external_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, artist || '', album || '', duration || 0, filePath || '', coverUrl || '', sourcePlatform || '', externalLink || '']
    )
    const maxOrder = queryOne<{ m: number }>(
      'SELECT MAX(sort_order) as m FROM playlist_song WHERE playlist_id = ?', [req.params.id]
    )
    execute(
      'INSERT INTO playlist_song (playlist_id, song_id, sort_order) VALUES (?, ?, ?)',
      [req.params.id, songId, (maxOrder?.m ?? 0) + 1]
    )
    run('UPDATE playlist SET updated_at = datetime(\'now\') WHERE id = ?', [req.params.id])
    res.json({ code: 200, message: '添加成功', data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Remove song from playlist
router.delete('/:id/songs/:songId', (req: Request, res: Response) => {
  try {
    run('DELETE FROM playlist_song WHERE playlist_id = ? AND song_id = ?', [req.params.id, req.params.songId])
    run('UPDATE playlist SET updated_at = datetime(\'now\') WHERE id = ?', [req.params.id])
    res.json({ code: 200, message: '移除成功', data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

export default router
