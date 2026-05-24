import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song'
import type { PlayMode } from '../../shared/types'
import { useHistoryStore } from './history'

export const usePlayerStore = defineStore('player', () => {
  const playlist = ref<Song[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(70)
  const playbackRate = ref(1)
  const playMode = ref<PlayMode>('list-loop')
  // Track which playlist the player queue was loaded from, so newly added songs
  // can be synced into the playback queue automatically.
  const sourcePlaylistId = ref<number | null>(null)

  const currentSong = computed<Song | null>(() =>
    currentIndex.value >= 0 ? playlist.value[currentIndex.value] ?? null : null
  )

  const progress = computed(() =>
    duration.value > 0 ? currentTime.value / duration.value : 0
  )

  function play(song: Song) {
    const idx = playlist.value.findIndex(s => s.id === song.id)
    if (idx >= 0) {
      if (idx === currentIndex.value) {
        // Same song: restart from beginning
        currentTime.value = 0
        isPlaying.value = true
        return
      }
      currentIndex.value = idx
    } else {
      playlist.value.push(song)
      currentIndex.value = playlist.value.length - 1
    }
    isPlaying.value = true
    duration.value = song.duration
    useHistoryStore().addToHistory(song)
  }

  function pause() { isPlaying.value = false }
  function resume() { isPlaying.value = true }

  function next() {
    if (playlist.value.length === 0) return
    if (playMode.value === 'shuffle') {
      currentIndex.value = Math.floor(Math.random() * playlist.value.length)
    } else {
      currentIndex.value = (currentIndex.value + 1) % playlist.value.length
    }
    isPlaying.value = true
  }

  function prev() {
    if (playlist.value.length === 0) return
    if (currentTime.value > 3) {
      currentTime.value = 0
      isPlaying.value = true
      return
    }
    currentIndex.value = currentIndex.value <= 0
      ? playlist.value.length - 1
      : currentIndex.value - 1
    isPlaying.value = true
  }

  function seekTo(time: number) { currentTime.value = time }
  function setVolume(v: number) { volume.value = Math.max(0, Math.min(100, v)) }
  function setPlaybackRate(rate: number) { playbackRate.value = rate }
  function setPlayMode(mode: PlayMode) { playMode.value = mode }

  /** Append newly added songs to the playback queue if they belong to the source playlist. */
  function syncAddedSongs(playlistId: number, songs: Song[]) {
    if (playlistId !== sourcePlaylistId.value) return
    for (const song of songs) {
      if (!playlist.value.find(s => s.id === song.id)) {
        playlist.value.push(song)
      }
    }
  }

  function removeFromQueue(index: number) {
    if (index < 0 || index >= playlist.value.length) return
    playlist.value.splice(index, 1)
    if (index < currentIndex.value) {
      currentIndex.value--
    } else if (index === currentIndex.value) {
      if (playlist.value.length === 0) {
        currentIndex.value = -1
        isPlaying.value = false
      } else if (currentIndex.value >= playlist.value.length) {
        currentIndex.value = playlist.value.length - 1
      }
    }
  }

  function moveInQueue(fromIndex: number, toIndex: number) {
    if (fromIndex < 0 || fromIndex >= playlist.value.length) return
    if (toIndex < 0 || toIndex >= playlist.value.length) return
    if (fromIndex === toIndex) return
    const [song] = playlist.value.splice(fromIndex, 1)
    playlist.value.splice(toIndex, 0, song)
    if (currentIndex.value === fromIndex) {
      currentIndex.value = toIndex
    } else if (fromIndex < currentIndex.value && toIndex >= currentIndex.value) {
      currentIndex.value--
    } else if (fromIndex > currentIndex.value && toIndex <= currentIndex.value) {
      currentIndex.value++
    }
  }

  /** Replace the entire queue and play the song at the given index. */
  function playFromList(songs: Song[], index: number, playlistId?: number | null) {
    playlist.value = [...songs]
    if (playlistId !== undefined) sourcePlaylistId.value = playlistId
    currentIndex.value = index
    isPlaying.value = true
    duration.value = songs[index].duration
    useHistoryStore().addToHistory(songs[index])
  }

  function clearQueue() {
    playlist.value = []
    currentIndex.value = -1
    isPlaying.value = false
  }

  return {
    playlist, currentIndex, isPlaying, currentTime, duration, volume, playbackRate, playMode,
    sourcePlaylistId, currentSong, progress,
    play, pause, resume, next, prev, seekTo, setVolume, setPlaybackRate, setPlayMode,
    syncAddedSongs, removeFromQueue, moveInQueue, clearQueue, playFromList,
  }
})
