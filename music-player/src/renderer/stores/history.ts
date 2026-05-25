import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Song } from '../types/song'
import { useAuthStore } from './auth'

const MAX_HISTORY = 200
let saveTimer: ReturnType<typeof setTimeout> | null = null

function storageKey(): string {
  const uid = useAuthStore().userInfo?.id ?? 0
  return `playHistory_${uid}`
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<Song[]>([])

  function loadHistory() {
    const raw = localStorage.getItem(storageKey())
    history.value = raw ? JSON.parse(raw) : []
  }

  function saveHistory() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      localStorage.setItem(storageKey(), JSON.stringify(history.value))
    }, 300)
  }

  function addToHistory(song: Song) {
    // Remove duplicate if exists
    history.value = history.value.filter(s => s.id !== song.id)
    // Insert at head
    history.value.unshift(song)
    // Trim to max
    if (history.value.length > MAX_HISTORY) {
      history.value = history.value.slice(0, MAX_HISTORY)
    }
    saveHistory()
  }

  function removeFromHistory(songId: number) {
    history.value = history.value.filter(s => s.id !== songId)
    saveHistory()
  }

  function clearHistory() {
    history.value = []
    saveHistory()
  }

  // Eager-load on store creation so addToHistory doesn't overwrite existing data
  loadHistory()

  return {
    history,
    loadHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
  }
})
