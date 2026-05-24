<template>
  <div
    class="immersive"
    ref="container"
    tabindex="0"
    @keydown.esc="goBack"
    @mousemove="onInteraction"
    @click="onClickInteraction"
  >
    <!-- Background layers -->
    <div class="bg-layer">
      <div
        v-if="player.currentSong?.coverUrl"
        class="bg-cover"
        :style="{ backgroundImage: `url(${player.currentSong.coverUrl})` }"
      />
      <div class="bg-gradient" :style="gradientStyle" />
    </div>

    <!-- Top bar -->
    <div class="top-bar" :class="{ hidden: !showUI }">
      <button class="top-btn" @click="goBack" title="返回">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <div class="top-center">
        <span class="now-playing-label">正在播放</span>
      </div>
      <button class="top-btn" @click="toggleFullscreen" title="全屏">
        <svg v-if="!isFullscreen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="4 8 4 3 9 3"/><polyline points="20 16 20 21 15 21"/><line x1="4" y1="3" x2="10" y2="9"/><line x1="20" y1="21" x2="14" y2="15"/></svg>
      </button>
    </div>

    <!-- Main content -->
    <div class="main-content" :class="{ hidden: !showUI }">
      <!-- Left: Cover + Info + Controls -->
      <div class="left-panel">
        <div class="cover-section">
          <div class="cover-art" :class="{ playing: player.isPlaying }" @click="togglePlay">
            <img v-if="player.currentSong?.coverUrl" :src="player.currentSong.coverUrl" alt="cover" />
            <span v-else class="placeholder-cover">♫</span>
            <div class="cover-overlay" v-if="!player.isPlaying">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
        </div>

        <!-- Song info + Progress merged -->
        <div class="info-progress">
          <div class="song-info">
            <div class="song-title">{{ player.currentSong?.title || '未在播放' }}</div>
            <div class="song-meta">
              {{ player.currentSong?.artist || '' }}
              <template v-if="player.currentSong?.album"> · {{ player.currentSong.album }}</template>
            </div>
          </div>
          <div class="progress-area">
            <span class="time">{{ formatTime(player.currentTime) }}</span>
            <div class="progress-track" @mousedown="onProgressMouseDown">
              <div class="progress-fill" :style="progressFillStyle" />
            </div>
            <span class="time">{{ formatTime(player.duration) }}</span>
          </div>
        </div>

        <!-- Controls: Volume · More · Prev · Play/Pause · Next · Lyrics -->
        <div class="control-area">
          <!-- Volume -->
          <button class="ctrl-btn" @click.stop="toggleVolPop()" title="音量">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path v-if="player.volume > 0" d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path v-if="player.volume > 30" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <line v-if="player.volume === 0" x1="23" y1="9" x2="17" y2="15" />
              <line v-if="player.volume === 0" x1="17" y1="9" x2="23" y2="15" />
            </svg>
            <div v-if="showVolPop" class="vol-popup" @click.stop>
              <div class="vol-slider-track" @mousedown.stop="onVolMouseDown">
                <div class="vol-slider-fill" :style="{ height: player.volume + '%' }" />
              </div>
              <span class="vol-num">{{ Math.round(player.volume) }}</span>
            </div>
          </button>

          <!-- More -->
          <button class="ctrl-btn" @click.stop="toggleMorePop()" title="更多">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <circle cx="5" cy="12" r="2.5" /><circle cx="12" cy="12" r="2.5" /><circle cx="19" cy="12" r="2.5" />
            </svg>
            <div v-if="showMorePop" class="more-popup" @click.stop>
              <div class="more-row" @click="cycleMode">
                <span>播放模式</span>
                <span class="more-val">{{ modeLabel }}</span>
              </div>
              <div class="more-row" @click="cycleSpeed">
                <span>倍速</span>
                <span class="more-val">{{ player.playbackRate }}x</span>
              </div>
            </div>
          </button>

          <!-- Previous -->
          <button class="ctrl-btn" @click="player.prev()" title="上一曲">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="2" y="5" width="2.5" height="14" rx="1" />
              <polygon points="14,5 7,12 14,19" />
              <polygon points="22,5 15,12 22,19" />
            </svg>
          </button>

          <!-- Play / Pause -->
          <button class="play-btn" @click="togglePlay" :title="player.isPlaying ? '暂停' : '播放'">
            <svg v-if="!player.isPlaying" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="6 3 20 12 6 21 6 3" />
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" />
            </svg>
          </button>

          <!-- Next -->
          <button class="ctrl-btn" @click="player.next()" title="下一曲">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="10,5 17,12 10,19" />
              <polygon points="2,5 9,12 2,19" />
              <rect x="19.5" y="5" width="2.5" height="14" rx="1" />
            </svg>
          </button>

          <!-- Lyrics -->
          <button class="ctrl-btn" @click="onLyricsClick" title="歌词">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Right: Lyrics -->
      <div class="right-panel">
        <div class="lyrics-wrapper" ref="lyricsRef">
          <div v-if="lyricLines.length === 0" class="no-lyrics">
            <div class="no-lyrics-title">{{ player.currentSong?.title || '未在播放' }}</div>
            <div class="no-lyrics-artist">{{ player.currentSong?.artist || '' }}</div>
            <div class="no-lyrics-hint">暂无歌词</div>
          </div>
          <div v-else class="lyrics-scroll">
            <div class="lyrics-padder" />
            <div
              v-for="(line, i) in lyricLines"
              :key="i"
              class="lyric-line"
              :class="{ active: activeLine === i }"
            >{{ line.text }}</div>
            <div class="lyrics-padder" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../stores/player'
import { useListenStore } from '../stores/listen'
import { useLyrics } from '../composables/useLyrics'
import { formatTime } from '../utils/format'
import { extractDominantColor, rgbToString } from '../utils/colorExtractor'
import type { PlayMode } from '../../shared/types'

const router = useRouter()
const player = usePlayerStore()
const listen = useListenStore()

const container = ref<HTMLElement | null>(null)
const lyricsRef = ref<HTMLElement | null>(null)
const showUI = ref(true)
const isFullscreen = ref(false)
const dominantColor = ref({ r: 200, g: 40, b: 50 })
const showMorePop = ref(false)
const showVolPop = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null
const hasInteracted = ref(false)

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

const currentLyrics = computed(() => player.currentSong?.lyrics)
const playerTime = computed(() => player.currentTime)
const { lines: lyricLines, activeIndex: activeLine } = useLyrics(currentLyrics, playerTime)

const progressLocked = computed(() => !!listen.currentRoom && !listen.isHost)

const themeColor = computed(() => rgbToString(dominantColor.value.r, dominantColor.value.g, dominantColor.value.b, 1))

const gradientStyle = computed(() => {
  const { r, g, b } = dominantColor.value
  return { background: rgbToString(r, g, b, 1) }
})

const progressFillStyle = computed(() => ({
  width: `${player.progress * 100}%`,
  background: themeColor.value,
}))

// Play mode
const modes: PlayMode[] = ['sequential', 'list-loop', 'single-loop', 'shuffle']
const modeLabels: Record<PlayMode, string> = {
  'sequential': '顺序播放', 'list-loop': '列表循环', 'single-loop': '单曲循环', 'shuffle': '随机播放',
}
const modeLabel = computed(() => modeLabels[player.playMode])

function cycleMode() {
  const idx = modes.indexOf(player.playMode)
  player.setPlayMode(modes[(idx + 1) % modes.length])
  closePopups()
}

function cycleSpeed() {
  const idx = speeds.indexOf(player.playbackRate)
  player.setPlaybackRate(speeds[(idx + 1) % speeds.length])
  closePopups()
}

function closePopups() {
  showMorePop.value = false
  showVolPop.value = false
}

function toggleVolPop() {
  if (showMorePop.value) showMorePop.value = false
  showVolPop.value = !showVolPop.value
}

function toggleMorePop() {
  if (showVolPop.value) showVolPop.value = false
  showMorePop.value = !showMorePop.value
}

function onLyricsClick() {
  if (lyricLines.value.length > 0 && activeLine.value >= 0) {
    scrollToActiveLine()
  }
}

// Extract dominant color when song changes — darken for readability on dark backgrounds
async function updateColor() {
  const url = player.currentSong?.coverUrl
  if (!url) {
    dominantColor.value = { r: 80, g: 16, b: 22 }
    return
  }
  try {
    const raw = await extractDominantColor(url)
    // Darken and reduce saturation for dark-mode readability (vibrant for Apple Music-like effect (multiply by ~0.75)
    dominantColor.value = {
      r: Math.round(raw.r * 0.75),
      g: Math.round(raw.g * 0.75),
      b: Math.round(raw.b * 0.75),
    }
  } catch {
    dominantColor.value = { r: 80, g: 16, b: 22 }
  }
}

watch(() => player.currentSong?.coverUrl, () => {
  updateColor()
})

// Playback
function togglePlay() {
  if (player.isPlaying) player.pause()
  else player.resume()
}

function goBack() {
  router.back()
}

// Drag state
const isDraggingProgress = ref(false)
const isDraggingVol = ref(false)

// ── Progress bar (click + drag) ──
function doProgressSeek(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  player.seekTo(ratio * player.duration)
}

function onProgressMouseDown(e: MouseEvent) {
  if (progressLocked.value) return
  isDraggingProgress.value = true
  doProgressSeek(e)
  document.addEventListener('mousemove', onProgressDrag)
  document.addEventListener('mouseup', onProgressMouseUp)
}

function onProgressDrag(e: MouseEvent) {
  if (!isDraggingProgress.value) return
  const track = container.value?.querySelector('.progress-track') as HTMLElement | null
  if (!track) return
  const rect = track.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  player.seekTo(ratio * player.duration)
}

function onProgressMouseUp() {
  isDraggingProgress.value = false
  document.removeEventListener('mousemove', onProgressDrag)
  document.removeEventListener('mouseup', onProgressMouseUp)
}

// ── Volume slider (click + drag) ──
function doVolumeSeek(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = 1 - (e.clientY - rect.top) / rect.height
  player.setVolume(ratio * 100)
}

function onVolMouseDown(e: MouseEvent) {
  isDraggingVol.value = true
  doVolumeSeek(e)
  document.addEventListener('mousemove', onVolDrag)
  document.addEventListener('mouseup', onVolMouseUp)
}

function onVolDrag(e: MouseEvent) {
  if (!isDraggingVol.value) return
  const track = container.value?.querySelector('.vol-slider-track') as HTMLElement | null
  if (!track) return
  const rect = track.getBoundingClientRect()
  const ratio = 1 - (e.clientY - rect.top) / rect.height
  player.setVolume(ratio * 100)
}

function onVolMouseUp() {
  isDraggingVol.value = false
  document.removeEventListener('mousemove', onVolDrag)
  document.removeEventListener('mouseup', onVolMouseUp)
}

function onDocClick() {
  closePopups()
}

// Fullscreen
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
    isFullscreen.value = true
  } else {
    document.exitFullscreen().catch(() => {})
    isFullscreen.value = false
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

// UI show/hide — only starts auto-hiding after first interaction
function onInteraction() {
  if (!hasInteracted.value) {
    hasInteracted.value = true
  }
  showUI.value = true
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { showUI.value = false }, 5000)
}

function onClickInteraction() {
  closePopups()
  onInteraction()
}

// Lyrics auto-scroll
function scrollToActiveLine() {
  if (activeLine.value < 0) return
  const el = lyricsRef.value?.querySelector('.lyric-line.active') as HTMLElement | null
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

watch(activeLine, () => {
  nextTick(() => scrollToActiveLine())
})

watch(lyricLines, (lines) => {
  if (lines.length > 0) {
    nextTick(() => scrollToActiveLine())
  }
})

// Keyboard
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') { goBack(); return }
  if (e.key === ' ') { e.preventDefault(); togglePlay(); return }
  if (e.key === 'ArrowLeft') { e.preventDefault(); player.seekTo(Math.max(0, player.currentTime - 5)); onInteraction(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); player.seekTo(Math.min(player.duration, player.currentTime + 5)); onInteraction(); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); player.setVolume(player.volume + 5); onInteraction(); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); player.setVolume(player.volume - 5); onInteraction(); return }
  onInteraction()
}

onMounted(() => {
  container.value?.focus()
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('click', onDocClick)
  updateColor()
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('mousemove', onProgressDrag)
  document.removeEventListener('mouseup', onProgressMouseUp)
  document.removeEventListener('mousemove', onVolDrag)
  document.removeEventListener('mouseup', onVolMouseUp)
  if (hideTimer) clearTimeout(hideTimer)
})
</script>

<style scoped>
.immersive {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  outline: none;
  overflow: hidden;
  font-family: inherit;
}

/* ── Background ── */
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: -2;
}
.bg-cover {
  position: absolute;
  inset: -80px;
  background-size: cover;
  background-position: center;
  filter: blur(60px) brightness(0.35) saturate(2);
}
.bg-gradient {  transition: background 1.5s ease;
  position: absolute;
  inset: 0;
}

/* ── Top bar ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  position: relative;
  z-index: 10;
  flex-shrink: 0;
  transition: opacity 0.5s;
}
.top-bar.hidden {
  opacity: 0;
  pointer-events: none;
}
.top-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.top-btn:hover {
  background: rgba(255,255,255,0.16);
  color: #fff;
}
.now-playing-label {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* ── Main content ── */
.main-content {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  padding: 0 80px 40px;
  gap: 80px;
  position: relative;
  z-index: 1;
  transition: opacity 0.6s;
}
.main-content.hidden {
  opacity: 0;
  pointer-events: none;
}

/* ── Left panel ── */
.left-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Cover */
.cover-section {
  position: relative;
}
.cover-art {
  width: 320px;
  height: 320px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
  transition: transform 0.4s, box-shadow 0.4s;
  cursor: pointer;
  position: relative;
}
.cover-art:hover {
  transform: scale(1.02);
  box-shadow: 0 24px 72px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
}
.cover-art.playing {
  animation: coverFloat 4s ease-in-out infinite;
}
.cover-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s;
}
.placeholder-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  color: rgba(255,255,255,0.2);
  background: linear-gradient(135deg, #2a2a3a, #1a1a2e);
}

@keyframes coverFloat {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.012); }
}

/* Info + Progress merged */
.info-progress {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.song-info {
  text-align: center;
  width: 100%;
}
.song-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.song-meta {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
  margin-top: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Progress */
.progress-area {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  cursor: pointer;
  position: relative;
  overflow: visible;
}
.progress-fill {
  height: 100%;
  border-radius: 2px;
  position: relative;
  transition: width 0.15s linear;
}
.progress-track:hover .progress-fill::after {
  opacity: 1;
}
.progress-fill::after {
  content: '';
  position: absolute;
  right: -5px;
  top: -4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(0,0,0,0.4);
  opacity: 0;
  transition: opacity 0.2s;
}
.time {
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* Controls: 6 buttons in one row */
.control-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  width: 100%;
}
.ctrl-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, transform 0.15s;
  position: relative;
}
.ctrl-btn:hover {
  color: #fff;
  transform: scale(1.1);
}
.play-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.play-btn:hover {
  transform: scale(1.06);
  background: rgba(255,255,255,0.18);
}

/* Volume popup */
.vol-popup {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30,30,40,0.96);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.06);
}
.vol-slider-track {
  width: 4px;
  height: 100px;
  border-radius: 2px;
  background: rgba(255,255,255,0.12);
  cursor: pointer;
  position: relative;
}
.vol-slider-fill {
  width: 100%;
  border-radius: 2px;
  background: rgba(255,255,255,0.7);
  position: absolute;
  bottom: 0;
  transition: height 0.1s;
}
.vol-num {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
  font-variant-numeric: tabular-nums;
}

/* More popup */
.more-popup {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30,30,40,0.96);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 6px 0;
  min-width: 150px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.06);
}
.more-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  font-size: 13px;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.more-row:hover {
  background: rgba(255,255,255,0.06);
  color: #fff;
}
.more-val {
  color: rgba(255,255,255,0.4);
  font-size: 12px;
}

/* ── Right panel: Lyrics ── */
.right-panel {
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lyrics-wrapper {
  width: 100%;
  max-width: 560px;
  height: 100%;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%);
}
.lyrics-scroll {
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 0 20px;
}
.lyrics-scroll::-webkit-scrollbar {
  display: none;
}
.lyrics-padder {
  height: calc(50% - 28px);
}

.lyric-line {
  font-size: 28px;
  font-weight: 700;
  color: rgba(255,255,255,0.28);
  line-height: 1.35;
  min-height: 44px;
  text-align: center;
  transition: color 0.5s, font-size 0.5s, font-weight 0.5s;
  word-break: break-word;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding: 4px 8px;
}
.lyric-line.active {
  color: #fff;
  font-size: 44px;
  font-weight: 800;
  line-height: 1.25;
  min-height: 60px;
}

/* No lyrics */
.no-lyrics {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.no-lyrics-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}
.no-lyrics-artist {
  font-size: 16px;
  color: rgba(255,255,255,0.4);
}
.no-lyrics-hint {
  font-size: 14px;
  color: rgba(255,255,255,0.2);
  margin-top: 40px;
}
</style>
