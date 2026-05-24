import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { friendsApi } from '../api/friends'
import type { FriendInfo, FriendRequest, UserSearchResult } from '../api/friends'
import { extractError } from '../utils/error'

export const useFriendsStore = defineStore('friends', () => {
  const friends = ref<FriendInfo[]>([])
  const incoming = ref<FriendRequest[]>([])
  const loading = ref(false)

  const pendingCount = computed(() => incoming.value.length)

  async function fetchFriends() {
    try {
      const res = await friendsApi.getList()
      friends.value = res.data.friends
      incoming.value = res.data.incoming
    } catch { /* ignored */ }
  }

  async function searchUsers(q: string): Promise<UserSearchResult[]> {
    try {
      const res = await friendsApi.searchUsers(q)
      return res.data
    } catch {
      return []
    }
  }

  async function sendRequest(friendId: number): Promise<boolean> {
    try {
      await friendsApi.sendRequest(friendId)
      return true
    } catch (e: unknown) {
      throw new Error(extractError(e, '发送失败'))
    }
  }

  async function acceptRequest(requestId: number): Promise<boolean> {
    try {
      await friendsApi.acceptRequest(requestId)
      await fetchFriends()
      return true
    } catch {
      throw new Error('操作失败')
    }
  }

  async function removeFriend(id: number): Promise<void> {
    await friendsApi.remove(id)
    friends.value = friends.value.filter(f => f.id !== id)
  }

  async function pokeFriend(friendId: number): Promise<void> {
    try {
      await friendsApi.poke(friendId)
    } catch {
      // non-critical
    }
  }

  return { friends, incoming, loading, pendingCount, fetchFriends, searchUsers, sendRequest, acceptRequest, removeFriend, pokeFriend }
})
