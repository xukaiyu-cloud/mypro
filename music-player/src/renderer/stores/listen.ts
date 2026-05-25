import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { connectSocket, disconnectSocket, getSocket } from '../socket'
import { useAuthStore } from './auth'
import { usePlayerStore } from './player'
import { songInfoToSong, songToSongInfo } from '../utils/song'
import { getAudio } from '../composables/useAudio'

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
// Saved playback state for members before they joined a room
interface SavedPlaybackState {
  song: SongInfo | null
  playlist: SongInfo[]
  playlistIndex: number
  currentTime: number
  isPlaying: boolean
}

const savedPlayback = ref<SavedPlaybackState | null>(null)
// ---- WebRTC broadcast state ----
const isBroadcasting = ref(false)
const viewerConnections = new Map<string, RTCPeerConnection>()
  const pendingViewers = new Set<string>()
const MAX_CHAT_MESSAGES = 200
const MAX_DANMAKU_MESSAGES = 100

const hostConnection = ref<RTCPeerConnection | null>(null)
const mediaStream = ref<MediaStream | null>(null)
const viewerAudioEl = ref<HTMLAudioElement | null>(null)

  const isHost = computed(() =>
    currentRoom.value ? currentRoom.value.hostId === useAuthStore().userInfo?.id : false
  )
  const messages = ref<ChatMessage[]>([])
  const danmakuMessages = ref<{ username: string; text: string }[]>([])
  const activeRooms = ref<{ roomId: string; hostName: string; memberCount: number }[]>([])

  function connect() {
    const socket = connectSocket()
    const user = useAuthStore().userInfo
    if (!user) return

    // Remove all previous room listeners to prevent duplicate message handling
    socket.off('connect')
    socket.off('registered')
    socket.off('room:created')
    socket.off('room:joined')
    socket.off('room:memberJoined')
    socket.off('room:memberLeft')
    socket.off('room:memberKicked')
    socket.off('room:kicked')
    socket.off('room:hostChanged')
    socket.off('room:invitation')
    socket.off('room:inviteResult')
    socket.off('room:sync')
    socket.off('room:chat')
    socket.off('room:playlistUpdated')
    socket.off('room:list')
    socket.off('friends:online')
    socket.off('room:error'); socket.off('room:danmaku'); socket.off('room:like'); socket.off('broadcast:start'); socket.off('broadcast:stop'); socket.off('broadcast:offer'); socket.off('broadcast:answer'); socket.off('broadcast:ice'); socket.off('broadcast:join'); socket.off('force_logout')

    socket.on('connect', () => {
      connected.value = true
      socket.emit('register', { userId: user.id })
    })

    // Re-register on reconnect
    socket.on('registered', () => {})

    socket.on('room:created', (data: { roomId: string; state: RoomState }) => {
      currentRoom.value = data.state
      isBroadcasting.value = false
      // Auto-start broadcast for the host
      startBroadcast()
    })

    socket.on('room:joined', (data: { roomId: string; state: RoomState }) => {
      currentRoom.value = data.state
      isBroadcasting.value = data.state.isBroadcasting || false
      // Non-host member: save current playback state and stop local playback
      if (data.state.hostId !== user.id) {
        const player = usePlayerStore()
        savedPlayback.value = {
          song: player.currentSong ? songToSongInfo(player.currentSong) : null,
          playlist: player.playlist.map(s => songToSongInfo(s)),
          playlistIndex: player.currentIndex,
          currentTime: player.currentTime,
          isPlaying: player.isPlaying,
        }
        player.pause()
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
      restoreSavedPlayback()
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

    socket.on('room:sync', (data: {
      song: RoomState['currentSong']
      currentTime: number
      isPlaying: boolean
      action: 'play' | 'pause' | 'seek' | 'changeSong'
    }) => {
      if (!currentRoom.value) return
      // Update room state for UI display only, do NOT control member's local player
      if (data.song) currentRoom.value.currentSong = data.song
      currentRoom.value.currentTime = data.currentTime
      currentRoom.value.isPlaying = data.isPlaying

      // Only the host's own player is driven by their local player store,
      // not by the sync events. Members just observe the room state.
    })

    // ---- Chat ----

    socket.on('room:chat', (msg: ChatMessage) => {
      messages.value.push(msg)
      if (messages.value.length > MAX_CHAT_MESSAGES) messages.value = messages.value.slice(-MAX_CHAT_MESSAGES)
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

    // ---- WebRTC signaling (host receives) ----
    socket.on('broadcast:join', async (data: { viewerSocketId: string }) => {
      if (!isBroadcasting.value) return
      await createOfferForViewer(data.viewerSocketId)
    })

    socket.on('broadcast:answer', async (data: { viewerSocketId: string; sdp: unknown }) => {
      const pc = viewerConnections.get(data.viewerSocketId)
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp as RTCSessionDescriptionInit))
      }
    })

    socket.on('broadcast:ice', async (data: { fromSocketId: string; candidate: unknown }) => {
      const vpc = viewerConnections.get(data.fromSocketId)
      if (vpc) {
        await vpc.addIceCandidate(new RTCIceCandidate(data.candidate as RTCIceCandidateInit))
      }
      if (hostConnection.value) {
        try {
          await hostConnection.value.addIceCandidate(new RTCIceCandidate(data.candidate as RTCIceCandidateInit))
        } catch {}
      }
    })

    // ---- WebRTC signaling (viewer receives) ----
    socket.on('broadcast:start', () => {
      isBroadcasting.value = true
    })

    socket.on('broadcast:stop', () => {
      isBroadcasting.value = false
      leaveHostBroadcast()
    })

    socket.on('broadcast:offer', async (data: { hostSocketId: string; sdp: unknown }) => {
      if (isHost.value || !currentRoom.value) return
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        })
        hostConnection.value = pc

        pc.ontrack = (event) => {
          console.log('[broadcast] ontrack fired, streams:', event.streams.length)
          if (event.streams[0]) {
            const audio = new Audio()
            audio.srcObject = event.streams[0]
            audio.volume = 1.0
            viewerAudioEl.value = audio
            // Autoplay may be blocked; retry on user interaction
            audio.play().then(() => {
              console.log('[broadcast] viewer audio playing')
            }).catch((e) => {
              console.warn('[broadcast] autoplay blocked, will retry on next user gesture:', e.name)
              // Set up one-time click handler on document to unlock audio
              const unlock = () => {
                audio.play().then(() => {
                  console.log('[broadcast] viewer audio unlocked via user gesture')
                }).catch(() => {})
                document.removeEventListener('click', unlock)
              }
              document.addEventListener('click', unlock, { once: true })
            })
          } else {
            console.warn('[broadcast] ontrack: no stream in event')
          }
        }

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            getSocket().emit('broadcast:ice', {
              roomId: currentRoom.value!.roomId,
              targetSocketId: data.hostSocketId,
              candidate: e.candidate,
            })
          }
        }

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            hostConnection.value = null
            pc.close()
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp as RTCSessionDescriptionInit))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        getSocket().emit('broadcast:answer', {
          roomId: currentRoom.value.roomId,
          hostSocketId: data.hostSocketId,
          sdp: pc.localDescription,
        })
      } catch (e) {
        console.error('Failed to handle broadcast offer:', e)
      }
    })

    // ---- Danmaku ----
    socket.on('room:danmaku', (data: { username: string; text: string }) => {
      danmakuMessages.value.push({ username: data.username, text: data.text })
      if (danmakuMessages.value.length > MAX_DANMAKU_MESSAGES) danmakuMessages.value = danmakuMessages.value.slice(-MAX_DANMAKU_MESSAGES)
    })

    // ---- Like ----
    socket.on('room:like', (data: { count: number }) => {
      // Store persists in room state
    })


    // ---- Force logout (duplicate login) ----
    socket.on('force_logout', (data: { reason: string }) => {
      const auth = useAuthStore()
      auth.logout()
      ElMessage.warning(data.reason || '??????????')
    })

    socket.connect()
  }

  
function restoreSavedPlayback() {
  if (!savedPlayback.value) return
  const sp = savedPlayback.value
  savedPlayback.value = null
  const player = usePlayerStore()
  if (sp.playlist.length > 0) {
    const songs = sp.playlist.map(s => songInfoToSong(s))
    player.playFromList(songs, sp.playlistIndex)
    player.seekTo(sp.currentTime)
    if (!sp.isPlaying) player.pause()
  } else if (sp.song) {
    player.play(songInfoToSong(sp.song))
    player.seekTo(sp.currentTime)
    if (!sp.isPlaying) player.pause()
  }
}
function disconnect() {
    const s = getSocket()
    if (s) {
      s.off('connect'); s.off('registered'); s.off('room:created'); s.off('room:joined')
      s.off('room:memberJoined'); s.off('room:memberLeft'); s.off('room:memberKicked')
      s.off('room:kicked'); s.off('room:hostChanged'); s.off('room:invitation')
      s.off('room:inviteResult'); s.off('room:sync'); s.off('room:chat')
      s.off('room:playlistUpdated'); s.off('room:list'); s.off('friends:online')
      s.off('room:error'); s.off('room:danmaku'); s.off('room:like')
    }
    disconnectSocket()
    connected.value = false
    currentRoom.value = null
    messages.value = []
  }


  // ---- Broadcast (host) ----

  async function startBroadcast() {
    if (!currentRoom.value || !isHost.value) return
    try {
      const audio = getAudio()
      const stream = audio.captureStream()

      // When audio tracks appear, add them to all connections
      stream.addEventListener('addtrack', async () => {
        console.log('[broadcast] addtrack fired on mediaStream')
        const tracks = stream.getAudioTracks()
        console.log('[broadcast] audio tracks count:', tracks.length)
        if (tracks.length === 0) return

        // Add tracks to existing connections and renegotiate
        viewerConnections.forEach((pc, sid) => {
          tracks.forEach(t => {
            try { pc.addTrack(t, stream) } catch(e) { console.warn('[broadcast] addTrack failed:', e) }
          })
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer).then(() => {
              getSocket().emit('broadcast:offer', {
                roomId: currentRoom.value!.roomId,
                viewerSocketId: sid,
                sdp: pc.localDescription,
              })
            })
          }).catch((e) => { console.warn('[broadcast] renegotiation failed:', e) })
        })

        // Create connections for pending viewers now that tracks exist
        const pending = Array.from(pendingViewers)
        pendingViewers.clear()
        for (const sid of pending) {
          console.log('[broadcast] processing pending viewer:', sid)
          await createOfferForViewer(sid).catch(e => console.warn('[broadcast] createOfferForViewer failed:', e))
        }
      })

      // Handle case where tracks already exist in stream
      const existingTracks = stream.getAudioTracks()
      if (existingTracks.length > 0) {
        console.log('[broadcast] stream already has', existingTracks.length, 'tracks')
        const pending = Array.from(pendingViewers)
        pendingViewers.clear()
        for (const sid of pending) {
          await createOfferForViewer(sid).catch(e => console.warn('[broadcast] createOfferForViewer failed:', e))
        }
      }

      mediaStream.value = stream
      isBroadcasting.value = true
      if (currentRoom.value) currentRoom.value.isBroadcasting = true
      getSocket().emit('broadcast:start', { roomId: currentRoom.value.roomId })

      const viewers = currentRoom.value.members.filter(m => m.userId !== currentRoom.value!.hostId)
      for (const viewer of viewers) {
        await createOfferForViewer(viewer.socketId)
      }
    } catch (e) {
      console.error('Failed to start broadcast:', e)
      const msg = e instanceof DOMException && e.message.includes('cross-origin')
        ? '广播启动失败：音频来源不支持跨域捕获，请播放在线音乐'
        : '广播启动失败'
      ElMessage.error(msg)
      isBroadcasting.value = false
    }
  }

  async function createOfferForViewer(viewerSocketId: string) {
    if (!mediaStream.value) return
    const tracks = mediaStream.value.getAudioTracks()

    // If no tracks yet, queue viewer for later
    if (tracks.length === 0) {
      pendingViewers.add(viewerSocketId)
      return
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    viewerConnections.set(viewerSocketId, pc)

    tracks.forEach(track => {
      pc.addTrack(track, mediaStream.value!)
    })

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        getSocket().emit('broadcast:ice', {
          roomId: currentRoom.value!.roomId,
          targetSocketId: viewerSocketId,
          candidate: e.candidate,
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        viewerConnections.delete(viewerSocketId)
        pc.close()
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    getSocket().emit('broadcast:offer', {
      roomId: currentRoom.value!.roomId,
      viewerSocketId,
      sdp: pc.localDescription,
    })
  }

  function stopBroadcast() {
    viewerConnections.forEach(pc => pc.close())
    viewerConnections.clear()
    pendingViewers.clear()
    if (mediaStream.value) {
      mediaStream.value.getTracks().forEach(t => t.stop())
      mediaStream.value = null
    }
    isBroadcasting.value = false
    if (currentRoom.value) {
      currentRoom.value.isBroadcasting = false
      getSocket().emit('broadcast:stop', { roomId: currentRoom.value.roomId })
    }
  }

  function joinHostBroadcast() {
    if (!currentRoom.value || isHost.value) return
    getSocket().emit('broadcast:join', { roomId: currentRoom.value.roomId })
  }

  function leaveHostBroadcast() {
    if (hostConnection.value) {
      hostConnection.value.close()
      hostConnection.value = null
    }
    if (viewerAudioEl.value) {
      viewerAudioEl.value.pause()
      viewerAudioEl.value.srcObject = null
      viewerAudioEl.value = null
    }
  }

  // ---- Actions ----

  function sendDanmaku(text: string) {
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:danmaku', { roomId: currentRoom.value.roomId, userId: user.id, username: user.username, text })
  }
  function sendLike() {
    if (!currentRoom.value) return
    const user = useAuthStore().userInfo
    if (!user) return
    getSocket().emit('room:like', { roomId: currentRoom.value.roomId, userId: user.id })
  }

  function toggleMute(muted: boolean) {
    if (mediaStream.value) {
      mediaStream.value.getAudioTracks().forEach(t => { t.enabled = !muted })
    }
  }

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
    const wasMember = !isHost.value
    const user = useAuthStore().userInfo
    if (!user) return
    if (isHost.value) stopBroadcast()
    if (wasMember) leaveHostBroadcast()
    getSocket().emit('room:leave', { roomId: currentRoom.value.roomId, userId: user.id, username: user.username })
    currentRoom.value = null
    messages.value = []
    danmakuMessages.value = []
    // Non-host member: restore their previous playback
    if (wasMember) restoreSavedPlayback()
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
    // state
    connected, currentRoom, isHost, remoteSyncInProgress, pendingInvitation, onlineFriendIds, activeRooms, messages, danmakuMessages,
    isBroadcasting,
    // actions
    connect, disconnect,
    createRoom, joinRoom, leaveRoom,
    inviteFriend, respondToInvite, kickMember,
    addSongsToRoom, removeSongFromRoom,
    syncToRoom, updateRoomSong, setRoomPlayback, sendMessage,
    fetchRoomList, checkOnlineFriends,
    // broadcast
    startBroadcast, stopBroadcast, sendDanmaku, sendLike, toggleMute,
    joinHostBroadcast, leaveHostBroadcast,
  }
})
