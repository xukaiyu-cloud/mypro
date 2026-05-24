import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, LoginRequest } from '../types/user'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const savedToken = localStorage.getItem('token')
  const token = ref<string>(savedToken || '')
  const userInfo = ref<UserInfo | null>(null)
  const initialized = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  async function restoreSession() {
    if (initialized.value) return
    if (!token.value) {
      initialized.value = true
      return
    }
    try {
      const res = await authApi.getProfile()
      userInfo.value = res.data
      const { usePlaylistStore } = await import('./playlist')
      usePlaylistStore().fetchLocalPlaylists()
    } catch {
      // Token expired or invalid — clear it
      token.value = ''
      userInfo.value = null
      localStorage.removeItem('token')
    } finally {
      initialized.value = true
    }
  }

  async function login(data: LoginRequest) {
    const res = await authApi.login(data)
    token.value = res.data.token
    userInfo.value = res.data.user
    localStorage.setItem('token', res.data.token)
    // Load user-specific playlists after login
    const { usePlaylistStore } = await import('./playlist')
    usePlaylistStore().fetchLocalPlaylists()
  }

  async function register(data: { username: string; email: string; password: string }) {
    await authApi.register(data)
  }

  async function fetchProfile() {
    const res = await authApi.getProfile()
    userInfo.value = res.data
  }

  async function logout() {
    const { usePlaylistStore } = await import('./playlist')
    usePlaylistStore().clearLocal()
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, isLoggedIn, initialized, restoreSession, login, register, fetchProfile, logout }
})
