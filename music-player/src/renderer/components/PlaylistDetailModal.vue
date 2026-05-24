<template>
  <el-dialog v-model="visible" :title="'歌单: ' + (playlist?.name || '')" width="700px" top="5vh" destroy-on-close>
    <div v-if="loading" class="loading-state"><span class="loading-spinner">⏳</span> 加载歌单歌曲...</div>

    <template v-else-if="songs.length > 0">
      <div class="detail-header">
        <div class="detail-cover">
          <img v-if="playlist?.coverUrl" :src="playlist.coverUrl" alt="" />
          <span v-else>🎵</span>
        </div>
        <div class="detail-info">
          <div class="detail-name">{{ playlist?.name }}</div>
          <div class="detail-meta">{{ songs.length }} 首歌曲 · by {{ playlist?.creator }}</div>
          <div class="detail-actions">
            <el-button size="small" type="primary" @click="playAll">▶ 播放全部</el-button>
            <el-button size="small" @click="addAllToPlaylist">+ 加入我的歌单</el-button>
          </div>
        </div>
      </div>

      <SongTable :songs="songs" />
    </template>

    <p v-else class="empty">该歌单暂无歌曲或无法加载</p>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="addAllToPlaylist">全部加入歌单</el-button>
    </template>
  </el-dialog>

  <!-- Target playlist selector -->
  <el-dialog v-model="showSelector" title="选择目标歌单" width="360px" append-to-body>
    <el-select v-model="targetPlaylistId" placeholder="选择歌单" style="width:100%">
      <el-option v-for="pl in playlistStore.localPlaylists" :key="pl.id" :label="pl.name" :value="pl.id" />
    </el-select>
    <template #footer>
      <el-button @click="showSelector = false">取消</el-button>
      <el-button type="primary" @click="confirmAdd">确认添加</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SongTable from './SongTable.vue'
import { searchApi, type PlaylistItem } from '../api/search'
import { usePlayerStore } from '../stores/player'
import { usePlaylistStore } from '../stores/playlist'
import type { Song } from '../types/song'

const props = defineProps<{ playlist: PlaylistItem | null }>()
const emit = defineEmits<{ (e: 'update:playlist', v: PlaylistItem | null): void }>()

const visible = ref(false)
const loading = ref(false)
const songs = ref<Song[]>([])
const showSelector = ref(false)
const targetPlaylistId = ref<number | null>(null)

const player = usePlayerStore()
const playlistStore = usePlaylistStore()

watch(() => props.playlist, async (pl) => {
  if (!pl) { visible.value = false; songs.value = []; return }
  visible.value = true
  loading.value = true
  songs.value = []
  try {
    const res = await searchApi.playlistSongs(pl.id)
    if (res.code === 200 && res.data) { res.data.songs.forEach((s, i) => { s.id = i + 1 }); songs.value = res.data.songs }
  } catch { songs.value = [] }
  finally { loading.value = false }
})

watch(visible, (v) => { if (!v) emit('update:playlist', null) })

function playAll() {
  if (songs.value.length === 0) return
  player.playlist.splice(0, player.playlist.length, ...songs.value)
  player.play(songs.value[0])
  ElMessage.success('已开始播放')
}

function addAllToPlaylist() { showSelector.value = true }

function confirmAdd() {
  if (!targetPlaylistId.value) { ElMessage.warning('请选择歌单'); return }
  const added = playlistStore.addSongsToPlaylist(targetPlaylistId.value, songs.value)
  ElMessage.success(`已添加 ${added} 首歌曲`)
  showSelector.value = false
  targetPlaylistId.value = null
}
</script>

<style scoped>
.loading-state { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 60px 0; color: var(--text-muted); }
.loading-spinner { font-size: 20px; animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.empty { color: var(--text-muted); text-align: center; padding: 60px 0; }

.detail-header { display: flex; gap: 16px; margin-bottom: 16px; }
.detail-cover { width: 120px; height: 120px; border-radius: var(--radius-md); overflow: hidden; background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); display: flex; align-items: center; justify-content: center; font-size: 48px; flex-shrink: 0; }
.detail-cover img { width: 100%; height: 100%; object-fit: cover; }
.detail-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.detail-name { font-size: 18px; font-weight: 700; }
.detail-meta { font-size: 13px; color: var(--text-muted); }
.detail-actions { display: flex; gap: 8px; margin-top: 4px; }
</style>
