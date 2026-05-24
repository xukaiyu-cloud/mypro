import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song'
import { useAuthStore } from './auth'

function storageKey(): string {
  const uid = useAuthStore().userInfo?.id ?? 0
  return `favorites_${uid}`
}

export const useFavoritesStore = defineStore('favorites', () => {
  const songs = ref<Song[]>([])

  function loadFavorites() {
    const raw = localStorage.getItem(storageKey())
    songs.value = raw ? JSON.parse(raw) : []
  }

  function saveFavorites() {
    localStorage.setItem(storageKey(), JSON.stringify(songs.value))
  }

  const isFavorited = computed(() => {
    const set = new Set(songs.value.map(s => s.id))
    return (songId: number) => set.has(songId)
  })

  function toggleFavorite(song: Song) {
    const idx = songs.value.findIndex(s => s.id === song.id)
    if (idx >= 0) {
      songs.value.splice(idx, 1)
    } else {
      songs.value.unshift(song)
    }
    saveFavorites()
  }

  function removeFavorite(songId: number) {
    songs.value = songs.value.filter(s => s.id !== songId)
    saveFavorites()
  }

  // Eager-load
  loadFavorites()

  return { songs, isFavorited, toggleFavorite, removeFavorite, loadFavorites }
})
