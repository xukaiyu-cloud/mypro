<template>
  <div class="playlist-detail">
    <div v-if="playlist" class="header">
      <div class="header-left">
        <h3>{{ playlist.name }}</h3>
        <span class="song-count">{{ playlist.songs.length }} 首</span>
      </div>
      <div class="header-actions">
        <el-button type="primary" size="small" @click="playAll" :disabled="playlist.songs.length === 0">播放全部</el-button>
        <el-button size="small" @click="showRename = true">重命名</el-button>
        <el-button size="small" type="danger" plain @click="handleDelete">删除歌单</el-button>
      </div>
    </div>
    <div v-else class="header">
      <h3>歌单详情</h3>
      <p class="not-found">歌单未找到</p>
    </div>
    <SongTable v-if="playlist" :songs="playlist.songs" :playlist-id="playlist.id" @contextmenu="onSongContext" />
    <ContextMenu ref="ctxRef" />

    <el-dialog v-model="showRename" title="重命名歌单" width="360px">
      <el-input v-model="renameText" placeholder="歌单名称" @keyup.enter="doRename" />
      <template #footer>
        <el-button @click="showRename = false">取消</el-button>
        <el-button type="primary" @click="doRename">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePlaylistStore } from '../stores/playlist'
import { usePlayerStore } from '../stores/player'
import SongTable from '../components/SongTable.vue'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'
import type { Song } from '../types/song'

const route = useRoute()
const router = useRouter()
const playlistStore = usePlaylistStore()
const player = usePlayerStore()
const ctxRef = ref<InstanceType<typeof ContextMenu> | null>(null)
const showRename = ref(false)
const renameText = ref('')

const playlist = computed(() =>
  playlistStore.localPlaylists.find(p => p.id === Number(route.params.id))
)

function playAll() {
  if (!playlist.value || playlist.value.songs.length === 0) return
  player.playFromList(playlist.value.songs, 0, playlist.value.id)
}

function onSongContext(e: MouseEvent, song: Song) {
  const items: ContextMenuItem[] = [{
    key: 'remove',
    label: '从歌单中移除',
    danger: true,
    action: () => {
      playlistStore.removeSongFromPlaylist(Number(route.params.id), song.id)
      ElMessage.success('已移除')
    },
  }]
  ctxRef.value?.open(e, items)
}

function doRename() {
  if (!renameText.value.trim() || !playlist.value) return
  playlistStore.updatePlaylist(playlist.value.id, { name: renameText.value.trim() })
  renameText.value = ''
  showRename.value = false
  ElMessage.success('已重命名')
}

async function handleDelete() {
  if (!playlist.value) return
  try {
    await ElMessageBox.confirm(`确定要删除歌单「${playlist.value.name}」吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    playlistStore.deletePlaylist(playlist.value.id)
    ElMessage.success('歌单已删除')
    router.push('/queue')
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.playlist-detail {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
}
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-shrink: 0; }
.header-left { display: flex; align-items: baseline; gap: 10px; }
.header-actions { display: flex; gap: 6px; }
h3 { font-size: 16px; }
.song-count { font-size: 12px; color: var(--text-muted); }
.not-found { color: var(--text-muted); font-size: 13px; }
</style>
