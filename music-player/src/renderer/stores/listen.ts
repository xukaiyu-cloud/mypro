import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connectSocket, disconnectSocket, getSocket } from '../socket'
import { useAuthStore } from './auth'
import { usePlayerStore } from './player'
import { songInfoToSong } from '../utils/song'

export interface SongInfo {
  title: string
  artist: string
  album: string
  coverUrl: string
  duration: number
  sourceUrl: string
  sourcePlatform: string
  lyrics?: string
}

export interface RoomMember {
  userId: number
  username: string
  socketId: string
}

export interface RoomState {
  roomId: string
  hostId: number
  hostName: string
  members: RoomMember[]
  playlist: SongInfo[]
  currentSong: SongInfo | null
  currentTime: number
  isPlaying: boolean
}

export interface Invitation {
  roomId: string
  fromUserId: number
  fromUsername: string
}

export interface ChatMessage {
  userId: number
  username: string
  text: string
  time: string
}

export const useListenStore = defineStore('listen', () => {
  const connected = ref(false)
  const currentRoom = ref<RoomState | null>(null)
  const remoteSyncInProgress = ref(false)
  const pendingInvitation = ref<Invitation | null>(null)
  const onlineFriendIds = ref<number[]>([])

  const isHost = computed(() =>
    currentRoom.value ? currentRoom.value.hostId === useAuthStore().userInfo?.id : false
  )
  const messages = ref<ChatMessage[]>([])
  const activeRooms = ref<{ roomId: string; hostName: string; memberCount: number }[]>([])

  function connect() {
    const socket = connectSocket()
    const user = useAuthStore().userInfo
    if (!user) return

    socket.on('connect', () => {
      connected.value = true
      socket.emit('register', { userId: user.id })
    })

    // Re-register on reconnect
    socket.on('registered', () => {})

    socket.on('room:created', (data: { roomId: string; state: RoomState }) => {
      currentRoom.value = data.state
    })

    socket.on('room:joined', (data: { roomId: string; state: RoomState }) => {
      currentRoom.value = data.state
      // Non-host: auto-play the current room song to drive lyrics and local audio
      if (data.state.currentSong && data.state.hostId !== user.id) {
        const player = usePlayerStore()
        player.play(songInfoToSong(data.state.currentSong))
        player.seekTo(data.state.currentTime)
        if (!data.state.isPlaying) player.pause()
      }
    })

    socket.on('room:memberJoined', (data: { userId: number; username: string }) => {
      if (!currentRoom.value) return
      if (!currentRoom.value.members.find(m => m.userId === data.userId)) {
        currentRoom.value.members.push({ userId: data.userId, username: data.username, socketId: '' })
      }
    })

    socket.on('room:memberLeft', (data: { userId: number; username: string }) => {
      if (!currentRoom.value) return
      currentRoom.value.members = currentRoom.value.members.filter(m => m.userId !== data.userId)
    })

    socket.on('room:memberKicked', (data: { userId: number; username: string }) => {
      if (!currentRoom.value) return
      currentRoom.value.members = currentRoom.value.members.filter(m => m.userId !== data.userId)
    })

    socket.on('room:kicked', (data: { roomId: string }) => {
      currentRoom.value = null
      ElMessage.warning('你已被房主移出房间')
    })

    socket.on('room:hostChanged', (data: { userId: number; username: string }) => {
      if (!currentRoom.value) return
      currentRoom.value.hostId = data.userId
      currentRoom.value.hostName = data.username
    })

    // ---- Invitation ----

    socket.on('room:invitation', (data: Invitation) => {
      pendingInvitation.value = data
      ElMessageBox.confirm(
        `${data.fromUsername} 邀请你加入协同听歌房间`,
        '协同听歌邀请',
        { confirmButtonText: '接受', cancelButtonText: '婉拒', type: 'info' }
      ).then(() => {
        respondToInvite(true)
      }).catch(() => {
        respondToInvite(false)
      })
    })

    socket.on('room:inviteResult', (data: { userId: number; username: string; accepted: boolean; reason: string }) => {
      if (data.accepted) {
        ElMessage.success(`${data.username} ${data.reason}`)
      } else {
        ElMessage.info(`${data.username} ${data.reason}`)
      }
    })

    // ---- Sync ----

    socket.on('room:sync', async (data: {
      song: RoomState['currentSong']
      currentTime: number
      isPlaying: boolean
      action: 'play' | 'pause' | 'seek' | 'changeSong'
    }) => {
      if (!currentRoom.value) return
      remoteSyncInProgress.value = true
      if (data.song) currentRoom.value.currentSong = data.song
      currentRoom.value.currentTime = data.currentTime
      currentRoom.value.isPlaying = data.isPlaying

      const player = usePlayerStore()

      if (data.action === 'changeSong' && data.song) {
        player.play(songInfoToSong(data.song))
        player.seekTo(0)
      } else if (data.action === 'pause') {
        player.pause()
        player.seekTo(data.currentTime)
      } else if (data.action === 'play') {
        player.resume()
        player.seekTo(data.currentTime)
      } else if (data.action === 'seek') {
        player.seekTo(data.currentTime)
      }
      setTimeout(() => { remoteSyncInProgress.value = false }, 100)
    })

    // ---- Chat ----

    socket.on('room:chat', (msg: ChatMessage) => {
      messages.value.push(msg)
    })

    // ---- Playlist ----

    socket.on('room:playlistUpdated', (data: { playlist: SongInfo[] }) => {
      if (!currentRoom.value) return
      currentRoom.value.playlist = data.playlist
    })

    // ---- Room list & online friends ----

    socket.on('room:list', (list: { roomId: string; hostName: string; memberCount: number }[]) => {
      activeRooms.value = list
    })

    socket.on('friends:online', (ids: number[]) => {
      onlineFriendIds.value = ids
    })

    socket.on('room:error', (data: { message: string }) => {
      ElMessage.error(data.message)
    })

    socket.connect()
  }

  function disconnect() {
    disconnectSocket()
    connected.value = false
    currentRoom.value = null
  }

  // ---- Actions ----

  function createRoom() {
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:create', { userId: user.id, username: user.username })
  }

  function joinRoom(roomId: string) {
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:join', { roomId, userId: user.id, username: user.username })
  }

  function leaveRoom() {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:leave', { roomId: currentRoom.value.roomId, userId: user.id, username: user.username })
    currentRoom.value = null
    messages.value = []
  }

  function sendMessage(text: string) {
    if (!currentRoom.value || !text.trim()) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:chat', { roomId: currentRoom.value.roomId, userId: user.id, username: user.username, text: text.trim() })
  }

  function inviteFriend(toUserId: number) {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:invite', {
      roomId: currentRoom.value.roomId,
      fromUserId: user.id,
      fromUsername: user.username,
      toUserId,
    })
  }

  function respondToInvite(accepted: boolean) {
    const inv = pendingInvitation.value
    pendingInvitation.value = null
    if (!inv) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:inviteResponse', {
      roomId: inv.roomId,
      userId: user.id,
      username: user.username,
      accepted,
    })
  }

  function kickMember(targetUserId: number) {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:kick', { roomId: currentRoom.value.roomId, hostId: user.id, targetUserId })
  }

  function addSongsToRoom(songs: SongInfo[]) {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:addSongs', { roomId: currentRoom.value.roomId, userId: user.id, songs })
  }

  function removeSongFromRoom(index: number) {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:removeSong', { roomId: currentRoom.value.roomId, userId: user.id, index })
  }

  function syncToRoom(action: 'play' | 'pause' | 'seek' | 'changeSong') {
    if (!currentRoom.value || !isHost.value) return
    getSocket().emit('room:sync', {
      roomId: currentRoom.value.roomId,
      userId: useAuthStore().userInfo?.id,
      song: currentRoom.value.currentSong,
      currentTime: currentRoom.value.currentTime,
      isPlaying: currentRoom.value.isPlaying,
      action,
    })
  }

  function updateRoomSong(song: RoomState['currentSong'], currentTime = 0) {
    if (!currentRoom.value) return
    currentRoom.value.currentSong = song
    currentRoom.value.currentTime = currentTime
    currentRoom.value.isPlaying = true
  }

  function setRoomPlayback(isPlaying: boolean, currentTime: number) {
    if (!currentRoom.value) return
    currentRoom.value.isPlaying = isPlaying
    currentRoom.value.currentTime = currentTime
  }

  function fetchRoomList() {
    getSocket().emit('room:list')
  }

  function checkOnlineFriends(friendIds: number[]) {
    getSocket().emit('friends:online', { friendIds })
  }

  return {
    connected, currentRoom, isHost, remoteSyncInProgress, pendingInvitation, onlineFriendIds, activeRooms, messages,
    connect, disconnect,
    createRoom, joinRoom, leaveRoom,
    inviteFriend, respondToInvite, kickMember,
    addSongsToRoom, removeSongFromRoom,
    syncToRoom, updateRoomSong, setRoomPlayback, sendMessage,
    fetchRoomList, checkOnlineFriends,
  }
})
