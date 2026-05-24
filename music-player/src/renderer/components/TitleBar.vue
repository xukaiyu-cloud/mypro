<template>
  <header class="title-bar" @dblclick="maximize">
    <div class="title-left">
      <span class="app-icon">♫</span>
      <span class="app-name">文凯音乐</span>
    </div>
    <div class="win-controls">
      <button class="win-btn" @click="minimize" title="最小化">─</button>
      <button class="win-btn" @click="maximize" title="最大化">☐</button>
      <button class="win-btn win-close" @click="close" title="关闭">✕</button>
    </div>
  </header>
</template>

<script setup lang="ts">
function minimize() { window.electronAPI.minimizeWindow() }
function maximize() { window.electronAPI.maximizeWindow() }
function close() { window.electronAPI.closeWindow() }
</script>

<style scoped>
.title-bar {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  -webkit-app-region: drag;
  user-select: none;
  flex-shrink: 0;
  padding-left: 12px;
  z-index: 10;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.app-icon {
  font-size: 16px;
  color: var(--text-accent);
}
.app-name {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.win-controls {
  display: flex;
  -webkit-app-region: no-drag;
}
.win-btn {
  width: 40px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  font-family: inherit;
}
.win-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}
.win-close:hover {
  background: var(--color-error);
  color: var(--text-on-accent);
}
</style>
