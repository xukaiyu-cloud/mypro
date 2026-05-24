<template>
  <footer class="player-bar">
    <div v-if="player.currentSong" class="current-song">
      <div class="mini-cover accent-bg" @click="$router.push('/immersive')" title="点击进入沉浸式播放">
        <img v-if="player.currentSong.coverUrl" :src="player.currentSong.coverUrl" alt="cover" />
        <span v-else>♫</span>
      </div>
      <div class="song-info-text" @click="$router.push('/immersive')" style="cursor:pointer">
        <div class="name">{{ player.currentSong.title }}</div>
        <div class="artist">{{ player.currentSong.artist }}</div>
      </div>
      <span class="fav-btn" :class="{ favorited: currentFavorited }" @click.stop="toggleFav">{{ currentFavorited ? '❤️' : '🤍' }}</span>
    </div>
    <div v-else class="current-song">
      <span class="no-song">未在播放</span>
    </div>
    <div class="center-section">
      <PlayControls />
      <div class="control-meta">
        <span class="time">{{ formatTime(player.currentTime) }} / {{ formatTime(player.duration) }}</span>
        <span class="speed-btn" @click="cycleSpeed" :title="'倍速: ' + player.playbackRate + 'x'">
          {{ player.playbackRate === 1 ? '' : player.playbackRate + 'x' }}
        </span>
      </div>
      <ProgressBar :disabled="progressLocked" />
    </div>
    <div class="right-actions">
      <button class="settings-btn" @click="$router.push('/settings')" title="设置">
        <span>⚙</span>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useListenStore } from '../stores/listen'
import { useFavoritesStore } from '../stores/favorites'
import PlayControls from '../components/PlayControls.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { formatTime } from '../utils/format'

const player = usePlayerStore()
const listen = useListenStore()
const favStore = useFavoritesStore()
const progressLocked = computed(() => !!listen.currentRoom && !listen.isHost)
const currentFavorited = computed(() => player.currentSong ? favStore.isFavorited(player.currentSong.id) : false)

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

function cycleSpeed() {
  const idx = speeds.indexOf(player.playbackRate)
  const next = (idx + 1) % speeds.length
  player.setPlaybackRate(speeds[next])
}

function toggleFav() {
  if (!player.currentSong) return
  favStore.toggleFavorite(player.currentSong)
}
</script>

<style scoped>
.player-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 8px 20px;
  background: rgba(0,0,0,0.02);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--border-subtle);
}
.current-song {
  display: flex; align-items: center; gap: 10px; min-width: 0;
}
.no-song { color: var(--text-muted); font-size: 11px; }
.mini-cover {
  width: 42px; height: 42px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-base); font-size: 18px;
  background: var(--accent-gradient);
  cursor: pointer; overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
}
.mini-cover:hover { transform: scale(1.08); box-shadow: 0 0 12px rgba(30,80,162,0.2); }
.mini-cover img { width: 100%; height: 100%; object-fit: cover; }
.song-info-text .name { font-size: 11px; font-weight: 600; }
.song-info-text .artist { font-size: 10px; color: var(--text-accent); }
.fav-btn { color: var(--text-accent); font-size: 14px; cursor: pointer; transition: transform 0.15s; }
.fav-btn:hover { transform: scale(1.15); }
.fav-btn.favorited { color: var(--color-primary); }
.center-section {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
}
.control-meta {
  display: flex; align-items: center; gap: 12px;
}
.time { font-size: 10px; color: var(--text-muted); }
.speed-btn {
  font-size: 10px; color: var(--text-muted); cursor: pointer;
  min-width: 20px; text-align: center; font-weight: 600;
  padding: 1px 4px; border-radius: var(--radius-sm);
  border: 1px solid rgba(0,0,0,0.10);
}
.speed-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-accent); }
.right-actions {
  display: flex; align-items: center; gap: 8px; justify-self: end;
}
.settings-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.08); background: rgba(0,0,0,0.04);
  color: rgba(0,0,0,0.4); font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.2s, background 0.2s;
}
.settings-btn:hover { color: var(--text-accent); background: rgba(30,80,162,0.08); }
</style>
