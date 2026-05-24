import http from './index'
import type { ApiResponse } from '../types/api'
import type { Song } from '../types/song'

export const importApi = {
  parseFile: (formData: FormData) =>
    http.post<ApiResponse<Song[]>>('/import/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),

  parseLink: (url: string, platform: string) =>
    http.post<ApiResponse<Song[]>>('/import/link', { url, platform }).then(r => r.data),

  parseText: (text: string) =>
    http.post<ApiResponse<Song[]>>('/import/text', { text }).then(r => r.data),
}
