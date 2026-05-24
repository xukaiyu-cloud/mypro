import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { queryAll, queryOne, execute, run } from '../db'

const router = Router()
router.use(authMiddleware)

const uid = (req: Request) => (req as Request & { userId: number }).userId

// List friends (including pending requests)
router.get('/list', (req: Request, res: Response) => {
  try {
    const friends = queryAll(
      `SELECT f.id, f.status, f.created_at,
        CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END AS friend_user_id
       FROM friends f
       WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'`,
      [uid(req), uid(req), uid(req)]
    )

    const pending = queryAll(
      `SELECT f.id, f.status, f.created_at, f.user_id AS from_user_id, u.username AS from_username
       FROM friends f
       JOIN user u ON u.id = f.user_id
       WHERE f.friend_id = ? AND f.status = 'pending'`,
      [uid(req)]
    )

    const result = (friends as Record<string, unknown>[]).map(f => {
      const friendId = f.friend_user_id as number
      const friend = queryOne('SELECT id, username, created_at FROM user WHERE id = ?', [friendId]) as Record<string, unknown> | null
      return {
        id: f.id,
        friendId,
        friendName: friend?.username || '未知用户',
        status: f.status,
        createdAt: f.created_at,
      }
    })

    const incoming = pending.map(p => ({
      id: p.id,
      fromUserId: p.from_user_id,
      fromUsername: p.from_username,
      status: p.status,
      createdAt: p.created_at,
    }))

    res.json({ code: 200, message: 'ok', data: { friends: result, incoming } })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Search users by username
router.get('/search', (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim()
    if (!q || q.length < 1) {
      res.json({ code: 200, message: 'ok', data: [] })
      return
    }
    const users = queryAll(
      'SELECT id, username, created_at FROM user WHERE username LIKE ? AND id != ? LIMIT 20',
      [`%${q}%`, uid(req)]
    )
    res.json({ code: 200, message: 'ok', data: users })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Send friend request
router.post('/request', (req: Request, res: Response) => {
  try {
    const { friendId } = req.body
    if (!friendId) {
      res.status(400).json({ code: 400, message: '请指定用户', data: null })
      return
    }
    const target = queryOne('SELECT id FROM user WHERE id = ?', [friendId])
    if (!target) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null })
      return
    }
    // Check existing relationship
    const existing = queryOne(
      `SELECT id FROM friends WHERE
        (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [uid(req), friendId, friendId, uid(req)]
    )
    if (existing) {
      res.status(400).json({ code: 400, message: '已存在好友关系或申请', data: null })
      return
    }
    execute('INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, ?)', [uid(req), friendId, 'pending'])
    res.json({ code: 200, message: '好友申请已发送', data: null })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Accept friend request
router.post('/accept', (req: Request, res: Response) => {
  try {
    const { requestId } = req.body
    const rel = queryOne(
      'SELECT id FROM friends WHERE id = ? AND friend_id = ? AND status = ?',
      [requestId, uid(req), 'pending']
    )
    if (!rel) {
      res.status(404).json({ code: 404, message: '申请不存在或已处理', data: null })
      return
    }
    run('UPDATE friends SET status = ? WHERE id = ?', ['accepted', requestId])
    res.json({ code: 200, message: '已接受好友申请', data: null })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Delete friend relationship
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const rel = queryOne(
      'SELECT id FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)',
      [req.params.id, uid(req), uid(req)]
    )
    if (!rel) {
      res.status(404).json({ code: 404, message: '关系不存在', data: null })
      return
    }
    run('DELETE FROM friends WHERE id = ?', [req.params.id])
    res.json({ code: 200, message: '已删除', data: null })
  } catch {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

export default router
