<template>
  <aside class="sidebar-right">
    <!-- Chat UI only when on the ListenRoom page AND in a room -->
    <div v-if="listen.currentRoom && isOnListenPage" class="chat-panel">
      <div class="chat-header">
        <span>房间聊天</span>
        <span class="chat-room-id">{{ listen.currentRoom.roomId }}</span>
      </div>
      <div class="chat-messages" ref="chatRef">
        <div v-if="listen.messages.length === 0" class="chat-empty">暂无消息，发送第一条消息吧</div>
        <div v-for="(msg, i) in listen.messages" :key="i"
          class="chat-bubble-row" :class="{ mine: msg.userId === auth.userInfo?.id }">
          <div class="bubble-avatar">{{ msg.username.charAt(0).toUpperCase() }}</div>
          <div class="bubble-body">
            <span class="bubble-name">{{ msg.username }}</span>
            <div class="bubble-text">{{ msg.text }}</div>
          </div>
        </div>
      </div>
      <div class="chat-input-row">
        <el-input v-model="chatInput" placeholder="输入消息..." size="small"
          @keyup.enter="send" />
        <el-button size="small" type="primary" @click="send" :disabled="!chatInput.trim()">发送</el-button>
      </div>
    </div>

    <!-- Default: cover, lyrics, song info -->
    <template v-else>
      <CoverDisplay />
      <LyricsPanel />
      <SongInfo />
    </template>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useListenStore } from '../stores/listen'
import { useAuthStore } from '../stores/auth'
import CoverDisplay from '../components/CoverDisplay.vue'
import LyricsPanel from '../components/LyricsPanel.vue'
import SongInfo from '../components/SongInfo.vue'

const route = useRoute()
const listen = useListenStore()
const auth = useAuthStore()
const isOnListenPage = computed(() => route.name === 'ListenRoom')
const chatInput = ref('')
const chatRef = ref<HTMLElement | null>(null)

watch(() => listen.messages.length, () => {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTop = chatRef.value.scrollHeight
    }
  })
})

function send() {
  if (!chatInput.value.trim()) return
  listen.sendMessage(chatInput.value)
  chatInput.value = ''
}
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

/* Chat */
.chat-panel {
  flex: 1; display: flex; flex-direction: column; min-height: 0;
  width: 100%;
}
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  font-size: 13px; font-weight: 600;
}
.chat-room-id {
  font-family: monospace; font-size: 11px; color: var(--text-accent);
}
.chat-messages {
  flex: 1; overflow-y: auto; min-height: 0;
  padding: 10px 0; display: flex; flex-direction: column; gap: 10px;
}
.chat-empty { color: var(--text-muted); font-size: 12px; text-align: center; padding: 24px 0; }

.chat-bubble-row {
  display: flex; align-items: flex-start; gap: 8px;
}
.chat-bubble-row.mine {
  flex-direction: row-reverse;
}
.bubble-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent-gradient);
  color: #fff; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.chat-bubble-row.mine .bubble-avatar {
  background: #1D566E;
}
.bubble-body {
  max-width: 75%;
}
.chat-bubble-row.mine .bubble-body {
  display: flex; flex-direction: column; align-items: flex-end;
}
.bubble-name {
  font-size: 10px; color: var(--text-muted); margin-bottom: 2px; display: block;
}
.bubble-text {
  font-size: 12px; padding: 8px 12px; border-radius: var(--radius-lg);
  background: rgba(0,0,0,0.04);
  color: var(--text-primary); word-break: break-word; line-height: 1.5;
}
.chat-bubble-row.mine .bubble-text {
  background: rgba(30,80,162,0.08);
  color: var(--text-accent);
}

.chat-input-row {
  display: flex; gap: 6px; flex-shrink: 0; padding-top: 8px;
  border-top: 1px solid var(--border-subtle);
}
.chat-input-row :deep(.el-input__inner) { font-size: 12px; }
</style>
