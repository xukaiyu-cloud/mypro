<template>
  <div class="play-queue">
    <div class="queue-header">
      <div class="header-left">
        <h3>播放队列</h3>
        <span class="count-badge">{{ songs.length }} 首</span>
      </div>
      <div class="header-actions">
        <el-button size="small" type="danger" plain @click="handleClear" :disabled="songs.length === 0">
          清空队列
        </el-button>
      </div>
    </div>

    <SongTable v-if="songs.length > 0" :songs="songs" @contextmenu="onContextMenu" />
    <p v-else class="empty-hint">播放队列为空，导入歌曲或选择歌单开始播放</p>

    <ContextMenu ref="ctxRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usePlayerStore } from '../stores/player'
import SongTable from '../components/SongTable.vue'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'
import type { Song } from '../types/song'

const player = usePlayerStore()
const ctxRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const songs = computed(() => player.playlist)

function onContextMenu(e: MouseEvent, song: Song) {
  const idx = songs.value.findIndex(s => s.id === song.id)
  if (idx < 0) return

  const isFirst = idx === 0
  const isLast = idx === songs.value.length - 1

  const items: ContextMenuItem[] = [
    {
      key: 'play',
      label: '播放',
      action: () => player.play(song),
    },
    {
      key: 'remove',
      label: '从队列中移除',
      danger: true,
      action: () => {
        player.removeFromQueue(idx)
        ElMessage.success('已移除')
      },
    },
    {
      key: 'moveUp',
      label: '上移',
      action: () => {
        player.moveInQueue(idx, idx - 1)
      },
    },
    {
      key: 'moveDown',
      label: '下移',
      action: () => {
        player.moveInQueue(idx, idx + 1)
      },
    },
  ]

  // Disable move up/down at boundaries by filtering
  if (isFirst) {
    const filtered = items.filter(it => it.key !== 'moveUp')
    ctxRef.value?.open(e, filtered)
  } else if (isLast) {
    const filtered = items.filter(it => it.key !== 'moveDown')
    ctxRef.value?.open(e, filtered)
  } else {
    ctxRef.value?.open(e, items)
  }
}

async function handleClear() {
  try {
    await ElMessageBox.confirm('确定要清空播放队列吗？', '确认', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning',
    })
    player.clearQueue()
    ElMessage.success('播放队列已清空')
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.play-queue {
  display: flex; flex-direction: column; flex: 1; min-height: 0;
}
.queue-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-shrink: 0;
}
.header-left { display: flex; align-items: baseline; gap: 10px; }
h3 { font-size: 16px; }
.count-badge {
  font-size: 12px; color: var(--text-muted);
  background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: var(--radius-md);
}
.header-actions { display: flex; gap: 6px; }
.empty-hint { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 13px; }
</style>
