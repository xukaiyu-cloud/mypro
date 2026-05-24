import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'music-player-dev-secret-key'

export interface JwtPayload {
  userId: number
  username: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '未登录', data: null })
    return
  }
  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    ;(req as Request & { userId: number }).userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ code: 401, message: 'token 已过期', data: null })
  }
}
