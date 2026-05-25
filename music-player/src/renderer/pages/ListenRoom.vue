<template>
  <div class="listen-room">
    <h3>协同听歌</h3>

    <!-- Not in a room: create / join / list -->
    <div v-if="!store.currentRoom" class="lobby">
      <div class="action-row">
        <el-button type="primary" size="large" @click="store.createRoom()" :disabled="!store.connected">
          创建房间
        </el-button>
        <el-button size="large" @click="showJoin = true" :disabled="!store.connected">
          加入房间
        </el-button>
        <el-button @click="store.fetchRoomList()">刷新列表</el-button>
      </div>

      <div v-if="showJoin" class="join-row">
        <el-input v-model="joinRoomId" placeholder="输入6位房间号" maxlength="6" style="width:160px" />
        <el-button type="primary" @click="doJoin">加入</el-button>
        <el-button @click="showJoin = false">取消</el-button>
      </div>

      <div v-if="store.activeRooms.length > 0" class="room-list">
        <h4>活跃房间 ({{ store.activeRooms.length }})</h4>
        <div v-for="r in store.activeRooms" :key="r.roomId" class="room-card">
          <div class="room-info">
            <span class="room-host">{{ r.hostName }} 的房间</span>
            <span class="room-meta">{{ r.memberCount }} 人在线</span>
          </div>
          <div class="room-id">{{ r.roomId }}</div>
          <el-button size="small" type="primary" @click="joinRoomId = r.roomId; doJoin()">加入</el-button>
        </div>
      </div>

      <div v-if="!store.connected" class="connect-hint">
        <el-button type="warning" @click="store.connect()">连接服务器</el-button>
      </div>
    </div>

    <!-- In a room -->
    <div v-else class="room-view">
      <div class="room-header">
        <div class="room-title">
          <span class="room-id-badge">{{ store.currentRoom.roomId }}</span>
          <span>{{ store.currentRoom.hostName }} 的房间</span>
          <span v-if="store.isHost" class="host-tag">房主</span>
        </div>
        <div class="header-actions">
          <!-- Host broadcast control -->
          <el-button v-if="store.isHost && !store.isBroadcasting" size="small" type="success" @click="store.startBroadcast()">
            开始广播
          </el-button>
          <el-button v-if="store.isHost && store.isBroadcasting" size="small" type="warning" @click="store.stopBroadcast()">
            停止广播
          </el-button>
          <!-- Viewer listen control -->
          <el-button v-if="!store.isHost && store.isBroadcasting" size="small" type="primary" @click="store.joinHostBroadcast()">
            收听主播
          </el-button>
          <el-button v-if="!store.isHost" size="small" type="warning" @click="store.leaveHostBroadcast()">
            断开收听
          </el-button>
          <el-button v-if="store.isHost" size="small" type="warning" @click="showInvite = true">
            邀请好友
          </el-button>
          <el-button v-if="store.isHost" size="small" @click="showAddSongs = true">
            从歌单添加
          </el-button>
          <el-button type="danger" size="small" plain @click="store.leaveRoom()">离开</el-button>
        </div>
      </div>

      <div class="room-body">
        <!-- Members panel -->
        <div class="members-panel glass-panel">
          <h4>成员 ({{ store.currentRoom.members.length }})</h4>
          <div v-for="m in store.currentRoom.members" :key="m.userId" class="member-row">
            <span class="member-name">{{ m.username }}</span>
            <span v-if="m.userId === store.currentRoom.hostId" class="host-tag">房主</span>
            <el-button v-else-if="store.isHost" size="small" type="danger" text @click="store.kickMember(m.userId)">
              踢出
            </el-button>
          </div>
        </div>

        <!-- Center: now playing + playlist -->
        <div class="center-panel">
          <div class="now-playing glass-panel">
            <h4>
              正在播放
              <span v-if="store.isBroadcasting" class="broadcast-badge" title="主播正在广播音频">📡 广播中</span>
            </h4>
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
            <div v-else class="no-song">等待房主播放歌曲...</div>
          </div>

          <!-- Lyrics: 2-line compact display -->
          <div class="room-lyrics glass-panel">
            <h4>歌词</h4>
            <div v-if="visibleRoomLyrics.length > 0" class="lyrics-mini">
              <div v-for="(item, i) in visibleRoomLyrics" :key="i"
                class="lyric-mini-line" :class="{ active: item.active, next: item.next }">
                {{ item.text }}
              </div>
            </div>
            <div v-else class="no-song">暂无歌词</div>
          </div>

          <!-- Room playlist -->
          <div class="room-playlist glass-panel">
            <h4>房间播放列表 ({{ store.currentRoom.playlist.length }})</h4>
            <div v-if="store.currentRoom.playlist.length === 0" class="no-song">暂无歌曲</div>
            <div v-for="(s, i) in store.currentRoom.playlist" :key="i"
            class="pl-song-row" :class="{ clickable: store.isHost }"
            @dblclick="playRoomSong(i)">
              <span class="pl-idx">
                <span v-if="isCurrentRoomSong(i) && player.isPlaying" class="playing-icon">♪</span>
                <span v-else>{{ i + 1 }}</span>
              </span>
              <span class="pl-title">{{ s.title }}</span>
              <span class="pl-artist">{{ s.artist }}</span>
              <el-button v-if="store.isHost" size="small" type="danger" text @click.stop="store.removeSongFromRoom(i)">
                移除
              </el-button>
            </div>
          </div>
        </div>
      </div>


      <div class="host-hint">
        你是房主，房间成员可看到你正在播放的歌曲
      </div>
    </div>

    <InviteDialog v-model="showInvite" :friends="friends" :online-friend-ids="store.onlineFriendIds" @invite="invite" />
    <AddSongsDialog v-model="showAddSongs" :playlists="playlists" @add-songs="onAddSongs" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
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
  // Check online status of friends
  if (friends.value.length > 0) {
    store.checkOnlineFriends(friends.value.map(f => f.friendId))
  }
})

// Host: sync lyrics to room when they load asynchronously
watch(() => player.currentSong?.lyrics, (lyrics) => {
  if (!store.isHost || !store.currentRoom || !lyrics) return
  if (store.currentRoom.currentSong) {
    store.currentRoom.currentSong.lyrics = lyrics
    store.syncToRoom('changeSong')
  }
})

// Host: watch player changes and sync to room
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


function doJoin() {
  if (!joinRoomId.value.trim()) {
    ElMessage.warning('请输入房间号')
    return
  }
  store.joinRoom(joinRoomId.value.trim().toUpperCase())
  joinRoomId.value = ''
  showJoin.value = false
}

function invite(f: { friendId: number }) {
  store.inviteFriend(f.friendId)
  ElMessage.info('邀请已发送')
}

function onAddSongs(songs: SongInfo[]) {
  store.addSongsToRoom(songs)
  showAddSongs.value = false
}

function isCurrentRoomSong(i: number): boolean {
  const song = store.currentRoom?.playlist[i]
  const cur = store.currentRoom?.currentSong
  return song != null && cur != null && song.title === cur.title && song.artist === cur.artist
}

function playRoomSong(index: number) {
  if (!store.isHost || !store.currentRoom) return
  const song = store.currentRoom.playlist[index]
  if (!song) return

  // Set player's playlist to room playlist
  const roomSongs = store.currentRoom.playlist.map((s, idx) => ({
    id: idx + 1,
    title: s.title,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    filePath: s.sourceUrl,
    coverUrl: s.coverUrl,
    sourcePlatform: s.sourcePlatform,
  }))
  player.playFromList(roomSongs, index)
}

</script>

<style scoped>
.listen-room {
  padding: 8px 0; flex: 1; display: flex; flex-direction: column; min-height: 0;
}
h3 { font-size: 16px; margin-bottom: 16px; flex-shrink: 0; }

.lobby { flex: 1; display: flex; flex-direction: column; gap: 16px; }
.action-row { display: flex; gap: 8px; flex-shrink: 0; }
.join-row { display: flex; gap: 8px; align-items: center; }

.room-list { flex: 1; overflow-y: auto; min-height: 0; }
h4 { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.room-card {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; margin-bottom: 6px;
  background: rgba(0,0,0,0.03); border-radius: var(--radius-sm);
}
.room-info { flex: 1; }
.room-host { font-size: 13px; display: block; }
.room-meta { font-size: 11px; color: var(--text-muted); }
.room-id {
  font-family: monospace; font-size: 18px; letter-spacing: 2px;
  color: var(--text-accent);
}

.room-view { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.room-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-shrink: 0;
}
.room-title { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.header-actions { display: flex; gap: 6px; }
.room-id-badge {
  background: var(--text-accent); color: #fff; padding: 2px 8px;
  border-radius: var(--radius-sm); font-family: monospace; font-size: 14px;
}
.host-tag {
  font-size: 11px; background: rgba(30,80,162,0.12); color: var(--text-accent);
  padding: 2px 6px; border-radius: var(--radius-sm);
}

.room-body {
  flex: 1; display: flex; gap: 16px; min-height: 0;
}
.members-panel {
  width: 180px; flex-shrink: 0; padding: 12px; overflow-y: auto;
  border-radius: var(--radius-md);
}
.member-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 0; border-bottom: 1px solid var(--border-subtle);
}
.member-name { font-size: 13px; }

.center-panel { flex: 1; display: flex; flex-direction: column; gap: 12px; min-height: 0; }

.now-playing {
  padding: 16px; border-radius: var(--radius-md); flex-shrink: 0;
}
.song-info { display: flex; gap: 16px; margin-top: 12px; }
.song-cover { width: 100px; height: 100px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; }
.song-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.song-artist { font-size: 13px; color: var(--text-secondary); }
.song-album { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.no-song { color: var(--text-muted); font-size: 13px; margin-top: 12px; }

.room-lyrics {
  flex-shrink: 0; padding: 10px 12px; border-radius: var(--radius-md);
}
.lyrics-mini {
  display: flex; flex-direction: column; gap: 4px; margin-top: 4px;
}
.lyric-mini-line {
  font-size: 12px; color: rgba(0,0,0,0.25);
  line-height: 22px; height: 22px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 0.3s, font-size 0.3s;
}
.lyric-mini-line.active { color: var(--text-accent); font-size: 14px; font-weight: 600; }
.lyric-mini-line.next { color: rgba(0,0,0,0.35); font-size: 13px; }

.room-playlist {
  flex: 1; padding: 12px; border-radius: var(--radius-md); overflow-y: auto; min-height: 0;
}
.pl-song-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid var(--border-subtle);
  font-size: 12px;
}
.pl-song-row.clickable { cursor: pointer; }
.pl-song-row.clickable:hover { background: rgba(30,80,162,0.05); }
.playing-icon { color: var(--text-accent); }
.pl-idx { width: 24px; color: var(--text-muted); text-align: center; }
.pl-title { flex: 1; }
.pl-artist { color: var(--text-secondary); width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }


.broadcast-badge {
  font-size: 11px; color: #16a34a; background: rgba(22,163,74,0.1);
  padding: 2px 8px; border-radius: 10px; margin-left: 8px;
  font-weight: normal;
}
.host-hint {
  margin-top: 12px; padding: 10px;
  background: rgba(30,80,162,0.06); border-radius: var(--radius-sm);
  font-size: 12px; color: var(--text-accent); flex-shrink: 0;
}
.connect-hint { margin-top: 12px; }
</style>
