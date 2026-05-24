import http from './index'
import type { ApiResponse } from '../types/api'
import type { Playlist } from '../types/playlist'

export const syncApi = {
  upload: (playlists: Playlist[]) =>
    http.post<ApiResponse<null>>('/sync/upload', { playlists }).then(r => r.data),

  download: () =>
    http.get<ApiResponse<Playlist[]>>('/sync/download').then(r => r.data),

  merge: (conflicts: Record<number, 'local' | 'cloud'>) =>
    http.post<ApiResponse<null>>('/sync/merge', { conflicts }).then(r => r.data),
}
