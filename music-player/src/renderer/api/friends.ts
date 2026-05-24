import http from './index'
import type { ApiResponse } from '../types/api'

export interface FriendInfo {
  id: number
  friendId: number
  friendName: string
  status: string
  createdAt: string
}

export interface FriendRequest {
  id: number
  fromUserId: number
  fromUsername: string
  status: string
  createdAt: string
}

export interface UserSearchResult {
  id: number
  username: string
  created_at: string
}

export const friendsApi = {
  getList: () =>
    http.get<ApiResponse<{ friends: FriendInfo[]; incoming: FriendRequest[] }>>('/friends/list').then(r => r.data),

  searchUsers: (q: string) =>
    http.get<ApiResponse<UserSearchResult[]>>('/friends/search', { params: { q } }).then(r => r.data),

  sendRequest: (friendId: number) =>
    http.post<ApiResponse<null>>('/friends/request', { friendId }).then(r => r.data),

  acceptRequest: (requestId: number) =>
    http.post<ApiResponse<null>>('/friends/accept', { requestId }).then(r => r.data),

  remove: (id: number) =>
    http.delete<ApiResponse<null>>(`/friends/${id}`).then(r => r.data),

  poke: (friendId: number) =>
    http.post<ApiResponse<null>>('/friends/poke', { friendId }).then(r => r.data),
}
