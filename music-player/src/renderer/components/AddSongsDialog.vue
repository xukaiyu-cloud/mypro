<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="从歌单添加歌曲" width="500px">
    <div v-if="playlists.length === 0" class="empty">暂无本地歌单</div>
    <div v-for="pl in playlists" :key="pl.id" class="playlist-item">
      <div class="pl-header">
        <span class="pl-name">{{ pl.name }}</span>
        <span class="pl-count">{{ pl.songs.length }} 首</span>
        <el-button size="small" @click="toggleExpand(pl.id)">选择歌曲</el-button>
        <el-button size="small" type="primary" @click="addAll(pl)">全部添加</el-button>
      </div>
      <div v-if="expandedPl === pl.id" class="pl-songs">
        <div v-for="s in pl.songs" :key="s.id" class="song-select-row">
          <el-checkbox :model-value="selectedSongIds.has(String(s.id))" @change="(val: boolean) => toggleSong(String(s.id), val)" />
          <span>{{ s.title }} - {{ s.artist }}</span>
        </div>
        <el-button size="small" type="primary" @click="addSelected(pl)">添加选中歌曲</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Playlist } from '../types/playlist'
import type { SongInfo } from '../stores/listen'
import type { Song } from '../types/song'
import { songToSongInfo } from '../utils/song'

const props = defineProps<{
  modelValue: boolean
  playlists: Playlist[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  addSongs: [songs: SongInfo[]]
}>()

const expandedPl = ref<number | string | null>(null)
const selectedSongIds = ref(new Set<string>())

function toggleExpand(plId: number | string) {
  expandedPl.value = expandedPl.value === plId ? null : plId
  selectedSongIds.value = new Set()
}

function toggleSong(id: string, checked: boolean) {
  if (checked) {
    selectedSongIds.value.add(id)
  } else {
    selectedSongIds.value.delete(id)
  }
}

function addAll(pl: Playlist) {
  emit('addSongs', pl.songs.map(songToSongInfo))
  ElMessage.success(`已添加 ${pl.songs.length} 首歌曲`)
}

function addSelected(pl: Playlist) {
  const selected = pl.songs.filter(s => selectedSongIds.value.has(String(s.id)))
  if (selected.length === 0) {
    ElMessage.warning('请选择歌曲')
    return
  }
  emit('addSongs', selected.map(songToSongInfo))
  ElMessage.success(`已添加 ${selected.length} 首歌曲`)
  expandedPl.value = null
}
</script>

<style scoped>
.playlist-item {
  margin-bottom: 8px; padding: 8px;
  background: rgba(0,0,0,0.03); border-radius: var(--radius-sm);
}
.pl-header { display: flex; align-items: center; gap: 8px; }
.pl-name { flex: 1; font-size: 13px; font-weight: 600; }
.pl-count { font-size: 11px; color: var(--text-muted); }
.pl-songs { margin-top: 8px; padding-left: 8px; }
.song-select-row {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 0; font-size: 12px;
}
.empty { color: var(--text-muted); font-size: 12px; padding: 12px 0; }
</style>
