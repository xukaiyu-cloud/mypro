import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import { getRooms } from '../ws'

const router = Router()

router.use(authMiddleware as any)

// GET /api/listen/rooms - List all active rooms
router.get('/rooms', (_req, res) => {
  const list: { roomId: string; hostName: string; memberCount: number }[] = []
  getRooms().forEach((r) => {
    list.push({ roomId: r.roomId, hostName: r.hostName, memberCount: r.members.length })
  })
  res.json({ code: 200, message: 'ok', data: list })
})

// GET /api/listen/rooms/:id - Get room details
router.get('/rooms/:id', (req, res) => {
  const room = getRooms().get(req.params.id)
  if (!room) {
    res.status(404).json({ code: 404, message: '房间不存在', data: null })
    return
  }
  res.json({ code: 200, message: 'ok', data: room })
})

export default router
