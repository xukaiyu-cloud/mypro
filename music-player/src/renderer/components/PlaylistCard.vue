<template>
  <div class="playlist-card" @click="$emit('click', playlist)" @contextmenu.prevent="$emit('contextmenu', $event, playlist)">
    <div class="card-cover">
      <img v-if="playlist.coverUrl" :src="playlist.coverUrl" alt="cover" />
      <span v-else class="no-cover">🎵</span>
      <span class="play-count">▶ {{ formatCount(playlist.playCount) }}</span>
    </div>
    <div class="card-body">
      <div class="card-title">{{ playlist.name }}</div>
      <div class="card-meta">{{ playlist.trackCount }} 首 · by {{ playlist.creator }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PlaylistItem } from '../api/search'

defineProps<{ playlist: PlaylistItem }>()
defineEmits<{
  (e: 'click', playlist: PlaylistItem): void
  (e: 'contextmenu', event: MouseEvent, playlist: PlaylistItem): void
}>()

function formatCount(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(0) + '万'
  return String(n)
}
</script>

<style scoped>
.playlist-card {
  width: 160px; flex-shrink: 0;
  border-radius: var(--radius-md); overflow: hidden;
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
  background: rgba(0,0,0,0.02);
}
.playlist-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.card-cover { width: 160px; height: 160px; position: relative; background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); display: flex; align-items: center; justify-content: center; }
.card-cover img { width: 100%; height: 100%; object-fit: cover; }
.no-cover { font-size: 40px; opacity: 0.4; }
.play-count { position: absolute; right: 6px; top: 6px; padding: 2px 8px; border-radius: 10px; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; }
.card-body { padding: 8px 10px; }
.card-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.card-meta { font-size: 11px; color: var(--text-muted); }
</style>
