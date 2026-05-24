import http from './index'
import type { ApiResponse } from '../types/api'

export interface LocalSong {
  id: number; title: string; artist: string; album: string
  duration: number; filePath: string; coverUrl: string
  sourcePlatform: string; externalLink: string
}

export const localApi = {
  scan: (folder: string) =>
    http.post<ApiResponse<LocalSong[]>>('/local/scan', { folder }).then(r => r.data),
  importSongs: (songs: LocalSong[]) =>
    http.post<ApiResponse<{ imported: number }>>('/local/import', { songs }).then(r => r.data),
  getSongs: () =>
    http.get<ApiResponse<LocalSong[]>>('/local/songs').then(r => r.data),
}