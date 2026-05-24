<template>
  <div class="song-table">
    <div class="table-header">
      <span class="col-index">#</span>
      <span class="col-title">歌曲</span>
      <span class="col-artist">歌手</span>
      <span class="col-album">专辑</span>
      <span class="col-duration">时长</span>
    </div>
    <div class="table-body">
      <div v-for="(song, i) in songs" :key="song.id"
        class="song-row glass-panel"
        :class="{ active: player.currentSong?.id === song.id }"
        @click="player.play(song)">
        <span class="col-index">
          <span v-if="player.currentSong?.id === song.id && player.isPlaying" class="playing-icon">♪</span>
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="col-title">{{ song.title }}</span>
        <span class="col-artist">{{ song.artist }}</span>
        <span class="col-album">{{ song.album }}</span>
        <span class="col-duration">{{ formatTime(song.duration) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Song } from '../types/song'
import { usePlayerStore } from '../stores/player'

const props = defineProps<{ songs: Song[] }>()
const player = usePlayerStore()

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.song-table { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.table-body { overflow-y: auto; flex: 1; min-height: 0; }
.table-header, .song-row {
  display: flex; align-items: center; font-size: 11px; padding: 8px 0;
}
.table-header { color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
.song-row {
  color: var(--text-secondary); font-size: 12px;
  margin-bottom: 4px; padding: 10px 0; cursor: pointer;
}
.song-row:hover { background: rgba(255,200,170,0.06); }
.song-row.active {
  color: var(--text-primary);
  background: rgba(255,170,117,0.08);
  border: 1px solid rgba(255,170,117,0.2);
}
.playing-icon { color: var(--text-accent); }
.col-index { width: 40px; text-align: center; flex-shrink: 0; padding-left: 0; }
.col-title { flex: 2; padding-left: 8px; }
.col-artist { flex: 1.5; color: var(--text-secondary); }
.col-album { flex: 1.5; color: var(--text-secondary); }
.col-duration { width: 60px; text-align: right; color: var(--text-muted); padding-right: 8px; flex-shrink: 0; }
</style>
