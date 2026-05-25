<template>
  <div class="live-room">
    <!-- Lobby -->
    <div v-if="!store.currentRoom" class="lobby">
      <div class="lobby-header">
        <h3>🎙️ 在线直播</h3>
        <button class="create-btn" @click="store.createRoom()" :disabled="!store.connected" title="开启直播">
          <span>＋</span>
        </button>
      </div>

      <!-- Join by room id -->
      <div v-if="showJoin" class="join-bar">
        <el-input v-model="joinRoomId" placeholder="输入房间号" maxlength="6" size="small" style="width:130px" />
        <el-button type="primary" size="small" @click="doJoin">加入</el-button>
        <el-button size="small" @click="showJoin = false">取消</el-button>
      </div>

      <!-- 2-column grid -->
      <div v-if="store.activeRooms.length > 0" class="room-grid">
        <div v-for="r in store.activeRooms" :key="r.roomId" class="room-card"
          @click="joinRoomId = r.roomId; doJoin()">
          <div class="card-cover" :style="{ background: hostColor(r.hostName) }">
            <span class="cover-char">{{ r.hostName.charAt(0) }}</span>
          </div>
          <div class="card-body">
            <div class="card-title">{{ r.hostName }}</div>
            <div class="card-sub">🎵 {{ r.hostName }}的直播间</div>
            <div class="card-meta">👥 {{ r.memberCount }}</div>
          </div>
          <button class="card-more" @click.stop="onCardMore(r, $event)" title="更多">
            <span>⋮</span>
          </button>
        </div>
      </div>

      <div v-else-if="store.connected" class="lobby-empty">
        <span class="empty-icon">📡</span>
        <span>暂无线上的直播间</span>
        <span class="empty-hint">点击右上角 ＋ 开启你的直播</span>
      </div>

      <div v-if="!store.connected" class="lobby-empty">
        <span class="empty-icon">🔌</span>
        <span>未连接服务器</span>
        <el-button type="warning" size="small" @click="store.connect()">连接</el-button>
      </div>
    </div>

    <!-- In a live room -->
    <div v-else class="room-view">
      <!-- Header -->
      <div class="room-header">
        <div class="room-title">
          <span class="status-dot" :class="{ live: store.isBroadcasting }">{{ store.isBroadcasting ? '🔴' : '⭕' }}</span>
          <span>{{ store.currentRoom.hostName }} 的直播间</span>
          <span v-if="store.isHost" class="host-tag">主播</span>
          <span class="online-count">👥 {{ store.currentRoom.members.length }}</span>
          <span v-if="likeCount > 0" class="like-count">❤️ {{ likeCount }}</span>
        </div>
        <div class="header-actions">
          <el-button v-if="!store.isHost && store.isBroadcasting && !isListening" size="small" type="primary" @click="doListen">
            🎧 收听主播
          </el-button>
          <el-button v-if="!store.isHost && isListening" size="small" type="warning" @click="doStopListen">
            🔊 断开收听
          </el-button>
          <el-button size="small" plain @click="store.leaveRoom()">离开</el-button>
        </div>
      </div>

      <!-- Three-column body -->
      <div class="room-body">
        <!-- Left: Viewers -->
        <div class="viewers-panel glass-panel">
          <h4>观众 ({{ store.currentRoom.members.length }})</h4>
          <div v-for="m in store.currentRoom.members" :key="m.userId" class="viewer-row">
            <span class="viewer-icon">{{ m.userId === store.currentRoom.hostId ? '👑' : '🎧' }}</span>
            <span class="viewer-name">{{ m.username }}</span>
            <span v-if="m.userId === store.currentRoom.hostId" class="host-tag">主播</span>
            <el-button v-else-if="store.isHost" size="small" type="danger" text @click="store.kickMember(m.userId)">踢出</el-button>
          </div>
        </div>

        <!-- Center -->
        <div class="center-panel">
          <div class="now-playing glass-panel">
            <h4>正在播放<span v-if="store.isBroadcasting" class="broadcast-badge">📡 直播中</span></h4>
            <div v-if="store.currentRoom.currentSong" class="song-info">
              <div class="song-cover" v-if="store.currentRoom.currentSong.coverUrl">
                <img :src="store.currentRoom.currentSong.coverUrl" alt="cover" />
              </div>
              <div class="song-detail">
                <div class="song-title">{{ store.currentRoom.currentSong.title }}</div>
                <div class="song-artist">{{ store.currentRoom.currentSong.artist }}</div>
                <div class="song-album">{{ store.currentRoom.currentSong.album }}</div>
              </div>
            </div>
            <div v-else class="no-song">等待主播播放歌曲...</div>
          </div>

          <div class="room-lyrics glass-panel">
            <h4>歌词</h4>
            <div v-if="visibleRoomLyrics.length > 0" class="lyrics-mini">
              <div v-for="(item, i) in visibleRoomLyrics" :key="i"
                class="lyric-mini-line" :class="{ active: item.active, next: item.next }">{{ item.text }}</div>
            </div>
            <div v-else class="no-song">暂无歌词</div>
          </div>

          <div class="room-playlist glass-panel">
            <div class="playlist-header"><h4>播放列表 ({{ store.currentRoom.playlist.length }})</h4><el-button v-if="store.isHost" size="small" @click="showAddSongs = true">📋 管理歌单</el-button></div>
            <div v-if="store.currentRoom.playlist.length === 0" class="no-song">暂无歌曲</div>
            <div v-for="(s, i) in store.currentRoom.playlist" :key="i"
            class="pl-song-row" :class="{ clickable: store.isHost }" @dblclick="playRoomSong(i)">
              <span class="pl-idx">
                <span v-if="isCurrentRoomSong(i) && player.isPlaying" class="playing-icon">♪</span>
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="pl-title">{{ s.title }}</span>
              <span class="pl-artist">{{ s.artist }}</span>
              <el-button v-if="store.isHost" size="small" plain @click.stop="store.removeSongFromRoom(i)">移除</el-button>
            </div>
          </div>
        </div>

        <!-- Right -->
        <div class="right-panel">
          <div class="camera-card glass-panel">
            <div class="camera-placeholder">
              <span class="camera-icon">📷</span>
              <span class="camera-text">主播未开启摄像头</span>
            </div>
          </div>

          <div class="danmaku-panel glass-panel">
            <h4>💬 弹幕</h4>
            <div class="danmaku-messages" ref="danmakuRef">
              <div v-if="store.danmakuMessages.length === 0" class="danmaku-empty">暂无弹幕，快来发一条吧~</div>
              <div v-for="(d, i) in store.danmakuMessages" :key="i" class="danmaku-msg">
                <span class="danmaku-user">{{ d.username }}</span>
                <span class="danmaku-text">{{ d.text }}</span>
              </div>
            </div>
            <div class="danmaku-input-row">
              <el-input v-model="danmakuText" placeholder="发个弹幕..." @keyup.enter="sendDanmaku" size="small" />
              <el-button type="primary" size="small" @click="sendDanmaku" :disabled="!danmakuText.trim()">发送</el-button>
            </div>
          </div>

          <div class="action-buttons">
            <el-button size="small" @click="sendLike" class="like-btn">❤️ 点赞</el-button>
            <el-button v-if="store.isHost" size="small" @click="toggleMute">
              {{ isMuted ? '🔇 静音' : '🎤 麦克风' }}
            </el-button>
          </div>
        </div>
      </div>

      <div class="host-hint" v-if="store.isHost">你是主播，开始直播后可向观众广播音频</div>
    </div>

    <InviteDialog v-model="showInvite" :friends="friends" :online-friend-ids="store.onlineFriendIds" @invite="invite" />
    <AddSongsDialog v-model="showAddSongs" :playlists="playlists" @add-songs="onAddSongs" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { useListenStore, type SongInfo } from '../stores/listen'
import { useAuthStore } from '../stores/auth'
import { usePlayerStore } from '../stores/player'
import { useFriendsStore } from '../stores/friends'
import { usePlaylistStore } from '../stores/playlist'
import type { Song } from '../types/song'
import { useLyrics } from '../composables/useLyrics'
import InviteDialog from '../components/InviteDialog.vue'
import AddSongsDialog from '../components/AddSongsDialog.vue'
import { ElMessage } from 'element-plus'
import { songToSongInfo } from '../utils/song'

const store = useListenStore()
const authStore = useAuthStore()
const player = usePlayerStore()
const friendsStore = useFriendsStore()
const playlistStore = usePlaylistStore()

const showJoin = ref(false)
const joinRoomId = ref('')
const showInvite = ref(false)
const showAddSongs = ref(false)
const danmakuText = ref('')
const danmakuRef = ref<HTMLElement | null>(null)
const danmakuList = ref<{ username: string; text: string }[]>([])
const likeCount = ref(0)
const isListening = ref(false)
const isMuted = ref(false)

function hostColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 55%)`
}

function onCardMore(room: { roomId: string; hostName: string; memberCount: number }, event: MouseEvent) {
  joinRoomId.value = room.roomId
  doJoin()
}

const roomLyricsSource = computed(() => store.currentRoom?.currentSong?.lyrics)
const roomTime = computed(() => player.currentTime)
const { lines: roomLyrics, activeIndex: roomActiveLine } = useLyrics(roomLyricsSource, roomTime)

const visibleRoomLyrics = computed(() => {
  if (roomLyrics.value.length === 0) return []
  const current = roomActiveLine.value
  const items: { text: string; active: boolean; next: boolean }[] = []
  if (current >= 0 && current < roomLyrics.value.length) {
    items.push({ text: roomLyrics.value[current].text, active: true, next: false })
  }
  const nextIdx = current + 1
  if (nextIdx < roomLyrics.value.length) {
    items.push({ text: roomLyrics.value[nextIdx].text, active: false, next: true })
  }
  return items
})

const friends = computed(() => friendsStore.friends)
const playlists = computed(() => playlistStore.localPlaylists as { id: number | string; name: string; songs: Song[] }[])

onMounted(() => {
  store.connect()
  store.fetchRoomList()
  friendsStore.fetchFriends()
  playlistStore.fetchLocalPlaylists()
  if (friends.value.length > 0) store.checkOnlineFriends(friends.value.map(f => f.friendId))
})

watch(() => player.currentSong?.lyrics, (lyrics) => {
  if (!store.isHost || !store.currentRoom || !lyrics) return
  if (store.currentRoom.currentSong) {
    store.currentRoom.currentSong.lyrics = lyrics
    store.syncToRoom('changeSong')
  }
})

watch(() => player.currentSong, (song) => {
  if (!store.isHost || store.remoteSyncInProgress) return
  if (song) {
    store.updateRoomSong(songToSongInfo(song))
    store.syncToRoom('changeSong')
  }
})

watch(() => player.isPlaying, (playing) => {
  if (!store.isHost || store.remoteSyncInProgress) return
  store.setRoomPlayback(playing, player.currentTime)
  store.syncToRoom(playing ? 'play' : 'pause')
})

let lastSeekTime = 0
watch(() => player.currentTime, (time) => {
  if (!store.isHost || store.remoteSyncInProgress) return
  if (Math.abs(time - lastSeekTime) < 2) return
  lastSeekTime = time
  store.setRoomPlayback(player.isPlaying, time)
  store.syncToRoom('seek')
})

function sendDanmaku() {
  if (!danmakuText.value.trim()) return
  store.sendDanmaku(danmakuText.value.trim())
  danmakuText.value = ''
  nextTick(() => { if (danmakuRef.value) danmakuRef.value.scrollTop = danmakuRef.value.scrollHeight })
}

function sendLike() { likeCount.value++; store.sendLike() }
function doListen() { isListening.value = true; store.joinHostBroadcast(); ElMessage.success('正在收听主播音频') }
function doStopListen() { isListening.value = false; store.leaveHostBroadcast() }
function toggleMute() { isMuted.value = !isMuted.value; store.toggleMute(isMuted.value) }

function doJoin() {
  if (!joinRoomId.value.trim()) { ElMessage.warning('请输入房间号'); return }
  store.joinRoom(joinRoomId.value.trim().toUpperCase())
  joinRoomId.value = ''; showJoin.value = false
}

function invite(f: { friendId: number }) { store.inviteFriend(f.friendId); ElMessage.info('邀请已发送') }
function onAddSongs(songs: SongInfo[]) { store.addSongsToRoom(songs); showAddSongs.value = false }

function isCurrentRoomSong(i: number): boolean {
  const song = store.currentRoom?.playlist[i]
  const cur = store.currentRoom?.currentSong
  return song != null && cur != null && song.title === cur.title && song.artist === cur.artist
}

function playRoomSong(index: number) {
  if (!store.isHost || !store.currentRoom) return
  const song = store.currentRoom.playlist[index]
  if (!song) return
  const roomSongs = store.currentRoom.playlist.map((s, idx) => ({
    id: idx + 1, title: s.title, artist: s.artist, album: s.album,
    duration: s.duration, filePath: s.sourceUrl, coverUrl: s.coverUrl, sourcePlatform: s.sourcePlatform,
  }))
  player.playFromList(roomSongs, index)
}
</script>

<style scoped>
.live-room { padding: 8px 0; flex: 1; display: flex; flex-direction: column; min-height: 0; }
h3 { font-size: 16px; margin: 0; flex-shrink: 0; }
h4 { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }

/* ========= Lobby ========= */
.lobby { flex: 1; display: flex; flex-direction: column; gap: 14px; }

.lobby-header { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }

.create-btn {
  width: 42px; height: 42px; border-radius: 50%;
  border: 2px solid var(--text-accent);
  background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.06));
  color: var(--text-accent); font-size: 22px; font-weight: 300;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  line-height: 1; transition: all 0.2s;
}
.create-btn:hover { background: var(--text-accent); color: #fff; transform: scale(1.05); }
.create-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

.join-bar { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }

/* Grid */
.room-grid {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; align-content: start;
}

.room-card { border-radius: 12px;
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 10px;
  background: rgba(0,0,0,0.025); cursor: pointer;
  transition: background 0.15s, transform 0.15s;
}
.room-card:hover { background: rgba(0,0,0,0.05); transform: translateY(-1px); }

.card-cover { border-radius: 12px;
  width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.cover-char {
  color: #fff; font-size: 20px; font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.card-body { flex: 1; min-width: 0; }
.card-title { font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-sub { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.card-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

.card-more {
  width: 24px; height: 24px; border-radius: 50%; border: none;
  background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: var(--text-muted); transition: background 0.15s;
  flex-shrink: 0;
}
.card-more:hover { background: rgba(0,0,0,0.08); color: var(--text-primary); }

/* Empty */
.lobby-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: var(--text-muted); font-size: 13px;
}
.empty-icon { font-size: 40px; opacity: 0.3; }
.empty-hint { font-size: 11px; opacity: 0.5; }

/* ========= Room View ========= */
.room-view { flex: 1; display: flex; flex-direction: column; min-height: 0; }

/* Header */
.room-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-shrink: 0; }
.room-title { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.header-actions { display: flex; gap: 6px; }
.status-dot { font-size: 14px; }
.status-dot.live { animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.online-count { font-size: 12px; color: var(--text-secondary); }
.like-count { font-size: 12px; color: #e53e3e; }
.host-tag { font-size: 11px; background: rgba(30,80,162,0.12); color: var(--text-accent); padding: 2px 6px; border-radius: var(--radius-sm); }

/* Body */
.room-body { flex: 1; display: flex; gap: 12px; min-height: 0; }

.viewers-panel { width: 150px; flex-shrink: 0; padding: 10px; overflow-y: auto; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.viewer-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border-subtle); }
.viewer-icon { font-size: 14px; flex-shrink: 0; }
.viewer-name { font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.center-panel { flex: 1; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.now-playing { padding: 14px; border-radius: 14px; flex-shrink: 0; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.broadcast-badge { font-size: 11px; color: #16a34a; background: rgba(22,163,74,0.1); padding: 2px 8px; border-radius: 10px; margin-left: 8px; font-weight: normal; }
.song-info { display: flex; gap: 14px; margin-top: 10px; }
.song-cover { width: 90px; height: 90px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; }
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.song-artist { font-size: 12px; color: var(--text-secondary); }
.song-album { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.no-song { color: var(--text-muted); font-size: 12px; margin-top: 10px; }

.room-lyrics { flex-shrink: 0; padding: 8px 10px; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.lyrics-mini { display: flex; flex-direction: column; gap: 3px; margin-top: 4px; }
.lyric-mini-line { font-size: 11px; color: rgba(0,0,0,0.25); line-height: 20px; height: 20px; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.3s, font-size 0.3s; }
.lyric-mini-line.active { color: var(--text-accent); font-size: 13px; font-weight: 600; }
.lyric-mini-line.next { color: rgba(0,0,0,0.35); font-size: 12px; }

.room-playlist { flex: 1; padding: 10px; border-radius: 14px; overflow-y: auto; min-height: 0; }
.playlist-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.playlist-header h4 { margin-bottom: 0; }
.pl-song-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid var(--border-subtle); font-size: 11px; }
.pl-song-row.clickable { cursor: pointer; }
.pl-song-row.clickable:hover { background: rgba(30,80,162,0.05); }
.playing-icon { color: var(--text-accent); }
.pl-idx { width: 22px; color: var(--text-muted); text-align: center; }
.pl-title { flex: 1; }
.pl-artist { color: var(--text-secondary); width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.right-panel { width: 220px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; }
.camera-card { flex-shrink: 0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.camera-placeholder { border-radius: 12px;
  width: 100%; height: 160px; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.03));
  border: 2px dashed rgba(0,0,0,0.1); border-radius: var(--radius-md); gap: 8px;
}
.camera-icon { font-size: 32px; opacity: 0.4; }
.camera-text { font-size: 11px; color: var(--text-muted); }

.danmaku-panel { flex: 1; padding: 10px; display: flex; flex-direction: column; min-height: 0; border-radius: 14px; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.danmaku-panel h4 { margin: 0 0 6px; font-size: 12px; flex-shrink: 0; }
.danmaku-messages { flex: 1; overflow-y: auto; min-height: 40px; display: flex; flex-direction: column; gap: 3px; }
.danmaku-empty { color: var(--text-muted); font-size: 11px; text-align: center; padding: 20px 0; }
.danmaku-msg { display: flex; gap: 4px; align-items: baseline; font-size: 11px; padding: 2px 0; }
.danmaku-user { color: var(--text-accent); font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.danmaku-user::after { content: '：'; }
.danmaku-text { color: var(--text-primary); word-break: break-word; }
.danmaku-input-row { display: flex; gap: 4px; margin-top: 6px; flex-shrink: 0; }
.danmaku-input-row .el-input { flex: 1; }

.action-buttons { display: flex; gap: 6px; flex-shrink: 0; }
.like-btn { color: #e53e3e !important; border-color: #e53e3e !important; }
.like-btn:hover { background: rgba(229,62,62,0.08) !important; }

.host-hint { margin-top: 10px; padding: 8px; background: rgba(30,80,162,0.06); border-radius: var(--radius-sm); font-size: 11px; color: var(--text-accent); flex-shrink: 0; }
</style>