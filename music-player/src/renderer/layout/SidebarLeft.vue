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
  overflow: hidden;
}
</style>
