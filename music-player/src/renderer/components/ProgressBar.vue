<template>
  <div class="progress-bar" :class="{ disabled }" @click="onSeek">
    <div class="track">
      <div class="fill" :style="{ width: `${player.progress * 100}%` }">
        <div class="thumb" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'

defineProps<{ disabled?: boolean }>()

const player = usePlayerStore()

function onSeek(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  player.seekTo(ratio * player.duration)
}
</script>

<style scoped>
.progress-bar { width: 100%; max-width: 480px; }
.progress-bar.disabled { pointer-events: none; }
.track {
  height: 4px; background: rgba(0,0,0,0.06);
  border-radius: var(--radius-sm); overflow: visible; cursor: pointer;
}
.progress-bar.disabled .track { cursor: default; }
.fill {
  height: 100%; border-radius: var(--radius-sm); position: relative;
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
}
.thumb {
  position: absolute; right: -5px; top: -4px;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--text-accent);
  border: 2px solid var(--color-white);
  box-shadow: 0 0 8px rgba(30,80,162,0.35);
}
.progress-bar.disabled .thumb { display: none; }
</style>
