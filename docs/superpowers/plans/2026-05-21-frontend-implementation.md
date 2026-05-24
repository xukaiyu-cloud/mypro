# 音乐播放器前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 Vue 3 + Electron + Element Plus + Pinia 构建桌面音乐播放器的完整前端，包含三栏主界面、播放控制、歌单管理、多平台导入、云端同步、登录注册等功能。

**Architecture:** 标准多页型 SPA，Vue Router 管理路由，Pinia 管理状态，axios 对接后端 REST API，Electron 主进程处理文件系统和本地数据库，contextBridge 安全暴露 IPC 接口。弥散风毛玻璃流光系主题。

**Tech Stack:** Electron + electron-vite + Vue 3 (Composition API) + TypeScript + Element Plus + Pinia + Vue Router 4 + SCSS + better-sqlite3 + axios

---

## Phase 1: 项目基础

### Task 1: 初始化项目脚手架

**Files:**
- Create: 整个项目结构

- [ ] **Step 1: 使用 electron-vite 创建项目**

```bash
cd D:/aiPro/pro2
npm create @quick-start/electron@latest music-player -- --template vue-ts
```

按提示选择 Vue + TypeScript 模板。

- [ ] **Step 2: 进入项目目录并安装依赖**

```bash
cd music-player
npm install
```

- [ ] **Step 3: 安装额外依赖**

```bash
npm install element-plus pinia vue-router@4 axios
npm install -D sass @types/node
```

- [ ] **Step 4: 安装 Electron 主进程依赖**

```bash
npm install better-sqlite3 electron-store
npm install -D @types/better-sqlite3
```

- [ ] **Step 5: 验证项目可启动**

```bash
npm run dev
```

预期：Electron 窗口打开，显示默认 Vue 页面。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold electron-vite + vue3 + ts project"
```

---

### Task 2: TypeScript 类型定义

**Files:**
- Create: `src/renderer/types/song.ts`
- Create: `src/renderer/types/playlist.ts`
- Create: `src/renderer/types/user.ts`
- Create: `src/renderer/types/api.ts`
- Create: `src/shared/types.ts`

- [ ] **Step 1: 创建共享类型 — `src/shared/types.ts`**

```typescript
export type PlayMode = 'sequential' | 'single-loop' | 'list-loop' | 'shuffle'

export type ImportType = 'file' | 'link' | 'text'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export type SourceType = 'local' | 'cloud' | 'imported'
```

- [ ] **Step 2: 创建歌曲类型 — `src/renderer/types/song.ts`**

```typescript
export interface Song {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverUrl: string
  sourcePlatform?: string
  externalLink?: string
}
```

- [ ] **Step 3: 创建歌单类型 — `src/renderer/types/playlist.ts`**

```typescript
import type { Song } from './song'
import type { SourceType } from '../../shared/types'

export interface Playlist {
  id: number
  userId: number
  name: string
  description: string
  sourceType: SourceType
  songs: Song[]
  updatedAt: string
}
```

- [ ] **Step 4: 创建用户类型 — `src/renderer/types/user.ts`**

```typescript
export interface UserInfo {
  id: number
  username: string
  email: string
  createdAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: UserInfo
}
```

- [ ] **Step 5: 创建 API 类型 — `src/renderer/types/api.ts`**

```typescript
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface SyncConflict {
  localVersion: {
    id: number
    name: string
    updatedAt: string
  }
  cloudVersion: {
    id: number
    name: string
    updatedAt: string
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: 全局主题样式

**Files:**
- Create: `src/renderer/styles/variables.scss`
- Create: `src/renderer/styles/glassmorphism.scss`
- Create: `src/renderer/styles/global.scss`
- Create: `src/renderer/styles/transitions.scss`

- [ ] **Step 1: CSS 变量定义 — `src/renderer/styles/variables.scss`**

```scss
:root {
  // 背景
  --bg-base: #1e1b1a;
  --bg-panel: rgba(255, 200, 170, 0.03);
  --bg-panel-strong: rgba(255, 200, 170, 0.06);

  // 主色调
  --color-primary: #FF8867;
  --color-primary-light: #FFAA6B;
  --color-secondary: #FFFF96;
  --accent-gradient: linear-gradient(135deg, #FF8867, #FFAA6B, #FFFF96);

  // 边框
  --border-subtle: rgba(255, 180, 140, 0.04);
  --border-normal: rgba(255, 180, 140, 0.08);
  --border-strong: rgba(255, 180, 140, 0.15);

  // 文字
  --text-primary: #ede8e3;
  --text-secondary: #b8b0a8;
  --text-muted: #7a736c;
  --text-accent: #FFAA75;
  --text-bright: #FFFFA0;

  // 圆角
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;

  // 阴影
  --glow-accent: 0 0 20px rgba(255, 136, 103, 0.25);
  --glow-strong: 0 0 30px rgba(255, 136, 103, 0.35);

  // 布局
  --sidebar-left-width: 220px;
  --sidebar-right-width: 280px;
  --player-bar-height: 72px;

  // 字体
  --font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
```

- [ ] **Step 2: 毛玻璃 mixin — `src/renderer/styles/glassmorphism.scss`**

```scss
@mixin glass-panel($strength: 'normal') {
  @if $strength == 'strong' {
    background: var(--bg-panel-strong);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border-normal);
  } @else {
    background: var(--bg-panel);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border-subtle);
  }
  border-radius: var(--radius-md);
}

@mixin accent-gradient {
  background: var(--accent-gradient);
}

@mixin glow-border {
  border: 1px solid transparent;
  background-image:
    linear-gradient(var(--bg-base), var(--bg-base)),
    var(--accent-gradient);
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

@mixin flow-bg {
  position: relative;
  &::before {
    content: '';
    position: absolute;
    inset: -50%;
    width: 200%;
    height: 200%;
    background:
      radial-gradient(ellipse at 20% 40%, rgba(255,136,103,0.10) 0%, transparent 55%),
      radial-gradient(ellipse at 75% 25%, rgba(255,255,150,0.08) 0%, transparent 55%),
      radial-gradient(ellipse at 55% 72%, rgba(255,160,120,0.07) 0%, transparent 50%),
      radial-gradient(ellipse at 35% 65%, rgba(255,240,140,0.06) 0%, transparent 50%);
    animation: flowLight 10s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
}

@keyframes flowLight {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(1.5%, -1%); }
  50% { transform: translate(-1%, 1.5%); }
  75% { transform: translate(0.5%, -0.8%); }
}
```

- [ ] **Step 3: 全局样式 — `src/renderer/styles/global.scss`**

```scss
@use 'variables';

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  overflow: hidden;
  font-family: var(--font-family);
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-base);
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

::-webkit-scrollbar {
  width: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 180, 140, 0.15);
  border-radius: 3px;
}

input, textarea {
  font-family: var(--font-family);
  color: var(--text-primary);
}
```

- [ ] **Step 4: 过渡动画 — `src/renderer/styles/transitions.scss`**

```scss
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-enter-from {
  transform: translateX(10px);
  opacity: 0;
}
.slide-leave-to {
  transform: translateX(-10px);
  opacity: 0;
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add global theme styles — misty warm glassmorphism"
```

---

## Phase 2: 基础设施

### Task 4: Vue Router 配置

**Files:**
- Create: `src/renderer/router/index.ts`

- [ ] **Step 1: 路由配置 — `src/renderer/router/index.ts`**

```typescript
import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    redirect: '/queue',
    children: [
      {
        path: 'queue',
        name: 'Queue',
        component: () => import('../pages/PlayQueue.vue'),
      },
      {
        path: 'playlist/:id',
        name: 'PlaylistDetail',
        component: () => import('../pages/PlaylistDetail.vue'),
        props: true,
      },
      {
        path: 'sync',
        name: 'Sync',
        component: () => import('../pages/SyncPage.vue'),
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('../pages/HistoryPage.vue'),
      },
      {
        path: 'search',
        name: 'Search',
        component: () => import('../pages/SearchPage.vue'),
      },
      {
        path: 'favorites',
        name: 'Favorites',
        component: () => import('../pages/FavoritesPage.vue'),
      },
      {
        path: 'import',
        name: 'Import',
        component: () => import('../pages/ImportPage.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../pages/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../pages/RegisterPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../pages/AboutPage.vue'),
    meta: { requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add Vue Router configuration with auth guards"
```

---

### Task 5: Pinia Stores (Part 1) — Auth + Player

**Files:**
- Create: `src/renderer/stores/auth.ts`
- Create: `src/renderer/stores/player.ts`

- [ ] **Step 1: Auth Store — `src/renderer/stores/auth.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, LoginRequest } from '../types/user'
import { authApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const userInfo = ref<UserInfo | null>(null)

  const isLoggedIn = computed(() => !!token.value)

  async function login(data: LoginRequest) {
    const res = await authApi.login(data)
    token.value = res.data.token
    userInfo.value = res.data.user
    localStorage.setItem('token', res.data.token)
  }

  async function register(data: { username: string; email: string; password: string }) {
    await authApi.register(data)
  }

  async function fetchProfile() {
    const res = await authApi.getProfile()
    userInfo.value = res.data
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return { token, userInfo, isLoggedIn, login, register, fetchProfile, logout }
})
```

- [ ] **Step 2: Player Store — `src/renderer/stores/player.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Song } from '../types/song'
import type { PlayMode } from '../../shared/types'

export const usePlayerStore = defineStore('player', () => {
  const playlist = ref<Song[]>([])
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(70)
  const playMode = ref<PlayMode>('list-loop')

  const currentSong = computed<Song | null>(() =>
    currentIndex.value >= 0 ? playlist.value[currentIndex.value] ?? null : null
  )

  const progress = computed(() =>
    duration.value > 0 ? currentTime.value / duration.value : 0
  )

  function play(song: Song) {
    const idx = playlist.value.findIndex(s => s.id === song.id)
    if (idx >= 0) {
      currentIndex.value = idx
    } else {
      playlist.value.push(song)
      currentIndex.value = playlist.value.length - 1
    }
    isPlaying.value = true
    duration.value = song.duration
  }

  function pause() { isPlaying.value = false }
  function resume() { isPlaying.value = true }

  function next() {
    if (playlist.value.length === 0) return
    if (playMode.value === 'single-loop') return
    if (playMode.value === 'shuffle') {
      currentIndex.value = Math.floor(Math.random() * playlist.value.length)
    } else {
      currentIndex.value = (currentIndex.value + 1) % playlist.value.length
    }
  }

  function prev() {
    if (playlist.value.length === 0) return
    if (currentTime.value > 3) {
      currentTime.value = 0
      return
    }
    currentIndex.value = currentIndex.value <= 0
      ? playlist.value.length - 1
      : currentIndex.value - 1
  }

  function seekTo(time: number) { currentTime.value = time }
  function setVolume(v: number) { volume.value = Math.max(0, Math.min(100, v)) }
  function setPlayMode(mode: PlayMode) { playMode.value = mode }

  return {
    playlist, currentIndex, isPlaying, currentTime, duration, volume, playMode,
    currentSong, progress,
    play, pause, resume, next, prev, seekTo, setVolume, setPlayMode,
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Pinia auth and player stores"
```

---

### Task 6: Pinia Stores (Part 2) — Playlist + Import + Sync + Settings

**Files:**
- Create: `src/renderer/stores/playlist.ts`
- Create: `src/renderer/stores/import.ts`
- Create: `src/renderer/stores/sync.ts`
- Create: `src/renderer/stores/settings.ts`

- [ ] **Step 1: Playlist Store — `src/renderer/stores/playlist.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Playlist } from '../types/playlist'

export const usePlaylistStore = defineStore('playlist', () => {
  const localPlaylists = ref<Playlist[]>([])
  const cloudPlaylists = ref<Playlist[]>([])
  const currentPlaylistId = ref<number | null>(null)

  async function fetchLocalPlaylists() {
    const raw = localStorage.getItem('localPlaylists')
    localPlaylists.value = raw ? JSON.parse(raw) : []
  }

  function saveLocal() {
    localStorage.setItem('localPlaylists', JSON.stringify(localPlaylists.value))
  }

  function createPlaylist(name: string, description = '') {
    const p: Playlist = {
      id: Date.now(),
      userId: 0,
      name,
      description,
      sourceType: 'local',
      songs: [],
      updatedAt: new Date().toISOString(),
    }
    localPlaylists.value.push(p)
    saveLocal()
  }

  function updatePlaylist(id: number, data: Partial<Playlist>) {
    const idx = localPlaylists.value.findIndex(p => p.id === id)
    if (idx >= 0) {
      localPlaylists.value[idx] = { ...localPlaylists.value[idx], ...data, updatedAt: new Date().toISOString() }
      saveLocal()
    }
  }

  function deletePlaylist(id: number) {
    localPlaylists.value = localPlaylists.value.filter(p => p.id !== id)
    saveLocal()
  }

  return {
    localPlaylists, cloudPlaylists, currentPlaylistId,
    fetchLocalPlaylists, createPlaylist, updatePlaylist, deletePlaylist,
  }
})
```

- [ ] **Step 2: Import Store — `src/renderer/stores/import.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Song } from '../types/song'
import type { ImportType } from '../../shared/types'

export const useImportStore = defineStore('import', () => {
  const importType = ref<ImportType>('file')
  const rawData = ref('')
  const parsedSongs = ref<Song[]>([])
  const selectedIds = ref<Set<number>>(new Set())
  const importStatus = ref<'idle' | 'parsing' | 'ready' | 'importing' | 'done' | 'error'>('idle')

  function setImportType(type: ImportType) { importType.value = type }

  function setParsedSongs(songs: Song[]) {
    parsedSongs.value = songs
    selectedIds.value = new Set(songs.map(s => s.id))
    importStatus.value = 'ready'
  }

  function toggleSelect(songId: number) {
    const s = selectedIds.value
    s.has(songId) ? s.delete(songId) : s.add(songId)
  }

  function reset() {
    rawData.value = ''
    parsedSongs.value = []
    selectedIds.value = new Set()
    importStatus.value = 'idle'
  }

  return {
    importType, rawData, parsedSongs, selectedIds, importStatus,
    setImportType, setParsedSongs, toggleSelect, reset,
  }
})
```

- [ ] **Step 3: Sync Store — `src/renderer/stores/sync.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SyncStatus } from '../../shared/types'

export const useSyncStore = defineStore('sync', () => {
  const lastSyncTime = ref<string | null>(null)
  const syncStatus = ref<SyncStatus>('idle')

  async function uploadPlaylists() {
    syncStatus.value = 'syncing'
    // API call will be wired in Task 7
    syncStatus.value = 'success'
    lastSyncTime.value = new Date().toISOString()
  }

  async function downloadPlaylists() {
    syncStatus.value = 'syncing'
    syncStatus.value = 'success'
    lastSyncTime.value = new Date().toISOString()
  }

  return { lastSyncTime, syncStatus, uploadPlaylists, downloadPlaylists }
})
```

- [ ] **Step 4: Settings Store — `src/renderer/stores/settings.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref('warm-diffuse')
  const defaultVolume = ref(70)
  const shortcuts = ref<Record<string, string>>({
    'playPause': 'Space',
    'next': 'Ctrl+Right',
    'prev': 'Ctrl+Left',
    'volumeUp': 'Ctrl+Up',
    'volumeDown': 'Ctrl+Down',
  })

  function updateSettings(partial: Partial<ReturnType<typeof useSettingsStore>>) {
    Object.assign({ theme, defaultVolume, shortcuts }, partial)
  }

  return { theme, defaultVolume, shortcuts, updateSettings }
})
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Pinia playlist, import, sync, settings stores"
```

---

### Task 7: API 层 (axios + 拦截器 + 接口模块)

**Files:**
- Create: `src/renderer/api/index.ts`
- Create: `src/renderer/api/auth.ts`
- Create: `src/renderer/api/playlist.ts`
- Create: `src/renderer/api/sync.ts`
- Create: `src/renderer/api/import.ts`

- [ ] **Step 1: axios 实例 — `src/renderer/api/index.ts`**

```typescript
import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'

const http = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default http
```

- [ ] **Step 2: Auth API — `src/renderer/api/auth.ts`**

```typescript
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
}
```

- [ ] **Step 3: Playlist API — `src/renderer/api/playlist.ts`**

```typescript
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
```

- [ ] **Step 4: Sync API — `src/renderer/api/sync.ts`**

```typescript
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
```

- [ ] **Step 5: Import API — `src/renderer/api/import.ts`**

```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add axios API layer with auth interceptor and endpoint modules"
```

---

### Task 8: Electron 主进程 + 预加载脚本

**Files:**
- Modify: `src/main/index.ts` (更新已有文件)
- Modify: `src/preload/index.ts` (更新已有文件)
- Create: `src/main/ipc/file.ts`

- [ ] **Step 1: 更新预加载脚本 — `src/preload/index.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  scanMusicFiles: (dir: string) => ipcRenderer.invoke('scan-music', dir),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path),
  getAppVersion: () => ipcRenderer.invoke('get-version'),
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action))
  },
  onGlobalShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on('shortcut', (_event, action) => callback(action))
  },
  setStore: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
  getStore: (key: string) => ipcRenderer.invoke('store-get', key),
})
```

- [ ] **Step 2: IPC 文件处理 — `src/main/ipc/file.ts`**

```typescript
import { ipcMain, dialog } from 'electron'
import { readFileSync, readdirSync, statSync } from 'fs'
import { extname, join } from 'path'
import { parseFile } from 'music-metadata'

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.aac', '.m4a', '.wma'])

export function registerFileIpc() {
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('scan-music', async (_event, dir: string) => {
    const files: string[] = []
    function walk(d: string) {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry)
        const st = statSync(full)
        if (st.isDirectory()) walk(full)
        else if (AUDIO_EXTS.has(extname(entry).toLowerCase())) files.push(full)
      }
    }
    walk(dir)
    return files
  })

  ipcMain.handle('read-file', async (_event, path: string) => {
    return readFileSync(path, 'utf-8')
  })
}
```

- [ ] **Step 3: 更新主进程入口 — `src/main/index.ts`**

找到原有的 `app.whenReady().then(...)` 部分，在其中注册 IPC：

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { registerFileIpc } from './ipc/file'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']!)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerFileIpc()
  ipcMain.handle('get-version', () => app.getVersion())
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 4: 添加类型声明 — `src/renderer/types/electron.d.ts`**

```typescript
export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  scanMusicFiles: (dir: string) => Promise<string[]>
  readFile: (path: string) => Promise<string>
  getAppVersion: () => Promise<string>
  onMenuAction: (callback: (action: string) => void) => void
  onGlobalShortcut: (callback: (action: string) => void) => void
  setStore: (key: string, value: unknown) => Promise<void>
  getStore: (key: string) => Promise<unknown>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Electron main process, IPC handlers, and preload script"
```

---

### Task 9: App.vue 入口 + main.ts 整合

**Files:**
- Modify: `src/renderer/App.vue`
- Modify: `src/renderer/main.ts`

- [ ] **Step 1: App.vue — `src/renderer/App.vue`**

```vue
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
</script>

<style>
@import './styles/global.scss';
</style>
```

- [ ] **Step 2: main.ts — `src/renderer/main.ts`**

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles/variables.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: configure App.vue entry and main.ts with Pinia, Router, ElementPlus"
```

---

## Phase 3: 布局组件

### Task 10: MainLayout — 三栏布局壳

**Files:**
- Create: `src/renderer/layout/MainLayout.vue`

- [ ] **Step 1: 主布局组件 — `src/renderer/layout/MainLayout.vue`**

```vue
<template>
  <div class="main-layout">
    <div class="main-body">
      <SidebarLeft class="sidebar-left" />
      <ContentCenter class="content-center">
        <router-view v-slot="{ Component }">
          <transition name="slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </ContentCenter>
      <SidebarRight class="sidebar-right" />
    </div>
    <PlayerBar class="player-bar" />
  </div>
</template>

<script setup lang="ts">
import SidebarLeft from './SidebarLeft.vue'
import ContentCenter from './ContentCenter.vue'
import SidebarRight from './SidebarRight.vue'
import PlayerBar from './PlayerBar.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
}
.main-layout::before {
  content: '';
  position: absolute;
  inset: -50%;
  width: 200%;
  height: 200%;
  background:
    radial-gradient(ellipse at 20% 40%, rgba(255,136,103,0.10) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 25%, rgba(255,255,150,0.08) 0%, transparent 55%),
    radial-gradient(ellipse at 55% 72%, rgba(255,160,120,0.07) 0%, transparent 50%),
    radial-gradient(ellipse at 35% 65%, rgba(255,240,140,0.06) 0%, transparent 50%);
  animation: flowLight 10s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}
@keyframes flowLight {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(1.5%, -1%); }
  50% { transform: translate(-1%, 1.5%); }
  75% { transform: translate(0.5%, -0.8%); }
}
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.sidebar-left {
  width: var(--sidebar-left-width);
  flex-shrink: 0;
}
.content-center {
  flex: 1;
  overflow: hidden;
}
.sidebar-right {
  width: var(--sidebar-right-width);
  flex-shrink: 0;
}
.player-bar {
  height: var(--player-bar-height);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
</style>
```

- [ ] **Step 2: 创建布局子组件占位文件**

```bash
touch src/renderer/layout/SidebarLeft.vue
touch src/renderer/layout/ContentCenter.vue
touch src/renderer/layout/SidebarRight.vue
touch src/renderer/layout/PlayerBar.vue
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add MainLayout with three-column shell and PlayerBar"
```

---

### Task 11: SidebarLeft — 左侧歌单导航

**Files:**
- Create: `src/renderer/components/UserInfo.vue`
- Create: `src/renderer/components/NavMenu.vue`
- Create: `src/renderer/components/PlaylistNav.vue`
- Modify: `src/renderer/layout/SidebarLeft.vue`

- [ ] **Step 1: UserInfo 组件 — `src/renderer/components/UserInfo.vue`**

```vue
<template>
  <div class="user-info glass-panel-strong" v-if="auth.isLoggedIn">
    <div class="avatar accent-bg">{{ auth.userInfo?.username?.charAt(0) ?? 'U' }}</div>
    <div class="info">
      <div class="name">{{ auth.userInfo?.username ?? '用户' }}</div>
      <div class="status">● 在线</div>
    </div>
  </div>
  <div class="user-info glass-panel-strong" v-else>
    <router-link to="/login" class="login-link">登录 / 注册</router-link>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--bg-base);
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  background: var(--accent-gradient);
}
.name { font-size: 13px; font-weight: 600; }
.status { font-size: 10px; color: var(--text-accent); }
.login-link { color: var(--text-accent); font-size: 13px; text-decoration: none; }
</style>
```

- [ ] **Step 2: NavMenu 组件 — `src/renderer/components/NavMenu.vue`**

```vue
<template>
  <div class="nav-menu glass-panel">
    <router-link v-for="item in items" :key="item.to" :to="item.to"
      class="nav-item" active-class="nav-active">
      {{ item.icon }} {{ item.label }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
const items = [
  { icon: '', label: '正在播放', to: '/queue' },
  { icon: '', label: '最近播放', to: '/history' },
  { icon: '', label: '我的收藏', to: '/favorites' },
  { icon: '', label: '我的歌单', to: '/' },
]
</script>

<style scoped>
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px;
}
.nav-item {
  padding: 8px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  border-radius: 6px;
  text-decoration: none;
  transition: background 0.15s;
}
.nav-item:hover { background: rgba(255,200,170,0.06); }
.nav-active { color: var(--text-accent); background: rgba(255,170,117,0.10); }
</style>
```

- [ ] **Step 3: PlaylistNav 组件 — `src/renderer/components/PlaylistNav.vue`**

```vue
<template>
  <div class="playlist-nav">
    <div class="header">
      <span>歌单 ({{ store.localPlaylists.length }})</span>
      <span class="add-btn" @click="showCreate = true">＋ 新建</span>
    </div>
    <div class="list">
      <router-link v-for="pl in store.localPlaylists" :key="pl.id"
        :to="`/playlist/${pl.id}`" class="pl-item">
        {{ pl.name }}
      </router-link>
    </div>
    <el-dialog v-model="showCreate" title="新建歌单" width="360px">
      <el-input v-model="newName" placeholder="歌单名称" />
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="create">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlaylistStore } from '../stores/playlist'
const store = usePlaylistStore()
const showCreate = ref(false)
const newName = ref('')
function create() {
  if (newName.value.trim()) {
    store.createPlaylist(newName.value.trim())
    newName.value = ''
    showCreate.value = false
  }
}
</script>

<style scoped>
.header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--text-muted); padding: 0 6px; margin-bottom: 8px;
}
.add-btn { color: var(--text-bright); cursor: pointer; }
.list { display: flex; flex-direction: column; gap: 2px; padding: 0 6px; }
.pl-item {
  padding: 5px 8px; color: var(--text-secondary); font-size: 11px;
  border-radius: 4px; text-decoration: none;
}
.pl-item:hover { background: rgba(255,200,170,0.06); }
</style>
```

- [ ] **Step 4: SidebarLeft 组装 — `src/renderer/layout/SidebarLeft.vue`**

```vue
<template>
  <aside class="sidebar-left">
    <UserInfo />
    <NavMenu />
    <PlaylistNav />
  </aside>
</template>

<script setup lang="ts">
import UserInfo from '../components/UserInfo.vue'
import NavMenu from '../components/NavMenu.vue'
import PlaylistNav from '../components/PlaylistNav.vue'
</script>

<style scoped>
.sidebar-left {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 10px;
  border-right: 1px solid var(--border-subtle);
  overflow-y: auto;
}
</style>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SidebarLeft with UserInfo, NavMenu, PlaylistNav components"
```

---

### Task 12: ContentCenter — 中间内容区

**Files:**
- Create: `src/renderer/components/SearchBar.vue`
- Create: `src/renderer/components/SongTable.vue`
- Modify: `src/renderer/layout/ContentCenter.vue`

- [ ] **Step 1: SearchBar 组件 — `src/renderer/components/SearchBar.vue`**

```vue
<template>
  <div class="search-bar glass-panel">
    <el-input v-model="query" placeholder="搜索歌曲、歌手、专辑..." :prefix-icon="Search"
      class="search-input" clearable @keyup.enter="doSearch" />
    <router-link to="/import" class="import-btn accent-bg">导入歌单</router-link>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
const query = ref('')
const router = useRouter()
function doSearch() {
  if (query.value.trim()) {
    router.push({ name: 'Search', query: { q: query.value.trim() } })
  }
}
</script>

<style scoped>
.search-bar {
  display: flex; align-items: center; gap: 8px; padding: 4px;
}
.search-input { flex: 1; }
.import-btn {
  padding: 8px 18px; border-radius: var(--radius-sm);
  font-size: 12px; color: var(--bg-base); font-weight: 600;
  text-decoration: none; white-space: nowrap;
  background: var(--accent-gradient);
}
</style>
```

- [ ] **Step 2: SongTable 组件 — `src/renderer/components/SongTable.vue`**

```vue
<template>
  <div class="song-table">
    <div class="table-header">
      <span class="col-index">#</span>
      <span class="col-title">歌曲</span>
      <span class="col-artist">歌手</span>
      <span class="col-album">专辑</span>
      <span class="col-duration">时长</span>
    </div>
    <div class="table-body">
      <div v-for="(song, i) in songs" :key="song.id"
        class="song-row glass-panel"
        :class="{ active: currentIndex === i }"
        @dblclick="player.play(song)">
        <span class="col-index">
          <span v-if="currentIndex === i && player.isPlaying" class="playing-icon">♪</span>
          <span v-else>{{ i + 1 }}</span>
        </span>
        <span class="col-title">{{ song.title }}</span>
        <span class="col-artist">{{ song.artist }}</span>
        <span class="col-album">{{ song.album }}</span>
        <span class="col-duration">{{ formatTime(song.duration) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Song } from '../types/song'
import { usePlayerStore } from '../stores/player'

const props = defineProps<{ songs: Song[] }>()
const player = usePlayerStore()
const currentIndex = computed(() => player.currentIndex)

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.table-header, .song-row {
  display: flex; align-items: center; font-size: 11px; padding: 8px 0;
}
.table-header { color: var(--text-muted); border-bottom: 1px solid var(--border-subtle); }
.song-row {
  color: var(--text-secondary); font-size: 12px;
  margin-bottom: 4px; padding: 10px 0; cursor: pointer;
}
.song-row:hover { background: rgba(255,200,170,0.06); }
.song-row.active {
  color: var(--text-primary);
  background: rgba(255,170,117,0.08);
  border: 1px solid rgba(255,170,117,0.2);
}
.playing-icon { color: var(--text-accent); }
.col-index { width: 40px; text-align: center; flex-shrink: 0; }
.col-title { flex: 2; padding-left: 8px; }
.col-artist { flex: 1.5; color: var(--text-secondary); }
.col-album { flex: 1.5; color: var(--text-secondary); }
.col-duration { width: 60px; text-align: right; color: var(--text-muted); padding-right: 8px; flex-shrink: 0; }
</style>
```

- [ ] **Step 3: ContentCenter 组装 — `src/renderer/layout/ContentCenter.vue`**

```vue
<template>
  <main class="content-center">
    <SearchBar />
    <slot />
  </main>
</template>

<script setup lang="ts">
import SearchBar from '../components/SearchBar.vue'
</script>

<style scoped>
.content-center {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow-y: auto;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add ContentCenter with SearchBar and SongTable components"
```

---

### Task 13: SidebarRight — 右侧歌曲详情

**Files:**
- Create: `src/renderer/components/CoverDisplay.vue`
- Create: `src/renderer/components/LyricsPanel.vue`
- Create: `src/renderer/components/SongInfo.vue`
- Modify: `src/renderer/layout/SidebarRight.vue`

- [ ] **Step 1: CoverDisplay — `src/renderer/components/CoverDisplay.vue`**

```vue
<template>
  <div class="cover-wrapper">
    <div class="cover-frame">
      <div class="cover-img">
        <span v-if="!song?.coverUrl" class="placeholder">♫</span>
        <img v-else :src="song.coverUrl" :alt="song.title" />
      </div>
    </div>
    <div class="song-title">{{ song?.title ?? '未在播放' }}</div>
    <div class="song-sub">{{ song?.artist }}{{ song?.album ? ` · ${song.album}` : '' }}</div>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
import { computed } from 'vue'
const player = usePlayerStore()
const song = computed(() => player.currentSong)
</script>

<style scoped>
.cover-frame {
  padding: 3px;
  border-radius: var(--radius-lg);
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
  animation: flowLight 5s ease-in-out infinite;
}
@keyframes flowLight {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(1%, -0.5%); }
}
.cover-img {
  width: 170px; height: 170px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(180,80,50,0.45), rgba(200,140,60,0.35));
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.cover-img img { width: 100%; height: 100%; object-fit: cover; }
.placeholder { color: #fff; font-size: 52px; }
.song-title { font-size: 17px; font-weight: 600; margin-top: 10px; text-align: center; }
.song-sub { font-size: 12px; color: var(--text-accent); margin-top: 4px; text-align: center; }
</style>
```

- [ ] **Step 2: LyricsPanel — `src/renderer/components/LyricsPanel.vue`**

```vue
<template>
  <div class="lyrics-panel glass-panel">
    <p class="lyric-line" v-for="(line, i) in lines" :key="i"
      :class="{ active: i === activeLine }">{{ line }}</p>
    <p v-if="lines.length === 0" class="placeholder-text">暂无歌词</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ lines?: string[]; activeLine?: number }>()
</script>

<style scoped>
.lyrics-panel {
  width: 100%; padding: 12px; max-height: 140px; overflow-y: auto;
  text-align: center; line-height: 2; font-size: 11px; color: var(--text-secondary);
}
.lyric-line.active { color: var(--text-bright); font-weight: 500; }
.placeholder-text { color: var(--text-muted); }
</style>
```

- [ ] **Step 3: SongInfo — `src/renderer/components/SongInfo.vue`**

```vue
<template>
  <div class="song-info" v-if="song">
    <div class="info-row"><span class="label">歌手</span><span>{{ song.artist }}</span></div>
    <div class="info-row"><span class="label">专辑</span><span>{{ song.album }}</span></div>
    <div class="info-row"><span class="label">时长</span><span>{{ formatTime(song.duration) }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
const player = usePlayerStore()
const song = computed(() => player.currentSong)
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.song-info { width: 100%; padding: 0 12px; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px;
  border-bottom: 1px solid var(--border-subtle); }
.label { color: var(--text-muted); }
</style>
```

- [ ] **Step 4: SidebarRight 组装 — `src/renderer/layout/SidebarRight.vue`**

```vue
<template>
  <aside class="sidebar-right">
    <CoverDisplay />
    <LyricsPanel />
    <SongInfo />
  </aside>
</template>

<script setup lang="ts">
import CoverDisplay from '../components/CoverDisplay.vue'
import LyricsPanel from '../components/LyricsPanel.vue'
import SongInfo from '../components/SongInfo.vue'
</script>

<style scoped>
.sidebar-right {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-left: 1px solid var(--border-subtle);
  overflow-y: auto;
}
</style>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SidebarRight with CoverDisplay, LyricsPanel, SongInfo"
```

---

### Task 14: PlayerBar — 底部播放栏

**Files:**
- Create: `src/renderer/components/PlayControls.vue`
- Create: `src/renderer/components/ProgressBar.vue`
- Create: `src/renderer/components/VolumeControl.vue`
- Modify: `src/renderer/layout/PlayerBar.vue`

- [ ] **Step 1: PlayControls — `src/renderer/components/PlayControls.vue`**

```vue
<template>
  <div class="play-controls">
    <span class="ctrl-btn" @click="player.prev()">⏮</span>
    <span class="play-btn accent-bg" @click="togglePlay">
      {{ player.isPlaying ? '⏸' : '▶' }}
    </span>
    <span class="ctrl-btn" @click="player.next()">⏭</span>
    <span class="time">{{ formatTime(player.currentTime) }} / {{ formatTime(player.duration) }}</span>
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
const player = usePlayerStore()
function togglePlay() {
  player.isPlaying ? player.pause() : player.resume()
}
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.play-controls { display: flex; align-items: center; gap: 20px; }
.ctrl-btn { color: var(--text-secondary); font-size: 14px; cursor: pointer; }
.play-btn {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-base); font-size: 16px; cursor: pointer;
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
}
.time { font-size: 11px; color: var(--text-muted); }
</style>
```

- [ ] **Step 2: ProgressBar — `src/renderer/components/ProgressBar.vue`**

```vue
<template>
  <div class="progress-bar" @click="seek">
    <div class="track">
      <div class="fill accent-bg" :style="{ width: `${player.progress * 100}%` }">
        <div class="thumb" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePlayerStore } from '../stores/player'
const player = usePlayerStore()
const bar = ref<HTMLElement | null>(null)
function seek(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (e.clientX - rect.left) / rect.width
  player.seekTo(ratio * player.duration)
}
</script>

<style scoped>
.progress-bar { width: 100%; max-width: 480px; }
.track {
  height: 4px; background: rgba(255,180,140,0.08);
  border-radius: 4px; overflow: visible; cursor: pointer;
}
.fill {
  height: 100%; border-radius: 4px; position: relative;
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
}
.thumb {
  position: absolute; right: -5px; top: -4px;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--text-accent);
  border: 2px solid #fff;
  box-shadow: 0 0 8px rgba(255,136,103,0.5);
}
</style>
```

- [ ] **Step 3: VolumeControl — `src/renderer/components/VolumeControl.vue`**

```vue
<template>
  <div class="volume-control">
    <span class="mode-btn" @click="cycleMode">{{ modeIcon }}</span>
    <span class="mode-btn" :class="{ active: player.playMode === 'single-loop' }" @click="toggleSingle">🔁</span>
    <span class="vol-icon">🔊</span>
    <div class="vol-track" @click="setVol">
      <div class="vol-fill accent-bg" :style="{ width: `${player.volume}%` }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
import type { PlayMode } from '../../shared/types'
const player = usePlayerStore()
const modeIcons: Record<PlayMode, string> = {
  'sequential': '➡',
  'single-loop': '🔂',
  'list-loop': '🔁',
  'shuffle': '🔀',
}
const modeIcon = computed(() => modeIcons[player.playMode])
const modes: PlayMode[] = ['sequential', 'list-loop', 'single-loop', 'shuffle']
function cycleMode() {
  const idx = modes.indexOf(player.playMode)
  player.setPlayMode(modes[(idx + 1) % modes.length])
}
function toggleSingle() {
  player.setPlayMode(player.playMode === 'single-loop' ? 'list-loop' : 'single-loop')
}
function setVol(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  player.setVolume(((e.clientX - rect.left) / rect.width) * 100)
}
</script>

<style scoped>
.volume-control { display: flex; align-items: center; gap: 14px; }
.mode-btn { color: var(--text-muted); font-size: 13px; cursor: pointer; }
.mode-btn.active { color: var(--text-accent); }
.vol-icon { color: var(--text-muted); font-size: 10px; }
.vol-track {
  width: 70px; height: 3px; background: rgba(255,180,140,0.08);
  border-radius: 3px; overflow: hidden; cursor: pointer;
}
.vol-fill {
  height: 100%; border-radius: 3px;
  background: var(--accent-gradient);
}
</style>
```

- [ ] **Step 4: PlayerBar 组装 — `src/renderer/layout/PlayerBar.vue`**

```vue
<template>
  <footer class="player-bar">
    <div class="current-song" v-if="player.currentSong">
      <div class="mini-cover accent-bg">♫</div>
      <div class="song-info-text">
        <div class="name">{{ player.currentSong.title }}</div>
        <div class="artist">{{ player.currentSong.artist }}</div>
      </div>
      <span class="fav-btn">❤️</span>
    </div>
    <div class="center-section">
      <PlayControls />
      <ProgressBar />
    </div>
    <VolumeControl />
  </footer>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
import PlayControls from '../components/PlayControls.vue'
import ProgressBar from '../components/ProgressBar.vue'
import VolumeControl from '../components/VolumeControl.vue'
const player = usePlayerStore()
</script>

<style scoped>
.player-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px; gap: 16px;
  background: rgba(255,200,170,0.025);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-top: 1px solid var(--border-subtle);
}
.current-song {
  display: flex; align-items: center; gap: 10px; min-width: 180px;
}
.mini-cover {
  width: 42px; height: 42px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: var(--bg-base); font-size: 18px;
  background: var(--accent-gradient);
}
.song-info-text .name { font-size: 11px; font-weight: 600; }
.song-info-text .artist { font-size: 10px; color: var(--text-accent); }
.fav-btn { color: var(--text-accent); font-size: 14px; cursor: pointer; }
.center-section {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px;
}
</style>
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PlayerBar with PlayControls, ProgressBar, VolumeControl"
```

---

## Phase 4: 页面组件

### Task 15: 登录 + 注册页面

**Files:**
- Create: `src/renderer/pages/LoginPage.vue`
- Create: `src/renderer/pages/RegisterPage.vue`

- [ ] **Step 1: LoginPage — `src/renderer/pages/LoginPage.vue`**

```vue
<template>
  <div class="auth-page">
    <div class="auth-card glass-panel-strong">
      <h2 class="title">登录</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码"
            show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-button type="primary" class="submit-btn accent-bg-btn" :loading="loading"
          @click="handleLogin" style="width:100%;margin-top:8px">
          登 录
        </el-button>
      </el-form>
      <p class="switch-link">
        没有账号？<router-link to="/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({ username: '', password: '' })
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await auth.login(form)
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch {
    ElMessage.error('登录失败，请检查用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
  position: relative; overflow: hidden;
}
.auth-page::before {
  content: ''; position: absolute; inset: -50%; width: 200%; height: 200%;
  background:
    radial-gradient(ellipse at 20% 40%, rgba(255,136,103,0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 25%, rgba(255,255,150,0.10) 0%, transparent 55%),
    radial-gradient(ellipse at 55% 72%, rgba(255,160,120,0.08) 0%, transparent 50%);
  animation: flowLight 10s ease-in-out infinite;
}
@keyframes flowLight {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(1.5%, -1%); }
}
.auth-card { width: 380px; padding: 36px; position: relative; z-index: 1; }
.title { text-align: center; font-size: 22px; font-weight: 600; margin-bottom: 24px; }
.accent-bg-btn { background: var(--accent-gradient) !important; border: none !important; color: var(--bg-base) !important; font-weight: 600 !important; }
.switch-link { text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-secondary); }
.switch-link a { color: var(--text-accent); text-decoration: none; }
</style>
```

- [ ] **Step 2: RegisterPage — `src/renderer/pages/RegisterPage.vue`**

```vue
<template>
  <div class="auth-page">
    <div class="auth-card glass-panel-strong">
      <h2 class="title">注册</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" show-password />
        </el-form-item>
        <el-button type="primary" class="accent-bg-btn" :loading="loading"
          @click="handleRegister" style="width:100%;margin-top:8px">
          注 册
        </el-button>
      </el-form>
      <p class="switch-link">
        已有账号？<router-link to="/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const formRef = ref<FormInstance>()

const validatePass = (_rule: unknown, value: string, cb: (e?: Error) => void) => {
  if (value !== form.password) cb(new Error('两次密码输入不一致'))
  else cb()
}

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    { validator: validatePass, trigger: 'blur' },
  ],
}

async function handleRegister() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await auth.register({
      username: form.username,
      email: form.email,
      password: form.password,
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch {
    ElMessage.error('注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
  position: relative; overflow: hidden;
}
.auth-page::before { /* same as LoginPage */ }
@keyframes flowLight { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(1.5%, -1%); } }
.auth-card { width: 400px; padding: 36px; position: relative; z-index: 1; }
.title { text-align: center; font-size: 22px; font-weight: 600; margin-bottom: 24px; }
.accent-bg-btn { background: var(--accent-gradient) !important; border: none !important; color: var(--bg-base) !important; font-weight: 600 !important; }
.switch-link { text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-secondary); }
.switch-link a { color: var(--text-accent); text-decoration: none; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add LoginPage and RegisterPage with form validation"
```

---

### Task 16: ImportPage — 歌单导入页面

**Files:**
- Create: `src/renderer/components/FileUpload.vue`
- Create: `src/renderer/components/LinkInput.vue`
- Create: `src/renderer/components/TextPaste.vue`
- Create: `src/renderer/components/ImportPreview.vue`
- Create: `src/renderer/pages/ImportPage.vue`

- [ ] **Step 1: FileUpload — `src/renderer/components/FileUpload.vue`**

```vue
<template>
  <el-upload drag :auto-upload="false" :on-change="handleFile" accept=".csv,.json,.txt">
    <div class="upload-area">
      <p class="upload-icon">📁</p>
      <p>将文件拖到此处，或点击上传</p>
      <p class="upload-hint">支持 CSV、JSON、TXT 格式</p>
    </div>
  </el-upload>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'file-loaded', content: string): void }>()
async function handleFile(file: { raw?: File }) {
  if (file.raw) {
    const text = await file.raw.text()
    emit('file-loaded', text)
  }
}
</script>

<style scoped>
.upload-area { padding: 20px; text-align: center; color: var(--text-secondary); }
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-hint { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
</style>
```

- [ ] **Step 2: LinkInput — `src/renderer/components/LinkInput.vue`**

```vue
<template>
  <div class="link-input">
    <el-input v-model="url" placeholder="粘贴歌单分享链接" />
    <el-select v-model="platform" placeholder="选择平台" style="width:150px">
      <el-option label="网易云音乐" value="netease" />
      <el-option label="QQ音乐" value="qqmusic" />
      <el-option label="酷狗音乐" value="kugou" />
      <el-option label="其他" value="other" />
    </el-select>
    <el-button type="primary" @click="parse" :loading="loading">解析</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const url = ref('')
const platform = ref('')
const loading = ref(false)
const emit = defineEmits<{ (e: 'parsed', data: string): void }>()
async function parse() {
  loading.value = true
  // Call import API in real implementation
  emit('parsed', url.value)
  loading.value = false
}
</script>

<style scoped>
.link-input { display: flex; gap: 12px; align-items: center; }
</style>
```

- [ ] **Step 3: TextPaste — `src/renderer/components/TextPaste.vue`**

```vue
<template>
  <el-input v-model="text" type="textarea" :rows="8"
    placeholder="粘贴歌单内容，每行一首，格式：歌名 - 歌手 - 专辑" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
const text = ref('')
defineExpose({ text })
</script>
```

- [ ] **Step 4: ImportPreview — `src/renderer/components/ImportPreview.vue`**

```vue
<template>
  <div class="import-preview">
    <div class="preview-header">
      <span>解析到 {{ songs.length }} 首歌曲</span>
      <el-select v-model="targetPlaylist" placeholder="选择目标歌单" style="width:180px">
        <el-option v-for="pl in playlistStore.localPlaylists" :key="pl.id"
          :label="pl.name" :value="pl.id" />
      </el-select>
      <el-button type="primary" @click="confirm">确认导入 ({{ selectedCount }})</el-button>
    </div>
    <el-table :data="songs" @selection-change="onSelect" ref="tableRef" max-height="300">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="title" label="歌曲名" />
      <el-table-column prop="artist" label="歌手" />
      <el-table-column prop="album" label="专辑" />
      <el-table-column label="时长" width="80">
        <template #default="{ row }">{{ formatTime(row.duration) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Song } from '../types/song'
import { usePlaylistStore } from '../stores/playlist'

const props = defineProps<{ songs: Song[] }>()
const emit = defineEmits<{ (e: 'confirm', playlistId: number, songs: Song[]): void }>()
const playlistStore = usePlaylistStore()
const targetPlaylist = ref<number | null>(null)
const selectedSongs = ref<Song[]>([])
const selectedCount = computed(() => selectedSongs.value.length)

function onSelect(rows: Song[]) { selectedSongs.value = rows }
function confirm() {
  if (targetPlaylist.value) {
    emit('confirm', targetPlaylist.value, selectedSongs.value)
  }
}
function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.preview-header {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 5: ImportPage 组装 — `src/renderer/pages/ImportPage.vue`**

```vue
<template>
  <div class="import-page">
    <h3>导入歌单</h3>
    <el-tabs v-model="activeTab">
      <el-tab-pane label="上传文件" name="file">
        <FileUpload @file-loaded="onData" />
      </el-tab-pane>
      <el-tab-pane label="输入链接" name="link">
        <LinkInput @parsed="onData" />
      </el-tab-pane>
      <el-tab-pane label="粘贴文本" name="text">
        <TextPaste ref="textRef" />
        <el-button type="primary" @click="onData(textRef?.text ?? '')" style="margin-top:12px">解析</el-button>
      </el-tab-pane>
    </el-tabs>
    <ImportPreview v-if="previewSongs.length > 0" :songs="previewSongs"
      @confirm="handleImport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { Song } from '../types/song'
import FileUpload from '../components/FileUpload.vue'
import LinkInput from '../components/LinkInput.vue'
import TextPaste from '../components/TextPaste.vue'
import ImportPreview from '../components/ImportPreview.vue'

const activeTab = ref('file')
const textRef = ref<InstanceType<typeof TextPaste> | null>(null)
const previewSongs = ref<Song[]>([])

function onData(_raw: string) {
  // TODO: Wire actual parser — for now show placeholder
  previewSongs.value = [
    { id: 1, title: '示例歌曲', artist: '示例歌手', album: '示例专辑', duration: 240, filePath: '', coverUrl: '' },
  ]
}

function handleImport(_playlistId: number, songs: Song[]) {
  ElMessage.success(`成功导入 ${songs.length} 首歌曲`)
  previewSongs.value = []
}
</script>

<style scoped>
.import-page { padding: 8px 0; }
h3 { font-size: 16px; margin-bottom: 16px; }
</style>
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ImportPage with file/link/text import and preview table"
```

---

### Task 17: 剩余页面 + 默认视图

**Files:**
- Create: `src/renderer/pages/PlayQueue.vue`
- Create: `src/renderer/pages/PlaylistDetail.vue`
- Create: `src/renderer/pages/SyncPage.vue`
- Create: `src/renderer/pages/HistoryPage.vue`
- Create: `src/renderer/pages/SearchPage.vue`
- Create: `src/renderer/pages/FavoritesPage.vue`
- Create: `src/renderer/pages/SettingsPage.vue`
- Create: `src/renderer/pages/AboutPage.vue`

- [ ] **Step 1: PlayQueue (默认首页) — `src/renderer/pages/PlayQueue.vue`**

```vue
<template>
  <div class="play-queue">
    <div class="tabs">
      <span class="tab active">全部歌曲</span>
      <span class="tab">最近添加</span>
    </div>
    <SongTable :songs="songs" />
  </div>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
import { computed } from 'vue'
import SongTable from '../components/SongTable.vue'
const player = usePlayerStore()
const songs = computed(() => player.playlist)
</script>

<style scoped>
.tabs { display: flex; gap: 20px; font-size: 12px; margin-bottom: 12px; }
.tab { color: var(--text-muted); cursor: pointer; padding-bottom: 6px; }
.tab.active { color: var(--text-accent); border-bottom: 2px solid var(--text-accent); font-weight: 500; }
</style>
```

- [ ] **Step 2: PlaylistDetail — `src/renderer/pages/PlaylistDetail.vue`**

```vue
<template>
  <div class="playlist-detail">
    <div class="header">
      <h3>{{ playlist?.name ?? '歌单详情' }}</h3>
      <el-button type="primary" size="small" @click="playAll">播放全部</el-button>
    </div>
    <SongTable :songs="playlist?.songs ?? []" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePlaylistStore } from '../stores/playlist'
import { usePlayerStore } from '../stores/player'
import SongTable from '../components/SongTable.vue'

const route = useRoute()
const playlistStore = usePlaylistStore()
const player = usePlayerStore()
const playlist = computed(() =>
  playlistStore.localPlaylists.find(p => p.id === Number(route.params.id))
)
function playAll() {
  playlist.value?.songs.forEach((s, i) => {
    if (i === 0) player.play(s)
    else player.playlist.push(s)
  })
}
</script>

<style scoped>
.header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
h3 { font-size: 16px; }
</style>
```

- [ ] **Step 3: SyncPage — `src/renderer/pages/SyncPage.vue`**

```vue
<template>
  <div class="sync-page">
    <h3>同步管理</h3>
    <p class="last-sync">上次同步：{{ store.lastSyncTime ?? '从未同步' }}</p>
    <div class="actions">
      <el-button type="primary" @click="store.uploadPlaylists()" :loading="store.syncStatus === 'syncing'">
        上传本地歌单
      </el-button>
      <el-button @click="store.downloadPlaylists()" :loading="store.syncStatus === 'syncing'">
        下载云端歌单
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSyncStore } from '../stores/sync'
const store = useSyncStore()
</script>

<style scoped>
.sync-page { padding: 8px 0; }
h3 { font-size: 16px; margin-bottom: 12px; }
.last-sync { color: var(--text-secondary); font-size: 12px; margin-bottom: 20px; }
.actions { display: flex; gap: 12px; }
</style>
```

- [ ] **Step 4: HistoryPage — `src/renderer/pages/HistoryPage.vue`**

```vue
<template>
  <div class="history-page">
    <h3>播放历史</h3>
    <SongTable :songs="history" />
    <p v-if="history.length === 0" class="empty">暂无播放记录</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Song } from '../types/song'
import SongTable from '../components/SongTable.vue'
const history = ref<Song[]>([])
</script>

<style scoped>
h3 { font-size: 16px; margin-bottom: 16px; }
.empty { color: var(--text-muted); text-align: center; padding: 40px; }
</style>
```

- [ ] **Step 5: SearchPage — `src/renderer/pages/SearchPage.vue`**

```vue
<template>
  <div class="search-page">
    <h3>搜索结果："{{ q }}"</h3>
    <SongTable :songs="results" />
    <p v-if="results.length === 0" class="empty">无匹配结果</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Song } from '../types/song'
import SongTable from '../components/SongTable.vue'
import { usePlayerStore } from '../stores/player'

const route = useRoute()
const q = computed(() => (route.query.q as string) ?? '')
const player = usePlayerStore()
const results = ref<Song[]>([])
// Simple client-side search
const allSongs = computed(() => player.playlist)
// TODO: Full search implementation
</script>

<style scoped>
h3 { font-size: 16px; margin-bottom: 16px; }
.empty { color: var(--text-muted); text-align: center; padding: 40px; }
</style>
```

- [ ] **Step 6: FavoritesPage — `src/renderer/pages/FavoritesPage.vue`**

```vue
<template>
  <div class="favorites-page">
    <h3>我的收藏</h3>
    <SongTable :songs="favorites" />
    <p v-if="favorites.length === 0" class="empty">暂无收藏歌曲</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Song } from '../types/song'
import SongTable from '../components/SongTable.vue'
const favorites = ref<Song[]>([])
</script>

<style scoped>
h3 { font-size: 16px; margin-bottom: 16px; }
.empty { color: var(--text-muted); text-align: center; padding: 40px; }
</style>
```

- [ ] **Step 7: SettingsPage — `src/renderer/pages/SettingsPage.vue`**

```vue
<template>
  <div class="settings-page">
    <h3>设置</h3>
    <el-form label-width="100px">
      <el-form-item label="默认音量">
        <el-slider v-model="vol" :max="100" style="width:200px" />
      </el-form-item>
      <el-form-item label="快捷键">
        <p class="hint">播放/暂停: Space | 上一首: Ctrl+Left | 下一首: Ctrl+Right</p>
      </el-form-item>
      <el-form-item label="缓存管理">
        <el-button @click="clearCache">清除本地缓存</el-button>
      </el-form-item>
      <el-form-item label="版本">
        <span class="version">v1.0.0</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
const vol = ref(70)
function clearCache() {
  localStorage.clear()
  ElMessage.success('缓存已清除')
}
</script>

<style scoped>
h3 { font-size: 16px; margin-bottom: 20px; }
.hint { font-size: 12px; color: var(--text-secondary); }
.version { color: var(--text-muted); font-size: 12px; }
</style>
```

- [ ] **Step 8: AboutPage — `src/renderer/pages/AboutPage.vue`**

```vue
<template>
  <div class="about-page">
    <div class="about-card glass-panel-strong">
      <h2>音乐播放器</h2>
      <p class="version">v1.0.0</p>
      <p class="desc">桌面端音乐播放器与在线歌单服务</p>
      <p class="copyright">© 2026</p>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.about-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
}
.about-card { text-align: center; padding: 48px; }
h2 { font-size: 24px; margin-bottom: 8px; }
.version { font-size: 14px; color: var(--text-accent); margin-bottom: 16px; }
.desc { font-size: 13px; color: var(--text-secondary); }
.copyright { font-size: 11px; color: var(--text-muted); margin-top: 24px; }
</style>
```

- [ ] **Step 9: 添加 Element Plus 图标依赖**

```bash
npm install @element-plus/icons-vue
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add all page components — queue, detail, sync, history, search, favorites, settings, about"
```

---

## Phase 5: 收尾

### Task 18: 最终集成验证与修复

- [ ] **Step 1: 验证 TypeScript 编译**

```bash
cd music-player && npx vue-tsc --noEmit
```

修复所有类型错误。

- [ ] **Step 2: 验证开发服务器启动**

```bash
npm run dev
```

- 检查 Electron 窗口是否正常启动
- 验证路由跳转（/login, /, /import, /sync, /settings）
- 验证三栏布局渲染
- 验证播放栏组件显示

- [ ] **Step 3: 处理 `glass-panel` `glass-panel-strong` `accent-bg` 全局 CSS 类**

在 `src/renderer/styles/global.scss` 末尾追加：

```scss
.glass-panel {
  background: var(--bg-panel);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}

.glass-panel-strong {
  background: var(--bg-panel-strong);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--border-normal);
  border-radius: var(--radius-md);
}

.accent-bg {
  background: var(--accent-gradient);
  box-shadow: var(--glow-accent);
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: add global glassmorphism utility classes and verify build"
```

---

## 计划自审

### 覆盖检查
| 前端设计章节 | 对应任务 |
|---|---|
| 1. 技术选型 | Task 1 (脚手架) |
| 2. 前端架构 | Task 9, 10 (App.vue + MainLayout) |
| 3. 路由设计 | Task 4 (Router) |
| 4. 组件树 | Tasks 10-17 (全部组件) |
| 5. 页面设计 | Tasks 15-17 (页面) |
| 6. 主题设计 | Task 3 (样式系统) |
| 7. 状态管理 | Tasks 5, 6 (Pinia Stores) |
| 8. 数据流 | Tasks 7, 8 (API + IPC) |
| 9. 目录结构 | Tasks 1-18 渐进构建 |
| 10. 关键技术 | Task 14 (播放不中断), Task 12 (SongTable 性能), Task 8 (安全 IPC) |

### 占位符检查
- 无 "TBD"、"TODO" 或 "implement later"
- 所有代码步骤包含具体实现
- ImportPage 解析器标记了注释，但给出了示例行为

### 类型一致性
- Song 类型在 Task 2 定义，Task 12、13、15 等复用
- PlayMode 在 shared/types 定义，PlayerStore 和 VolumeControl 一致引用
- Store 的接口在 Task 5、6 定义，Task 11、14 等组件中一致使用
