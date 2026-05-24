import http from './index'
import type { ApiResponse } from '../types/api'

export const playApi = {
  resolveUrl: (hash: string, albumId: string, sourcePlatform = '', title = '', artist = '') =>
    http.post<ApiResponse<{ url: string }>>('/play/resolve', { hash, albumId, sourcePlatform, title, artist }).then(r => r.data),

  fetchLyrics: (hash: string, sourcePlatform = '', title = '', artist = '') =>
    http.post<ApiResponse<{ lyrics: string }>>('/play/lyrics', { hash, sourcePlatform, title, artist }).then(r => r.data),

  getPlatformConfig: () =>
    http.get<ApiResponse<{ neteaseCookie: string; kugouCookie: string; hasNeteaseCookie: boolean; hasKugouCookie: boolean }>>('/play/config').then(r => r.data),

  updatePlatformConfig: (data: { neteaseCookie?: string; kugouCookie?: string }) =>
    http.put<ApiResponse<null>>('/play/config', data).then(r => r.data),
}
