import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SyncStatus } from '../../shared/types'
import { syncApi } from '../api/sync'
import { usePlaylistStore } from './playlist'
import type { Playlist } from '../types/playlist'
import { extractError } from '../utils/error'

export const useSyncStore = defineStore('sync', () => {
  const lastSyncTime = ref<string | null>(null)
  const syncStatus = ref<SyncStatus>('idle')

  async function uploadPlaylists() {
    syncStatus.value = 'syncing'
    try {
      const playlists = usePlaylistStore().localPlaylists
      if (playlists.length === 0) {
        ElMessage.warning('没有可上传的歌单')
        syncStatus.value = 'idle'
        return
      }
      const data = playlists.map(pl => ({
        name: pl.name,
        description: pl.description,
        songs: pl.songs.map(s => ({
          title: s.title, artist: s.artist, album: s.album, duration: s.duration,
          filePath: s.filePath, coverUrl: s.coverUrl, sourcePlatform: s.sourcePlatform,
          externalLink: s.externalLink,
        })),
      }))
      await syncApi.upload(data as unknown as Playlist[])
      syncStatus.value = 'success'
      lastSyncTime.value = new Date().toISOString()
      ElMessage.success(`成功上传 ${playlists.length} 个歌单`)
    } catch (e: unknown) {
      syncStatus.value = 'error'
      ElMessage.error(extractError(e, '上传失败'))
    }
  }

  async function downloadPlaylists() {
    syncStatus.value = 'syncing'
    try {
      const res = await syncApi.download()
      const cloudPlaylists = res.data
      if (!cloudPlaylists || cloudPlaylists.length === 0) {
        ElMessage.info('云端暂无歌单')
        syncStatus.value = 'idle'
        return
      }
      const playlistStore = usePlaylistStore()
      let added = 0
      for (const cloud of cloudPlaylists) {
        const exists = playlistStore.localPlaylists.find(
          p => p.name === cloud.name && p.userId === cloud.userId
        )
        if (!exists) {
          playlistStore.localPlaylists.push({
            id: Date.now() + Math.random(),
            userId: cloud.userId,
            name: cloud.name,
            description: cloud.description,
            sourceType: 'cloud',
            songs: (cloud.songs || []).map((s: Record<string, unknown>) => ({
              id: Date.now() + Math.random(),
              title: String(s.title || ''),
              artist: String(s.artist || ''),
              album: String(s.album || ''),
              duration: Number(s.duration) || 240,
              filePath: String(s.filePath || ''),
              coverUrl: String(s.coverUrl || ''),
              sourcePlatform: String(s.sourcePlatform || ''),
              externalLink: String(s.externalLink || ''),
            })),
            updatedAt: cloud.updatedAt || new Date().toISOString(),
          })
          added++
        }
      }
      if (added > 0) {
        playlistStore.saveLocal()
      }
      syncStatus.value = 'success'
      lastSyncTime.value = new Date().toISOString()
      ElMessage.success(`从云端同步 ${added} 个歌单`)
    } catch (e: unknown) {
      syncStatus.value = 'error'
      ElMessage.error(extractError(e, '下载失败'))
    }
  }

  return { lastSyncTime, syncStatus, uploadPlaylists, downloadPlaylists }
})
