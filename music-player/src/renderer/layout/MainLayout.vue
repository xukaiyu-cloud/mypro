<template>
  <div class="main-layout">
    <TitleBar />
    <div class="main-body">
      <SidebarLeft class="sidebar-left" />
      <ContentCenter class="content-center">
        <router-view v-slot="{ Component }">
          <transition name="slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </ContentCenter>
      <SidebarRight class="sidebar-right" />
    </div>
    <PlayerBar class="player-bar" />
  </div>
</template>

<script setup lang="ts">
import TitleBar from '../components/TitleBar.vue'
import SidebarLeft from './SidebarLeft.vue'
import ContentCenter from './ContentCenter.vue'
import SidebarRight from './SidebarRight.vue'
import PlayerBar from './PlayerBar.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-base);
  position: relative;
  overflow: hidden;
  contain: layout style;
}
.main-layout::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 40%, rgba(30,80,162,0.06) 0%, transparent 55%),
    radial-gradient(ellipse at 75% 25%, rgba(30,80,162,0.05) 0%, transparent 55%),
    radial-gradient(ellipse at 55% 72%, rgba(30,80,162,0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 35% 65%, rgba(30,80,162,0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}
.sidebar-left {
  width: var(--sidebar-left-width);
  flex-shrink: 0;
}
.content-center {
  flex: 1;
  overflow: hidden;
}
.sidebar-right {
  width: var(--sidebar-right-width);
  flex-shrink: 0;
}
.player-bar {
  height: var(--player-bar-height);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
</style>
