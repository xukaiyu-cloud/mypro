<template>
  <main class="content-center">
    <SearchBar />
    <slot />
  </main>
</template>

<script setup lang="ts">
import SearchBar from '../components/SearchBar.vue'
</script>

<style scoped>
.content-center {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  overflow: hidden;
  min-height: 0;
}

.content-center :deep(.search-bar) {
  flex-shrink: 0;
}

/* Only the router-view slot fills remaining space */
.content-center :slotted(*) {
  min-height: 0;
  flex: 1;
}
</style>
