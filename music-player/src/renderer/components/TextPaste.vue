<template>
  <el-input v-model="text" type="textarea" :rows="4"
    placeholder="粘贴歌单内容，每行一首，格式：歌名 - 歌手 - 专辑" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
const text = ref('')
defineExpose({ text })
</script>
