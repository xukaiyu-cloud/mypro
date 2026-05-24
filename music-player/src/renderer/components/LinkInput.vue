<template>
  <div class="link-input">
    <el-input v-model="url" placeholder="粘贴歌单分享链接" style="flex:1" />
    <el-select v-model="platform" placeholder="选择平台" style="width:150px">
      <el-option label="网易云音乐" value="netease" />
      <el-option label="QQ音乐" value="qqmusic" />
      <el-option label="酷狗音乐" value="kugou" />
      <el-option label="其他" value="other" />
    </el-select>
    <el-button type="primary" @click="parse" :loading="loading">解析</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const url = ref('')
const platform = ref('')
const loading = ref(false)
const emit = defineEmits<{ (e: 'parsed', url: string, platform: string): void }>()
async function parse() {
  if (!url.value.trim()) return
  emit('parsed', url.value, platform.value)
}
</script>

<style scoped>
.link-input { display: flex; gap: 12px; align-items: center; }
</style>
