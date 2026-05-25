import http from './index'
import type { ApiResponse } from '../types/api'
import type { AuthResponse, LoginRequest, RegisterRequest, UserInfo } from '../types/user'

export const authApi = {
  login: (data: LoginRequest) =>
    http.post<ApiResponse<AuthResponse>>('/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    http.post<ApiResponse<null>>('/register', data).then(r => r.data),

  logout: () =>
    http.post<ApiResponse<null>>('/logout').then(r => r.data),

  getProfile: () =>
    http.get<ApiResponse<UserInfo>>('/user/profile').then(r => r.data),

  updateAvatar: (avatar: string) =>
    http.post<ApiResponse<{ avatar: string }>>('/user/avatar', { avatar }).then(r => r.data),
}