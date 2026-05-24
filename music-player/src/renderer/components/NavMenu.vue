<template>
  <nav class="nav-menu glass-panel">
    <router-link v-for="item in items" :key="item.to" :to="item.to"
      class="nav-item" active-class="nav-active">
      {{ item.label }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
const items = [
  { label: '本地歌曲', to: '/local' },
  { label: '正在播放', to: '/queue' },
  { label: '最近播放', to: '/history' },
  { label: '收藏', to: '/favorites' },
  { label: '导入歌单', to: '/import' },
  { label: '好友', to: '/friends' },
  { label: '一起听', to: '/listen' },
  { label: '同步管理', to: '/sync' },
  { label: '设置', to: '/settings' },
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
  border-radius: var(--radius-sm);
  text-decoration: none;
  transition: background 0.15s;
}
.nav-item:hover { background: rgba(30,80,162,0.05); }
.nav-active { color: var(--text-accent); background: rgba(30,80,162,0.08); }
</style>
