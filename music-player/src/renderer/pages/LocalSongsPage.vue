<template>
  <div class="local-page">
    <h3>本地歌曲</h3>

    <!-- Folder selection -->
    <div class="folder-bar">
      <el-input v-model="folderPath" placeholder="选择本地音乐文件夹..." readonly>
        <template #append>
          <el-button @click="selectFolder">📂 浏览</el-button>
        </template>
      </el-input>
      <el-button type="primary" :loading="scanning" @click="doScan" style="margin-left:8px">
        🔍 扫描
      </el-button>
    </div>

    <p v-if="scanMsg" class="scan-msg">{{ scanMsg }}</p>

    <!-- Scan results -->
    <div v-if="scanResults.length > 0" class="scan-section">
      <div class="section-bar">
        <span>扫描到 {{ scanResults.length }} 首歌曲</span>
        <el-button type="primary" size="small" :loading="importing" @click="doImport">
          📥 全部导入
        </el-button>
      </div>
      <div class="scan-list">
        <div v-for="(s, i) in scanResults" :key="i" class="scan-row">
          <span class="scan-idx">{{ i + 1 }}</span>
          <span class="scan-title">{{ s.title }}</span>
          <span class="scan-artist">{{ s.artist || '未知歌手' }}</span>
          <span class="scan-album">{{ s.album || '未知专辑' }}</span>
        </div>
      </div>
    </div>

    <!-- Imported local songs -->
    <div class="section-bar" style="margin-top:16px">
      <span>已导入 {{ localSongs.length }} 首</span>
      <el-button size="small" @click="loadLocalSongs">🔄 刷新</el-button>
    </div>
    <SongTable v-if="localSongs.length > 0" :songs="localSongs" />
    <p v-else class="empty">还没有导入本地歌曲，请选择文件夹并扫描</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { Song } from '../types/song'
import SongTable from '../components/SongTable.vue'
import { localApi, type LocalSong } from '../api/local'

const folderPath = ref('')
const scanning = ref(false)
const importing = ref(false)
const scanMsg = ref('')
const scanResults = ref<LocalSong[]>([])
const localSongs = ref<Song[]>([])

onMounted(() => { loadLocalSongs() })

async function selectFolder() {
  if (!window.electronAPI) {
    ElMessage.warning('文件夹选择仅在桌面端可用')
    return
  }
  const dir = await window.electronAPI.selectDirectory()
  if (dir) folderPath.value = dir
}

async function doScan() {
  if (!folderPath.value) return
  scanning.value = true; scanMsg.value = ''; scanResults.value = []
  try {
    const res = await localApi.scan(folderPath.value)
    if (res.code === 200 && res.data) {
      scanResults.value = res.data
      scanMsg.value = `找到 ${res.data.length} 首歌曲`
    }
  } catch {
    scanMsg.value = '扫描失败，请检查路径是否正确'
  } finally { scanning.value = false }
}

async function doImport() {
  if (scanResults.value.length === 0) return
  importing.value = true
  try {
    const res = await localApi.importSongs(scanResults.value)
    if (res.code === 200) {
      ElMessage.success(res.message)
      scanResults.value = []
      await loadLocalSongs()
    }
  } catch { ElMessage.error('导入失败') }
  finally { importing.value = false }
}

async function loadLocalSongs() {
  try {
    const res = await localApi.getSongs()
    if (res.code === 200 && res.data) {
      localSongs.value = res.data as Song[]
    }
  } catch { /* silent */ }
}
</script>

<style scoped>
.local-page { display: flex; flex-direction: column; flex: 1; min-height: 0; }
h3 { font-size: 15px; margin-bottom: 10px; flex-shrink: 0; }
.folder-bar { display: flex; align-items: center; flex-shrink: 0; }
.scan-msg { font-size: 12px; color: var(--text-muted); margin-top: 6px; flex-shrink: 0; }
.scan-section { margin-top: 12px; flex-shrink: 0; }
.section-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: var(--text-secondary); }
.scan-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); }
.scan-row { display: flex; align-items: center; padding: 6px 10px; font-size: 12px; border-bottom: 1px solid var(--border-subtle); }
.scan-row:last-child { border-bottom: none; }
.scan-idx { width: 30px; color: var(--text-muted); }
.scan-title { flex: 2; }
.scan-artist { flex: 1; color: var(--text-secondary); }
.scan-album { flex: 1; color: var(--text-muted); }
.empty { color: var(--text-muted); text-align: center; padding: 40px 0; font-size: 13px; }
</style>