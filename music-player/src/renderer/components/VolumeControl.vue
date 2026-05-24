<template>
  <div class="volume-control">
    <span class="mode-btn" @click="cycleMode">{{ modeIcon }}</span>
    <span class="vol-icon">🔊</span>
    <div class="vol-track" @click="setVol">
      <div class="vol-fill accent-bg" :style="{ width: `${player.volume}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
import type { PlayMode } from '../../shared/types'
const player = usePlayerStore()
const modeIcons: Record<PlayMode, string> = {
  'sequential': '➡',
  'single-loop': '🔂',
  'list-loop': '🔁',
  'shuffle': '🔀',
}
const modeIcon = computed(() => modeIcons[player.playMode])
const modes: PlayMode[] = ['sequential', 'list-loop', 'single-loop', 'shuffle']
function cycleMode() {
  const idx = modes.indexOf(player.playMode)
  player.setPlayMode(modes[(idx + 1) % modes.length])
}
function setVol(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  player.setVolume(((e.clientX - rect.left) / rect.width) * 100)
}
</script>

<style scoped>
.volume-control { display: flex; align-items: center; gap: 14px; }
.mode-btn { color: var(--text-muted); font-size: 13px; cursor: pointer; }
.mode-btn.active { color: var(--text-accent); }
.vol-icon { color: var(--text-muted); font-size: 10px; }
.vol-track {
  width: 70px; height: 3px; background: rgba(0,0,0,0.06);
  border-radius: var(--radius-sm); overflow: hidden; cursor: pointer;
}
.vol-fill {
  height: 100%; border-radius: var(--radius-sm);
  background: var(--accent-gradient);
}
</style>
