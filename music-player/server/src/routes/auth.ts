import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { queryOne, execute } from '../db'
import { signToken, authMiddleware } from '../middleware/auth'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body
    if (!username || !email || !password) {
      res.status(400).json({ code: 400, message: '请填写完整信息', data: null })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ code: 400, message: '密码至少6位', data: null })
      return
    }
    const existing = queryOne('SELECT id FROM user WHERE username = ?', [username])
    if (existing) {
      res.status(409).json({ code: 409, message: '用户名已存在', data: null })
      return
    }
    const hashed = await bcrypt.hash(password, 10)
    execute('INSERT INTO user (username, email, password) VALUES (?, ?, ?)', [username, email, hashed])
    res.json({ code: 200, message: '注册成功', data: null })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    const user = queryOne<{ id: number; username: string; password: string; email: string; created_at: string }>(
      'SELECT * FROM user WHERE username = ?', [username]
    )
    if (!user) {
      res.status(401).json({ code: 401, message: '用户名或密码错误', data: null })
      return
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      res.status(401).json({ code: 401, message: '用户名或密码错误', data: null })
      return
    }
    const token = signToken({ userId: user.id, username: user.username })
    res.json({
      code: 200, message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: (user as any).avatar || '', createdAt: user.created_at },
      },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

router.post('/logout', authMiddleware, (_req: Request, res: Response) => {
  res.json({ code: 200, message: '已退出', data: null })
})

router.get('/user/profile', authMiddleware, (req: Request, res: Response) => {
  try {
    const user = queryOne<{ id: number; username: string; email: string; created_at: string }>(
      'SELECT id, username, email, avatar, created_at FROM user WHERE id = ?',
      [(req as Request & { userId: number }).userId]
    )
    if (!user) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null })
      return
    }
    res.json({
      code: 200, message: 'ok',
      data: { id: user.id, username: user.username, email: user.email, avatar: (user as any).avatar || '', createdAt: user.created_at },
    })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

// Upload avatar (base64)
router.post('/user/avatar', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { avatar } = req.body
    if (!avatar || typeof avatar !== 'string') {
      res.status(400).json({ code: 400, message: '请提供头像数据', data: null })
      return
    }
    const userId = (req as Request & { userId: number }).userId
    execute('UPDATE user SET avatar = ? WHERE id = ?', [avatar, userId])
    res.json({ code: 200, message: '头像更新成功', data: { avatar } })
  } catch (e) {
    res.status(500).json({ code: 500, message: '服务器错误', data: null })
  }
})

export default router
