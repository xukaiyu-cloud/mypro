import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'

interface SongInfo {
  title: string
  artist: string
  album: string
  coverUrl: string
  duration: number
  sourceUrl: string
  sourcePlatform: string
}

interface Member {
  userId: number
  username: string
  socketId: string
}

interface RoomState {
  roomId: string
  hostId: number
  hostName: string
  members: Member[]
  playlist: SongInfo[]
  currentSong: SongInfo | null
  currentTime: number
  isPlaying: boolean
}

const rooms = new Map<string, RoomState>()
const userSockets = new Map<number, Set<string>>()

let io: Server

function registerUser(userId: number, socketId: string) {
  if (!userSockets.has(userId)) userSockets.set(userId, new Set())
  userSockets.get(userId)!.add(socketId)
}

function unregisterSocket(socketId: string) {
  userSockets.forEach((sockets, userId) => {
    sockets.delete(socketId)
    if (sockets.size === 0) userSockets.delete(userId)
  })
}

function getOnlineFriends(friendIds: number[]): number[] {
  return friendIds.filter(fid => userSockets.has(fid))
}

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'file://'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log(`[WS] connected: ${socket.id}`)

    socket.on('register', (data: { userId: number }) => {
      registerUser(data.userId, socket.id)
      socket.emit('registered')
    })

    // ---- Room lifecycle ----

    socket.on('room:create', (data: { userId: number; username: string }) => {
      const roomId = generateRoomId()
      const state: RoomState = {
        roomId,
        hostId: data.userId,
        hostName: data.username,
        members: [{ userId: data.userId, username: data.username, socketId: socket.id }],
        playlist: [],
        currentSong: null,
        currentTime: 0,
        isPlaying: false,
      }
      rooms.set(roomId, state)
      socket.join(roomId)
      socket.emit('room:created', { roomId, state })
    })

    socket.on('room:join', (data: { roomId: string; userId: number; username: string }) => {
      const room = rooms.get(data.roomId)
      if (!room) { socket.emit('room:error', { message: '房间不存在' }); return }
      if (!room.members.find(m => m.userId === data.userId)) {
        room.members.push({ userId: data.userId, username: data.username, socketId: socket.id })
      }
      socket.join(data.roomId)
      socket.emit('room:joined', { roomId: data.roomId, state: room })
      socket.to(data.roomId).emit('room:memberJoined', { userId: data.userId, username: data.username })
    })

    // ---- Invitations ----

    socket.on('room:invite', (data: { roomId: string; fromUserId: number; fromUsername: string; toUserId: number }) => {
      const room = rooms.get(data.roomId)
      if (!room || room.hostId !== data.fromUserId) return
      const targets = userSockets.get(data.toUserId)
      if (!targets || targets.size === 0) {
        socket.emit('room:inviteResult', { toUserId: data.toUserId, accepted: false, reason: '用户不在线' })
        return
      }
      targets.forEach(sid => {
        io.to(sid).emit('room:invitation', {
          roomId: data.roomId,
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername,
        })
      })
    })

    socket.on('room:inviteResponse', (data: { roomId: string; userId: number; username: string; accepted: boolean }) => {
      const room = rooms.get(data.roomId)
      if (!room) return
      io.to(room.members.find(m => m.userId === room.hostId)?.socketId || '').emit('room:inviteResult', {
        userId: data.userId,
        username: data.username,
        accepted: data.accepted,
        reason: data.accepted ? '已接受邀请' : '婉拒了邀请',
      })
      if (data.accepted) {
        if (!room.members.find(m => m.userId === data.userId)) {
          room.members.push({ userId: data.userId, username: data.username, socketId: socket.id })
        }
        socket.join(data.roomId)
        socket.emit('room:joined', { roomId: data.roomId, state: room })
        socket.to(data.roomId).emit('room:memberJoined', { userId: data.userId, username: data.username })
      }
    })

    // ---- Kick member ----

    socket.on('room:kick', (data: { roomId: string; hostId: number; targetUserId: number }) => {
      const room = rooms.get(data.roomId)
      if (!room || room.hostId !== data.hostId) return
      const member = room.members.find(m => m.userId === data.targetUserId)
      if (!member) return
      room.members = room.members.filter(m => m.userId !== data.targetUserId)
      socket.to(data.roomId).emit('room:memberKicked', { userId: data.targetUserId, username: member.username })
      const targetSocket = io.sockets.sockets.get(member.socketId)
      if (targetSocket) {
        targetSocket.leave(data.roomId)
        targetSocket.emit('room:kicked', { roomId: data.roomId })
      }
    })

    // ---- Sync ----

    socket.on('room:sync', (data: {
      roomId: string; userId: number; song?: SongInfo; currentTime?: number; isPlaying?: boolean
      action: 'play' | 'pause' | 'seek' | 'changeSong'
    }) => {
      const room = rooms.get(data.roomId)
      if (!room || room.hostId !== data.userId) return
      if (data.action === 'changeSong' && data.song) {
        room.currentSong = data.song
        room.currentTime = 0
      }
      if (data.currentTime !== undefined) room.currentTime = data.currentTime
      if (data.isPlaying !== undefined) room.isPlaying = data.isPlaying

      socket.to(data.roomId).emit('room:sync', {
        song: room.currentSong,
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        action: data.action,
      })
    })

    // ---- Chat ----

    socket.on('room:chat', (data: { roomId: string; userId: number; username: string; text: string }) => {
      const room = rooms.get(data.roomId)
      if (!room || !room.members.find(m => m.userId === data.userId)) return
      io.to(data.roomId).emit('room:chat', {
        userId: data.userId,
        username: data.username,
        text: data.text,
        time: new Date().toISOString(),
      })
    })

    // ---- Playlist management ----

    socket.on('room:addSongs', (data: { roomId: string; userId: number; songs: SongInfo[] }) => {
      const room = rooms.get(data.roomId)
      if (!room || room.hostId !== data.userId) return
      room.playlist.push(...data.songs)
      io.to(data.roomId).emit('room:playlistUpdated', { playlist: room.playlist })
    })

    socket.on('room:removeSong', (data: { roomId: string; userId: number; index: number }) => {
      const room = rooms.get(data.roomId)
      if (!room || room.hostId !== data.userId) return
      room.playlist.splice(data.index, 1)
      io.to(data.roomId).emit('room:playlistUpdated', { playlist: room.playlist })
    })

    // ---- Room list & online friends ----

    socket.on('room:list', () => {
      const list: { roomId: string; hostName: string; memberCount: number }[] = []
      rooms.forEach((r) => {
        list.push({ roomId: r.roomId, hostName: r.hostName, memberCount: r.members.length })
      })
      socket.emit('room:list', list)
    })

    socket.on('friends:online', (data: { friendIds: number[] }) => {
      socket.emit('friends:online', getOnlineFriends(data.friendIds))
    })

    // ---- Leave ----

    socket.on('room:leave', (data: { roomId: string; userId: number; username: string }) => {
      handleLeave(socket.id, data.roomId, data.userId, data.username)
    })

    // ---- Disconnect ----

    socket.on('disconnect', () => {
      unregisterSocket(socket.id)
      rooms.forEach((room, roomId) => {
        const member = room.members.find(m => m.socketId === socket.id)
        if (member) handleLeave(socket.id, roomId, member.userId, member.username)
      })
      console.log(`[WS] disconnected: ${socket.id}`)
    })
  })

  console.log('[WS] Socket.IO initialized')
  return io
}

function handleLeave(socketId: string, roomId: string, userId: number, username: string) {
  const room = rooms.get(roomId)
  if (!room) return
  room.members = room.members.filter(m => m.userId !== userId)
  io.to(roomId).emit('room:memberLeft', { userId, username })

  if (room.members.length === 0) {
    rooms.delete(roomId)
    console.log(`[WS] room ${roomId} removed (empty)`)
  } else if (userId === room.hostId) {
    const newHost = room.members[0]
    room.hostId = newHost.userId
    room.hostName = newHost.username
    io.to(roomId).emit('room:hostChanged', { userId: newHost.userId, username: newHost.username })
  }
}

export function getIO(): Server { return io }
export function getRooms(): Map<string, RoomState> { return rooms }

function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}
