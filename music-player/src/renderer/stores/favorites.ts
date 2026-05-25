import { defineStore } from 'pinia'
import { ref, shallowRef, computed, watch } from 'vue'
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

  // Rebuild lookup Set reactively — O(1) lookup per call, O(n) rebuild on songs change
  const favoriteIds = shallowRef(new Set<number>(songs.value.map(s => s.id)))
  watch(songs, (s) => { favoriteIds.value = new Set(s.map(x => x.id)) }, { deep: false, immediate: false })

  const isFavorited = computed(() => {
    const ids = favoriteIds.value // track shallowRef
    return (songId: number) => ids.has(songId)
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

  return { songs, favoriteIds, isFavorited, toggleFavorite, removeFavorite, loadFavorites }
})
