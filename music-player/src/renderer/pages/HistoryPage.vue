<template>
  <div class="history-page">
    <div class="history-header">
      <h3>最近播放</h3>
      <span class="count-badge">{{ history.length }} 首</span>
    </div>

    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索歌名或歌手..." size="small" clearable
        style="width: 240px" />
      <el-button size="small" type="danger" plain @click="handleClear" :disabled="history.length === 0">
        清空全部
      </el-button>
    </div>

    <div v-if="filteredHistory.length === 0" class="empty">
      {{ keyword ? '无匹配结果' : '暂无播放记录' }}
    </div>

    <div v-else class="history-list">
      <div class="list-header">
        <span class="col-idx">#</span>
        <span class="col-title">歌曲</span>
        <span class="col-artist">歌手</span>
        <span class="col-album">专辑</span>
        <span class="col-duration">时长</span>
      </div>
      <div v-for="(song, i) in filteredHistory" :key="song.id"
        class="song-row glass-panel"
        :class="{ active: activeId === song.id }"
        @dblclick="playFromHistory(song, i)"
        @contextmenu="onContextMenu($event, song)">
        <span class="col-idx">
          <span v-if="activeId === song.id && player.isPlaying" class="playing-icon">♪</span>
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="col-title">{{ song.title }}</span>
        <span class="col-artist">{{ song.artist }}</span>
        <span class="col-album">{{ song.album }}</span>
        <span class="col-duration">{{ formatTime(song.duration) }}</span>
      </div>
    </div>
    <ContextMenu ref="contextRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHistoryStore } from '../stores/history'
import { usePlayerStore } from '../stores/player'
import type { Song } from '../types/song'
import { formatTime } from '../utils/format'
import { ElMessageBox, ElMessage } from 'element-plus'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'

const store = useHistoryStore()
const player = usePlayerStore()
const keyword = ref('')
const contextRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const history = computed(() => store.history)

const filteredHistory = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return history.value
  return history.value.filter(s =>
    s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw)
  )
})

const activeId = computed(() => player.currentSong?.id ?? -1)

onMounted(() => {
  store.loadHistory()
})

function playFromHistory(song: Song, index: number) {
  player.playFromList(history.value, index)
}

function onContextMenu(e: MouseEvent, song: Song) {
  const items: ContextMenuItem[] = [
    {
      key: 'delete',
      label: '从历史中删除',
      danger: true,
      action: () => {
        store.removeFromHistory(song.id)
        ElMessage.success('已从历史中移除')
      },
    },
  ]
  contextRef.value?.open(e, items)
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定要清空所有播放历史吗？', '确认', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    store.clearHistory()
    ElMessage.success('播放历史已清空')
  } catch {
    // user cancelled
  }
}
</script>

<style scoped>
.history-page {
  flex: 1; display: flex; flex-direction: column; min-height: 0;
  padding: 8px 0;
}

.history-header {
  display: flex; align-items: baseline; gap: 10px;
  margin-bottom: 12px; flex-shrink: 0;
}
.history-header h3 { font-size: 16px; margin: 0; }
.count-badge {
  font-size: 12px; color: var(--text-muted);
  background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: var(--radius-md);
}

.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-shrink: 0; gap: 12px;
}

.empty {
  color: var(--text-muted); text-align: center; padding: 60px 0;
  font-size: 13px;
}

.history-list {
  flex: 1; display: flex; flex-direction: column; min-height: 0; overflow-y: auto;
}

.list-header {
  display: flex; align-items: center; font-size: 11px;
  color: var(--text-muted); padding: 8px 0;
  border-bottom: 1px solid var(--border-subtle); flex-shrink: 0;
}

.song-row {
  display: flex; align-items: center; font-size: 12px;
  height: 38px; padding: 8px 0; margin-bottom: 4px;
  color: var(--text-secondary); cursor: pointer;
}
.song-row:hover { background: rgba(30,80,162,0.05); }
.song-row.active {
  color: var(--text-primary);
  background: rgba(30,80,162,0.06);
  border: 1px solid rgba(30,80,162,0.12);
}
.playing-icon { color: var(--text-accent); }

.col-idx { width: 40px; text-align: center; flex-shrink: 0; }
.col-title { flex: 2; padding-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-artist { flex: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-album { flex: 1.5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.col-duration { width: 60px; text-align: right; color: var(--text-muted); flex-shrink: 0; padding-right: 8px; }
</style>
