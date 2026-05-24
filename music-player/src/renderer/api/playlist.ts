import http from './index'
import type { ApiResponse } from '../types/api'
import type { Playlist } from '../types/playlist'
import type { Song } from '../types/song'

export const playlistApi = {
  getList: () =>
    http.get<ApiResponse<Playlist[]>>('/playlists').then(r => r.data),

  create: (data: Partial<Playlist>) =>
    http.post<ApiResponse<Playlist>>('/playlists', data).then(r => r.data),

  update: (id: number, data: Partial<Playlist>) =>
    http.put<ApiResponse<Playlist>>(`/playlists/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    http.delete<ApiResponse<null>>(`/playlists/${id}`).then(r => r.data),

  getSongs: (playlistId: number) =>
    http.get<ApiResponse<Song[]>>(`/playlists/${playlistId}/songs`).then(r => r.data),

  addSong: (playlistId: number, song: Song) =>
    http.post<ApiResponse<null>>(`/playlists/${playlistId}/songs`, song).then(r => r.data),

  removeSong: (playlistId: number, songId: number) =>
    http.delete<ApiResponse<null>>(`/playlists/${playlistId}/songs/${songId}`).then(r => r.data),
}
