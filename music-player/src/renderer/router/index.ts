import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
        path: 'friends',
        name: 'Friends',
        component: () => import('../pages/FriendsPage.vue'),
      },
      {
        path: 'listen',
        name: 'ListenRoom',
        component: () => import('../pages/ListenRoom.vue'),
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
        path: 'local',
        name: 'LocalSongs',
        component: () => import('../pages/LocalSongsPage.vue'),
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
  {
    path: '/immersive',
    name: 'Immersive',
    component: () => import('../pages/ImmersivePlayer.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const auth = useAuthStore()
  // Wait for token validation before deciding — prevents expired tokens from
  // briefly granting access on the initial page load.
  if (!auth.initialized) {
    await auth.restoreSession()
  }
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
