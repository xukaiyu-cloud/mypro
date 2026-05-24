<template>
  <div class="import-preview">
    <div class="preview-header">
      <span>解析到 {{ songs.length }} 首歌曲</span>
      <div class="header-actions">
        <el-select v-model="targetPlaylist" placeholder="选择目标歌单" style="width:180px">
          <el-option v-for="pl in playlistStore.localPlaylists" :key="pl.id"
            :label="pl.name" :value="pl.id" />
        </el-select>
        <el-button type="primary" @click="confirm">确认导入 ({{ selectedCount }})</el-button>
      </div>
    </div>
    <el-table :data="songs" @selection-change="onSelect" max-height="300">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="title" label="歌曲名" />
      <el-table-column prop="artist" label="歌手" />
      <el-table-column prop="album" label="专辑" />
      <el-table-column label="时长" width="80">
        <template #default="{ row }">{{ formatTime(row.duration) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { Song } from '../types/song'
import { usePlaylistStore } from '../stores/playlist'
import { formatTime } from '../utils/format'

const props = defineProps<{ songs: Song[] }>()
const emit = defineEmits<{ (e: 'confirm', playlistId: number, songs: Song[]): void }>()
const playlistStore = usePlaylistStore()
const targetPlaylist = ref<number | null>(null)
const selectedSongs = ref<Song[]>([])
const selectedCount = computed(() => selectedSongs.value.length)

function onSelect(rows: Song[]) { selectedSongs.value = rows }
function confirm() {
  if (!targetPlaylist.value) {
    ElMessage.warning('请选择目标歌单')
    return
  }
  if (selectedSongs.value.length === 0) {
    ElMessage.warning('请选择要导入的歌曲')
    return
  }
  emit('confirm', targetPlaylist.value, selectedSongs.value)
}
</script>

<style scoped>
.preview-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; font-size: 12px; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
}
.header-actions { display: flex; gap: 6px; align-items: center; }
</style>
