<template>
  <div class="about-page">
    <div class="about-card glass-panel-strong">
      <h2>文凯音乐</h2>
      <p class="version">v1.0.0</p>
      <p class="desc">桌面端音乐播放器与在线歌单服务 - 文凯音乐</p>
      <p class="copyright">© 2026</p>
    </div>
  </div>
</template>

<style scoped>
.about-page {
  height: 100vh; display: flex; align-items: center; justify-content: center;
  background: var(--bg-base);
}
.about-card { text-align: center; padding: 48px; }
h2 { font-size: 24px; margin-bottom: 8px; }
.version { font-size: 14px; color: var(--text-accent); margin-bottom: 16px; }
.desc { font-size: 13px; color: var(--text-secondary); }
.copyright { font-size: 11px; color: var(--text-muted); margin-top: 24px; }
</style>
