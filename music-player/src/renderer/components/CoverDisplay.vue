<template>
  <div class="cover-wrapper">
    <div class="cover-frame">
      <div class="cover-img">
        <span v-show="!song?.coverUrl" class="placeholder">♫</span>
        <img v-show="song?.coverUrl" :src="song?.coverUrl" :alt="song?.title || ''" />
      </div>
    </div>
    <div class="song-title">{{ song?.title ?? '未在播放' }}</div>
    <div class="song-sub">{{ song?.artist }}{{ song?.album ? ` · ${song.album}` : '' }}</div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
import { computed } from 'vue'
const player = usePlayerStore()
const song = computed(() => player.currentSong)
</script>

<style scoped>
.cover-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cover-frame {
  width: 176px;
  height: 176px;
  flex-shrink: 0;
  padding: 3px;
  border-radius: var(--radius-lg);
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
}
.cover-img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  background: rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}
.cover-img img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.2s ease;
}
.placeholder {
  position: absolute;
  color: var(--text-on-accent);
  font-size: 52px;
  line-height: 1;
}
.song-title {
  font-size: 17px;
  font-weight: 600;
  margin-top: 10px;
  text-align: center;
  min-height: 24px;
}
.song-sub {
  font-size: 12px;
  color: var(--text-accent);
  margin-top: 4px;
  text-align: center;
  min-height: 18px;
}
</style>
