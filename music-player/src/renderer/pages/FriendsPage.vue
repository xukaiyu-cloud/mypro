<template>
  <div class="friends-page">
    <h3>好友</h3>

    <!-- Search users -->
    <div class="search-row">
      <el-input v-model="searchQuery" placeholder="搜索用户..." clearable
        @keyup.enter="doSearch" style="flex:1" />
      <el-button type="primary" @click="doSearch" :loading="searching">搜索</el-button>
    </div>

    <!-- Search results -->
    <div v-if="searchResults.length > 0" class="section">
      <h4>搜索结果</h4>
      <div v-for="u in searchResults" :key="u.id" class="user-row">
        <span class="username">{{ u.username }}</span>
        <el-button size="small" type="primary" @click="addFriend(u.id)">添加好友</el-button>
      </div>
    </div>

    <!-- Incoming requests -->
    <div v-if="store.incoming.length > 0" class="section">
      <h4>好友申请 ({{ store.incoming.length }})</h4>
      <div v-for="req in store.incoming" :key="req.id" class="user-row">
        <span class="username">{{ req.fromUsername }}</span>
        <el-button size="small" type="success" @click="accept(req.id)">接受</el-button>
      </div>
    </div>

    <!-- Friends list -->
    <div class="section">
      <h4>我的好友 ({{ store.friends.length }})</h4>
      <div v-if="store.friends.length === 0" class="empty">暂无好友，搜索用户并添加</div>
      <div v-for="f in store.friends" :key="f.id" class="user-row"
        @contextmenu="onFriendContext($event, f)">
        <span class="username">{{ f.friendName }}</span>
        <span class="hint-text">右键操作</span>
      </div>
    </div>
    <ContextMenu ref="contextRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFriendsStore } from '../stores/friends'
import type { UserSearchResult, FriendInfo } from '../api/friends'
import ContextMenu from '../components/ContextMenu.vue'
import type { ContextMenuItem } from '../components/ContextMenu.vue'

const store = useFriendsStore()
const searchQuery = ref('')
const searching = ref(false)
const searchResults = ref<UserSearchResult[]>([])
const contextRef = ref<InstanceType<typeof ContextMenu> | null>(null)

onMounted(() => store.fetchFriends())

async function doSearch() {
  if (!searchQuery.value.trim()) return
  searching.value = true
  searchResults.value = await store.searchUsers(searchQuery.value.trim())
  searching.value = false
}

async function addFriend(friendId: number) {
  try {
    await store.sendRequest(friendId)
    ElMessage.success('好友申请已发送')
    searchResults.value = []
  } catch (e: unknown) {
    ElMessage.error((e as { message?: string })?.message || '发送失败')
  }
}

async function accept(requestId: number) {
  try {
    await store.acceptRequest(requestId)
    ElMessage.success('已添加好友')
  } catch {
    ElMessage.error('操作失败')
  }
}

function onFriendContext(e: MouseEvent, friend: FriendInfo) {
  const items: ContextMenuItem[] = [
    {
      key: 'poke',
      label: '打招呼（戳一戳）',
      icon: '👋',
      action: () => {
        store.pokeFriend(friend.friendId)
        ElMessage.success(`向 ${friend.friendName} 打了个招呼`)
      },
    },
    {
      key: 'delete',
      label: '删除好友',
      danger: true,
      action: async () => {
        try {
          await ElMessageBox.confirm(`确定要删除好友「${friend.friendName}」吗？`, '确认', {
            confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning',
          })
          await store.removeFriend(friend.id)
          ElMessage.success('已删除')
        } catch { /* cancelled */ }
      },
    },
  ]
  contextRef.value?.open(e, items)
}
</script>

<style scoped>
.friends-page {
  padding: 8px 0; flex: 1; display: flex; flex-direction: column; min-height: 0;
}
h3 { font-size: 16px; margin-bottom: 16px; flex-shrink: 0; }
.search-row { display: flex; gap: 8px; margin-bottom: 20px; flex-shrink: 0; }
.section { margin-bottom: 20px; flex-shrink: 0; }
h4 { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.user-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid var(--border-subtle);
}
.username { font-size: 13px; }
.hint-text { font-size: 11px; color: var(--text-muted); }
.empty { color: var(--text-muted); font-size: 12px; padding: 12px 0; }
</style>
