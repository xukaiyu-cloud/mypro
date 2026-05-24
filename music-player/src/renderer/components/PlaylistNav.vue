<template>
  <div class="playlist-nav">
    <div class="header">
      <span>歌单 ({{ store.localPlaylists.length }})</span>
      <span class="add-btn" @click="showCreate = true">＋ 新建</span>
    </div>
    <div class="list">
      <router-link v-for="pl in store.localPlaylists" :key="pl.id"
        :to="`/playlist/${pl.id}`" class="pl-item">
        <span class="pl-name">{{ pl.name }}</span>
        <span class="pl-count">{{ pl.songs.length }} 首</span>
      </router-link>
      <p v-if="store.localPlaylists.length === 0" class="empty-hint">暂无歌单，点击新建</p>
    </div>
    <el-dialog v-model="showCreate" title="新建歌单" width="360px">
      <el-input v-model="newName" placeholder="歌单名称" @keyup.enter="create" />
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="create">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePlaylistStore } from '../stores/playlist'
const store = usePlaylistStore()
onMounted(() => store.fetchLocalPlaylists())
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
.playlist-nav {
  display: flex; flex-direction: column; flex: 1; min-height: 0; gap: 4px;
}
.header {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: var(--text-muted); padding: 0 6px; margin-bottom: 8px;
}
.add-btn { color: var(--text-bright); cursor: pointer; }
.list {
  display: flex; flex-direction: column; gap: 2px; padding: 0 6px;
  overflow-y: auto; flex: 1; min-height: 0;
}
.pl-item {
  padding: 5px 8px; color: var(--text-secondary); font-size: 11px;
  border-radius: var(--radius-sm); text-decoration: none;
  display: flex; justify-content: space-between; align-items: center;
  flex-shrink: 0;
}
.pl-item:hover { background: rgba(30,80,162,0.05); }
.pl-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl-count { color: var(--text-muted); flex-shrink: 0; margin-left: 8px; font-size: 10px; }
.empty-hint { font-size: 11px; color: var(--text-muted); padding: 8px; text-align: center; }
</style>
