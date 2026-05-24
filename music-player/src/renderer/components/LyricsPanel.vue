<template>
  <div class="lyrics-panel glass-panel" ref="panelRef">
    <div v-if="lyricLines.length === 0" class="placeholder-text">
      {{ player.currentSong ? '暂无歌词' : '未在播放' }}
    </div>
    <div v-else class="lyrics-scroll" ref="scrollRef">
      <p v-for="(line, i) in lyricLines" :key="i" class="lyric-line"
        :class="{ active: activeLine === i }">{{ line.text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useLyrics } from '../composables/useLyrics'

const player = usePlayerStore()
const scrollRef = ref<HTMLElement | null>(null)

const lyricsSource = computed(() => player.currentSong?.lyrics)
const playerTime = computed(() => player.currentTime)
const { lines: lyricLines, activeIndex: activeLine } = useLyrics(lyricsSource, playerTime)

watch(activeLine, () => {
  nextTick(() => {
    const el = scrollRef.value?.querySelector('.lyric-line.active') as HTMLElement | null
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
})
</script>

<style scoped>
.lyrics-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 10px;
  border-radius: var(--radius-md);;
}

.lyrics-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scroll-behavior: smooth;
  text-align: center;
  mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
}

.lyric-line {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 22px; height: 22px;
  transition: color 0.35s, font-size 0.35s, font-weight 0.35s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyric-line.active {
  color: var(--text-accent, #57adde);
  font-size: 13px;
  font-weight: 600;
}

.placeholder-text {
  color: var(--text-muted, rgba(0,0,0,0.35));
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
}
</style>
