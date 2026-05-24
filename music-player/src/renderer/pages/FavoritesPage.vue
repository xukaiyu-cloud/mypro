<template>
  <div class="favorites-page">
    <div class="header">
      <h3>我的收藏</h3>
      <span class="count" v-if="store.songs.length">{{ store.songs.length }} 首</span>
    </div>
    <div v-if="store.songs.length === 0" class="empty">暂无收藏歌曲，播放时点击底部 ❤️ 即可收藏</div>
    <div v-else class="fav-list">
      <div class="list-header">
        <span class="col-idx">#</span>
        <span class="col-title">歌曲</span>
        <span class="col-artist">歌手</span>
        <span class="col-album">专辑</span>
        <span class="col-duration">时长</span>
      </div>
      <div v-for="(song, i) in store.songs" :key="song.id"
        class="song-row glass-panel"
        :class="{ active: activeId === song.id }"
        @dblclick="playFromFav(song, i)"
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
    <ContextMenu ref="ctxRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFavoritesStore } from '../stores/favorites'
import { usePlayerStore } from '../stores/player'
import type { Song } from '../types/song'
import { formatTime } from '../utils/format'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'
import { ElMessage } from 'element-plus'

const store = useFavoritesStore()
const player = usePlayerStore()
const ctxRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const activeId = computed(() => player.currentSong?.id ?? -1)

function playFromFav(song: Song, index: number) {
  player.playFromList(store.songs, index)
}

function onContextMenu(e: MouseEvent, song: Song) {
  const items: ContextMenuItem[] = [{
    key: 'remove',
    label: '取消收藏',
    danger: true,
    action: () => {
      store.removeFavorite(song.id)
      ElMessage.success('已取消收藏')
    },
  }]
  ctxRef.value?.open(e, items)
}
</script>

<style scoped>
.favorites-page {
  flex: 1; display: flex; flex-direction: column; min-height: 0;
  padding: 8px 0;
}
.header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; flex-shrink: 0; }
.header h3 { font-size: 16px; margin: 0; }
.count { font-size: 12px; color: var(--text-muted); }
.empty { color: var(--text-muted); text-align: center; padding: 60px 0; font-size: 13px; }
.fav-list { flex: 1; overflow-y: auto; min-height: 0; }
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
