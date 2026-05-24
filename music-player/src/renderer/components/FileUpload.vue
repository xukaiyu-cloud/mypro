<template>
  <el-upload drag :auto-upload="false" :on-change="handleFile" accept=".csv,.json,.txt">
    <div class="upload-area">
      <p class="upload-icon">📁</p>
      <p>将文件拖到此处，或点击上传</p>
      <p class="upload-hint">支持 CSV、JSON、TXT 格式</p>
    </div>
  </el-upload>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'file-loaded', content: string): void }>()
async function handleFile(file: { raw?: File }) {
  if (file.raw) {
    const text = await file.raw.text()
    emit('file-loaded', text)
  }
}
</script>

<style scoped>
.upload-area { padding: 10px; text-align: center; color: var(--text-secondary); }
.upload-icon { font-size: 24px; margin-bottom: 4px; }
.upload-hint { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
</style>
