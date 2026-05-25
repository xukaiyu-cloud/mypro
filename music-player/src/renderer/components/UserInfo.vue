<template>
  <div v-if="auth.isLoggedIn" class="user-info glass-panel-strong">
    <label class="avatar-wrapper" title="点击更换头像">
      <img v-if="auth.userInfo?.avatar" :src="auth.userInfo.avatar" class="avatar-img" />
      <div v-else class="avatar accent-bg">{{ auth.userInfo?.username?.charAt(0) ?? 'U' }}</div>
      <input type="file" accept="image/*" class="avatar-input" @change="onUpload" />
    </label>
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
import { authApi } from '../api/auth'
import { ElMessage } from 'element-plus'

const auth = useAuthStore()

async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = reader.result as string
    try {
      const res = await authApi.updateAvatar(base64)
      if (res.code === 200 && auth.userInfo) {
        auth.userInfo.avatar = res.data.avatar
        ElMessage.success('头像已更新')
      }
    } catch (e: any) { console.error('Avatar upload failed:', e); ElMessage.error('头像更新失败: ' + (e?.response?.data?.message || e?.message || '未知错误')) }
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
}
.avatar-wrapper {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.avatar-input {
  position: absolute; inset: 0; opacity: 0; cursor: pointer;
}
.avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px; font-weight: 700;
  color: #fff;
  transition: opacity 0.15s;
}
.avatar-wrapper:hover .avatar { opacity: 0.7; }
.avatar-img {
  width: 34px; height: 34px;
  border-radius: 50%;
  object-fit: cover;
  transition: opacity 0.15s;
}
.avatar-wrapper:hover .avatar-img { opacity: 0.7; }
.info { min-width: 0; }
.name { font-size: 12px; font-weight: 600; color: var(--text-primary); }
.status { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.login-link { font-size: 12px; color: var(--text-accent); text-decoration: none; }
</style>