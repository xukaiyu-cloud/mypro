<template>
  <div v-if="auth.isLoggedIn" class="user-info glass-panel-strong">
    <div class="avatar accent-bg">{{ auth.userInfo?.username?.charAt(0) ?? 'U' }}</div>
    <div class="info">
      <div class="name">{{ auth.userInfo?.username ?? '用户' }}</div>
      <div class="status">● 在线</div>
    </div>
  </div>
  <div v-else class="user-info glass-panel-strong">
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
