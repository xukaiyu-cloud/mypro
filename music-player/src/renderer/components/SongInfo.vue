<template>
  <div v-if="song" class="song-info">
    <div class="info-row"><span class="label">歌手</span><span>{{ song.artist }}</span></div>
    <div class="info-row"><span class="label">专辑</span><span>{{ song.album }}</span></div>
    <div class="info-row"><span class="label">时长</span><span>{{ formatTime(song.duration) }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
import { formatTime } from '../utils/format'

const player = usePlayerStore()
const song = computed(() => player.currentSong)
</script>

<style scoped>
.song-info { width: 100%; padding: 0 12px; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;
  border-bottom: 1px solid var(--border-subtle); }
.label { color: var(--text-muted); }
</style>
