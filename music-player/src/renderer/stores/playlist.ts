import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Playlist } from '../types/playlist'
import type { Song } from '../types/song'
import { useAuthStore } from './auth'
import { usePlayerStore } from './player'

function storageKey(): string {
  const uid = useAuthStore().userInfo?.id ?? 0
  return `localPlaylists_${uid}`
}

export const usePlaylistStore = defineStore('playlist', () => {
  const localPlaylists = ref<Playlist[]>([])
  const cloudPlaylists = ref<Playlist[]>([])
  const currentPlaylistId = ref<number | null>(null)

  async function fetchLocalPlaylists() {
    const raw = localStorage.getItem(storageKey())
    localPlaylists.value = raw ? JSON.parse(raw) : []
  }

  function saveLocal() {
    localStorage.setItem(storageKey(), JSON.stringify(localPlaylists.value))
  }

  function clearLocal() {
    localPlaylists.value = []
    cloudPlaylists.value = []
    currentPlaylistId.value = null
  }

  function createPlaylist(name: string, description = '') {
    const uid = useAuthStore().userInfo?.id ?? 0
    const p: Playlist = {
      id: Date.now(),
      userId: uid,
      name,
      description,
      sourceType: 'local',
      songs: [],
      updatedAt: new Date().toISOString(),
    }
    localPlaylists.value.push(p)
    saveLocal()
  }

  function updatePlaylist(id: number, data: Partial<Playlist>) {
    const idx = localPlaylists.value.findIndex(p => p.id === id)
    if (idx >= 0) {
      localPlaylists.value[idx] = { ...localPlaylists.value[idx], ...data, updatedAt: new Date().toISOString() }
      saveLocal()
    }
  }

  function deletePlaylist(id: number) {
    localPlaylists.value = localPlaylists.value.filter(p => p.id !== id)
    saveLocal()
  }

  function addSongsToPlaylist(playlistId: number, songs: Song[]) {
    const idx = localPlaylists.value.findIndex(p => p.id === playlistId)
    if (idx < 0) return
    const pl = localPlaylists.value[idx]
    const existing = new Set(pl.songs.map(s => `${s.title}|${s.artist}`))
    const newSongs = songs.filter(s => !existing.has(`${s.title}|${s.artist}`))
    if (newSongs.length === 0) return 0
    // Assign unique IDs to prevent collisions with existing songs
    const maxId = pl.songs.reduce((max, s) => Math.max(max, s.id), 0)
    newSongs.forEach((s, i) => { s.id = maxId + i + 1 })
    pl.songs.push(...newSongs)
    pl.updatedAt = new Date().toISOString()
    saveLocal()
    // Sync to player queue if currently playing from this playlist
    usePlayerStore().syncAddedSongs(playlistId, newSongs)
    return newSongs.length
  }

  function removeSongFromPlaylist(playlistId: number, songId: number) {
    const idx = localPlaylists.value.findIndex(p => p.id === playlistId)
    if (idx < 0) return
    const pl = localPlaylists.value[idx]
    pl.songs = pl.songs.filter(s => s.id !== songId)
    pl.updatedAt = new Date().toISOString()
    saveLocal()
  }

  return {
    localPlaylists, cloudPlaylists, currentPlaylistId,
    fetchLocalPlaylists, createPlaylist, updatePlaylist, deletePlaylist, clearLocal,
    addSongsToPlaylist, removeSongFromPlaylist, saveLocal,
  }
})
