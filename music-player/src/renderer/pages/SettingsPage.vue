<template>
  <div class="settings-page">
    <h3>设置</h3>

    <el-form label-width="100px" class="settings-form">
      <el-form-item label="默认音量">
        <el-slider v-model="settings.defaultVolume" :max="100" style="width:180px" />
        <span class="inline-val">{{ settings.defaultVolume }}</span>
      </el-form-item>

      <el-form-item label="快捷键">
        <div class="shortcuts">
          <div class="shortcut-row"><kbd>Space</kbd><span>播放 / 暂停</span></div>
          <div class="shortcut-row"><kbd>Ctrl+Left</kbd><span>上一首</span></div>
          <div class="shortcut-row"><kbd>Ctrl+Right</kbd><span>下一首</span></div>
          <div class="shortcut-row"><kbd>Ctrl+Up</kbd><span>音量 +</span></div>
          <div class="shortcut-row"><kbd>Ctrl+Down</kbd><span>音量 −</span></div>
        </div>
      </el-form-item>

      <el-divider />

      <el-form-item label="服务器地址">
        <el-input
          v-model="settings.serverUrl"
          placeholder="http://localhost:3000"
          style="width: 280px"
          @change="onServerUrlChange"
        />
        <span class="inline-hint">修改后需重启应用生效</span>
      </el-form-item>

      <el-divider />

      <el-form-item label="网易云Cookie">
        <el-input
          v-model="neteaseCookie"
          type="textarea"
          :rows="2"
          placeholder="从浏览器 DevTools → Application → Cookies 中复制 MUSIC_U 字段值，粘贴完整 cookie 字符串即可"
          style="width: 480px"
          @change="onNeteaseCookieChange"
        />
        <div class="inline-hint" style="display:block;margin-top:4px">
          {{ neteaseStatus }}
        </div>
      </el-form-item>

      <el-form-item label="酷狗Cookie">
        <el-input
          v-model="kugouCookie"
          type="textarea"
          :rows="2"
          placeholder="从浏览器 DevTools → Application → Cookies 中复制 kugou.com 域下的完整 cookie 字符串"
          style="width: 480px"
          @change="onKugouCookieChange"
        />
        <div class="inline-hint" style="display:block;margin-top:4px">
          {{ kugouStatus }}
        </div>
      </el-form-item>

      <el-divider />

      <el-form-item label="数据管理">
        <el-button type="danger" plain @click="clearCache">清除本地缓存</el-button>
      </el-form-item>

      <el-form-item label="版本">
        <span class="version">v1.0.0</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSettingsStore } from '../stores/settings'
import { playApi } from '../api/play'

const settings = useSettingsStore()

const neteaseCookie = ref('')
const kugouCookie = ref('')
const neteaseStatus = ref('')
const kugouStatus = ref('')

let neteaseCookieTimer: ReturnType<typeof setTimeout> | null = null
let kugouCookieTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  try {
    const res = await playApi.getPlatformConfig()
    if (res.code === 200 && res.data) {
      neteaseStatus.value = res.data.hasNeteaseCookie ? '已设置' : '未设置'
      kugouStatus.value = res.data.hasKugouCookie ? '已设置' : '未设置'
    }
  } catch { /* ignore */ }
})

function onNeteaseCookieChange(val: string) {
  if (neteaseCookieTimer) clearTimeout(neteaseCookieTimer)
  neteaseCookieTimer = setTimeout(async () => {
    try {
      await playApi.updatePlatformConfig({ neteaseCookie: val })
      neteaseStatus.value = val ? '已设置' : '未设置'
      ElMessage.success('网易云Cookie已更新')
    } catch {
      ElMessage.error('保存失败')
    }
  }, 500)
}

function onKugouCookieChange(val: string) {
  if (kugouCookieTimer) clearTimeout(kugouCookieTimer)
  kugouCookieTimer = setTimeout(async () => {
    try {
      await playApi.updatePlatformConfig({ kugouCookie: val })
      kugouStatus.value = val ? '已设置' : '未设置'
      ElMessage.success('酷狗Cookie已更新')
    } catch {
      ElMessage.error('保存失败')
    }
  }, 500)
}

function clearCache() {
  ElMessageBox.confirm('将清除所有本地缓存数据，确定继续？', '确认', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    localStorage.clear()
    ElMessage.success('缓存已清除')
  }).catch(() => {})
}

function onServerUrlChange(val: string) {
  settings.updateServerUrl(val)
}
</script>

<style scoped>
.settings-page {
  padding: 16px 0; flex: 1; display: flex; flex-direction: column; min-height: 0;
}
h3 { font-size: 16px; margin-bottom: 24px; flex-shrink: 0; }

.settings-form {
  flex: 1; overflow-y: auto; min-height: 0;
}
.inline-val {
  margin-left: 10px; font-size: 13px; color: var(--text-accent);
  width: 30px; display: inline-block;
}

.shortcuts {
  display: flex; flex-direction: column; gap: 6px;
}
.shortcut-row {
  display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-secondary);
}
.shortcut-row kbd {
  display: inline-block; padding: 2px 8px;
  background: var(--bg-panel-strong); border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm); font-size: 11px; font-family: monospace;
  color: var(--text-accent); min-width: 80px; text-align: center;
}

.inline-hint { margin-left: 10px; font-size: 11px; color: var(--text-muted); }
.version { color: var(--text-muted); font-size: 12px; }
</style>
