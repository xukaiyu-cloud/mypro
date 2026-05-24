<template>
  <div class="sync-page">
    <h3>同步管理</h3>
    <p class="last-sync">上次同步：{{ store.lastSyncTime ? new Date(store.lastSyncTime).toLocaleString() : '从未同步' }}</p>
    <p class="status" :class="statusClass" v-if="store.syncStatus !== 'idle'">
      {{ statusText }}
    </p>
    <div class="actions">
      <el-button type="primary" @click="store.uploadPlaylists()" :loading="store.syncStatus === 'syncing'">
        上传本地歌单
      </el-button>
      <el-button @click="store.downloadPlaylists()" :loading="store.syncStatus === 'syncing'">
        下载云端歌单
      </el-button>
    </div>
    <p class="hint">上传：将本地歌单同步到云端存储。下载：从云端拉取歌单合并到本地。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '../stores/sync'
const store = useSyncStore()

const statusText = computed(() => {
  switch (store.syncStatus) {
    case 'syncing': return '同步中...'
    case 'success': return '同步完成'
    case 'error': return '同步失败'
    default: return ''
  }
})
const statusClass = computed(() => ({
  'status-syncing': store.syncStatus === 'syncing',
  'status-success': store.syncStatus === 'success',
  'status-error': store.syncStatus === 'error',
}))
</script>

<style scoped>
.sync-page {
  padding: 8px 0; flex: 1; display: flex; flex-direction: column; min-height: 0;
}
h3 { font-size: 16px; margin-bottom: 12px; flex-shrink: 0; }
.last-sync { color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; flex-shrink: 0; }
.status { font-size: 12px; margin-bottom: 8px; flex-shrink: 0; }
.status-syncing { color: var(--text-accent); }
.status-success { color: #67c23a; }
.status-error { color: #f56c6c; }
.actions { display: flex; gap: 12px; flex-shrink: 0; }
.hint { font-size: 11px; color: var(--text-muted); margin-top: 12px; }
</style>
