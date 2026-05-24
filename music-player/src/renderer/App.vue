<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import { useAudio } from './composables/useAudio'
import { useAudioPreload } from './composables/useAudioPreload'

useAudio()
useAudioPreload()

onMounted(() => {
  useAuthStore().restoreSession()
})
</script>

<style>
@import './styles/global.scss';
</style>
