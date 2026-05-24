import http from './index'
import type { ApiResponse } from '../types/api'
import type { Song } from '../types/song'

export interface PlaylistItem {
  id: number; name: string; coverUrl: string; playCount: number; trackCount: number; creator: string
}
export interface AlbumItem {
  id: number; name: string; artist: string; coverUrl: string; songCount: number
}
export interface ArtistItem {
  id: number; name: string; coverUrl: string; albumCount: number
}
export interface VideoItem {
  id: number; title: string; coverUrl: string; duration: number; playCount: number; artist: string
}
export interface SuggestItem {
  text: string; type: 'song' | 'history' | 'hot'
}
export interface TrendingItem {
  keyword: string; count: number
}
export interface HistoryItem {
  keyword: string; lastTime: string
}

export interface SearchData {
  query: string; explanation: string
  songs: Song[]; playlists: PlaylistItem[]; albums: AlbumItem[];
  artists: ArtistItem[]; videos: VideoItem[]; lyricSongs: Song[]
  searchType: 'ai' | 'normal'
}

export const searchApi = {
  aiSearch: (query: string) =>
    http.post<ApiResponse<SearchData>>('/search/ai', { query }).then(r => r.data),
  quickSearch: (query: string) =>
    http.post<ApiResponse<SearchData>>('/search/quick', { query }).then(r => r.data),
  suggest: (query: string) =>
    http.post<ApiResponse<{ suggestions: SuggestItem[] }>>('/search/suggest', { query }).then(r => r.data),
  trending: () =>
    http.get<ApiResponse<TrendingItem[]>>('/search/trending').then(r => r.data),
  history: () =>
    http.get<ApiResponse<HistoryItem[]>>('/search/history').then(r => r.data),
  playlistSongs: (playlistId: number) =>
    http.post<ApiResponse<{ songs: Song[] }>>('/search/playlist-songs', { playlistId }).then(r => r.data),
  clearHistory: () =>
    http.delete<ApiResponse<null>>('/search/history').then(r => r.data),
}
