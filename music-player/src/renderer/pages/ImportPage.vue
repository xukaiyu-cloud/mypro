<template>
  <div class="import-page">
    <h3>导入歌单</h3>
    <LinkInput @parsed="onLinkParsed" />
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    <ImportPreview v-if="previewSongs.length > 0" :songs="previewSongs" @confirm="handleImport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { importApi } from '../api/import'
import { usePlaylistStore } from '../stores/playlist'
import { extractError } from '../utils/error'
import LinkInput from '../components/LinkInput.vue'
import ImportPreview from '../components/ImportPreview.vue'
import type { Song } from '../types/song'

const playlistStore = usePlaylistStore()

const previewSongs = ref<Song[]>([])
const loading = ref(false)
const errorMsg = ref('')

async function onLinkParsed(url: string, platform: string) {
  errorMsg.value = ''
  loading.value = true
  try {
    const res = await importApi.parseLink(url, platform || 'auto')
    previewSongs.value = res.data
    ElMessage.success(`解析到 ${res.data.length} 首歌曲`)
  } catch (e) {
    errorMsg.value = extractError(e, '链接解析失败')
  } finally {
    loading.value = false
  }
}

function handleImport(playlistId: number, songs: Song[]) {
  const added = playlistStore.addSongsToPlaylist(playlistId, songs)
  if (added === 0) {
    ElMessage.info('所有歌曲已在歌单中')
  } else {
    ElMessage.success(`成功导入 ${added} 首歌曲`)
  }
  previewSongs.value = []
}
</script>

<style scoped>
.import-page {
  padding: 0; flex: 1; min-height: 0;
  display: flex; flex-direction: column;
  overflow: hidden;
}
h3 { font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.error-msg { color: #f56c6c; font-size: 12px; margin-top: 8px; flex-shrink: 0; }
</style>