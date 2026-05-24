<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-overlay"
      @click.self="close"
      @contextmenu.prevent="close"
    >
      <div
        class="context-menu glass-panel-strong"
        :style="{ left: x + 'px', top: y + 'px' }"
      >
        <div
          v-for="item in items"
          :key="item.key"
          class="context-item"
          :class="{ danger: item.danger }"
          @click="onClick(item)"
        >
          <span class="item-icon" v-if="item.icon">{{ item.icon }}</span>
          <span class="item-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  action: () => void
}

const visible = ref(false)
const x = ref(0)
const y = ref(0)
const items = ref<ContextMenuItem[]>([])

function open(event: MouseEvent, menuItems: ContextMenuItem[]) {
  event.preventDefault()
  event.stopPropagation()
  items.value = menuItems

  // Adjust position to stay within viewport
  const menuW = 160
  const menuH = menuItems.length * 38 + 8
  x.value = Math.min(event.clientX, window.innerWidth - menuW - 8)
  y.value = Math.min(event.clientY, window.innerHeight - menuH - 8)

  visible.value = true
}

function close() {
  visible.value = false
}

function onClick(item: ContextMenuItem) {
  item.action()
  close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))

defineExpose({ open, close })
</script>

<style scoped>
.context-overlay {
  position: fixed; inset: 0; z-index: 9998;
}
.context-menu {
  position: fixed; z-index: 9999;
  min-width: 150px; padding: 4px 0;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
  overflow: hidden;
}
.context-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; font-size: 13px;
  color: var(--text-primary); cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.context-item:hover {
  background: rgba(30,80,162,0.06);
}
.context-item.danger {
  color: var(--color-primary);
}
.context-item.danger:hover {
  background: rgba(30,80,162,0.10);
}
.item-icon { font-size: 14px; width: 18px; text-align: center; }
.item-label { flex: 1; }
</style>
