<template>
  <div class="play-controls">
    <!-- Shuffle -->
    <span class="ctrl-btn" :class="{ active: player.playMode === 'shuffle' }" @click="toggleShuffle" title="随机播放">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    </span>

    <!-- Previous -->
    <span class="ctrl-btn" @click="player.prev()" title="上一曲">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="19 20 9 12 19 4 19 20" />
        <line x1="5" y1="19" x2="5" y2="5" />
      </svg>
    </span>

    <!-- Play / Pause -->
    <span class="play-btn" @click="togglePlay" :title="player.isPlaying ? '暂停' : '播放'">
      <svg v-if="player.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
    </span>

    <!-- Next -->
    <span class="ctrl-btn" @click="player.next()" title="下一曲">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 4 15 12 5 20 5 4" />
        <line x1="19" y1="5" x2="19" y2="19" />
      </svg>
    </span>

    <!-- Volume -->
    <span class="ctrl-btn vol-btn" @click.stop="toggleVolPop" title="音量">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path v-if="player.volume > 0" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <path v-if="player.volume > 30" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <line v-if="player.volume === 0" x1="23" y1="9" x2="17" y2="15" />
        <line v-if="player.volume === 0" x1="17" y1="9" x2="23" y2="15" />
      </svg>
      <!-- Volume popup -->
      <div v-if="showVolPop" class="vol-popup" @click.stop>
        <div class="vol-slider-track" @mousedown="onVolMouseDown">
          <div class="vol-slider-fill" :style="{ height: player.volume + '%' }" />
        </div>
        <span class="vol-num">{{ Math.round(player.volume) }}</span>
      </div>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/player'

const player = usePlayerStore()
const showVolPop = ref(false)

function togglePlay() {
  player.isPlaying ? player.pause() : player.resume()
}

function toggleShuffle() {
  player.setPlayMode(player.playMode === 'shuffle' ? 'list-loop' : 'shuffle')
}

function toggleVolPop() {
  showVolPop.value = !showVolPop.value
}

function closeVolPop() {
  showVolPop.value = false
}

function onDocumentClick(e: MouseEvent) {
  if (showVolPop.value) {
    closeVolPop()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

// Volume drag
let volDragging = false

function onVolMouseDown(e: MouseEvent) {
  volDragging = true
  updateVolFromEvent(e)
  const onMove = (ev: MouseEvent) => {
    if (!volDragging) return
    updateVolFromEvent(ev)
  }
  const onUp = () => {
    volDragging = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function updateVolFromEvent(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const pct = 1 - (e.clientY - rect.top) / rect.height
  player.setVolume(pct * 100)
}
</script>

<style scoped>
.play-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.ctrl-btn {
  color: #1d1d1f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, transform 0.15s;
  position: relative;
}
.ctrl-btn:hover {
  transform: scale(1.12);
}
.ctrl-btn.active {
  color: #fa233c;
}

.play-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-base);
  cursor: pointer;
  background: #1d1d1f;
  transition: transform 0.15s, box-shadow 0.2s;
}
.play-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 0 12px rgba(0,0,0,0.15);
}

/* Volume popup */
.vol-btn {
  position: relative;
}

.vol-popup {
  position: absolute;
  bottom: 42px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 8px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
  z-index: 200;
}

.vol-slider-track {
  width: 6px;
  height: 100px;
  background: rgba(0,0,0,0.06);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.vol-slider-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1d1d1f;
  border-radius: 3px;
  transition: height 0.1s;
}

.vol-num {
  font-size: 11px;
  color: #666;
  min-width: 22px;
  text-align: center;
}
</style>
