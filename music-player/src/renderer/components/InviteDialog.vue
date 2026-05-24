<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="邀请好友" width="380px">
    <div v-if="friends.length === 0" class="empty">暂无好友</div>
    <div v-for="f in friends" :key="f.id" class="invite-row">
      <span class="invite-name">{{ f.friendName }}</span>
      <span class="online-dot" :class="{ online: onlineFriendIds.includes(f.friendId) }" />
      <el-button size="small" type="primary" @click="$emit('invite', f)">邀请</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import type { FriendInfo } from '../api/friends'

defineProps<{
  modelValue: boolean
  friends: FriendInfo[]
  onlineFriendIds: number[]
}>()

defineEmits<{
  'update:modelValue': [value: boolean]
  invite: [friend: FriendInfo]
}>()
</script>

<style scoped>
.invite-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 0; border-bottom: 1px solid var(--border-subtle);
}
.invite-name { flex: 1; font-size: 13px; }
.online-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #666;
}
.online-dot.online { background: #67c23a; }
.empty { color: var(--text-muted); font-size: 12px; padding: 12px 0; }
</style>
