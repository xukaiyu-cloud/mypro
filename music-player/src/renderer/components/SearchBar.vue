<template>
  <div class="search-bar glass-panel">
    <div class="search-input-wrapper" ref="wrapperRef">
      <el-input v-model="query"
        :placeholder="aiEnabled ? '🔮 AI 智能搜索 — 说出你想听的音乐...' : '搜索歌曲、歌手、专辑...'"
        clearable class="search-input" @keyup.enter="doSearch" @focus="onFocus" @blur="onBlur"
        @input="onInput" />
      <span v-if="aiEnabled || isNaturalLanguage" class="ai-badge" title="AI 智能搜索已启用">🤖</span>

      <!-- Dropdown -->
      <div v-if="showDropdown" class="search-dropdown glass-panel">
        <!-- Hot searches (when empty) -->
        <template v-if="!query && trending.length > 0">
          <div class="dropdown-title">🔥 热门搜索</div>
          <div v-for="t in trending" :key="t.keyword" class="dropdown-item" @mousedown.prevent="pickSuggestion(t.keyword)">
            <span class="item-icon">🔥</span>{{ t.keyword }}
          </div>
        </template>

        <!-- History (when empty) -->
        <template v-if="!query && history.length > 0">
          <div class="dropdown-title">
            🕐 搜索历史
            <span class="clear-btn" @mousedown.prevent="clearHistory">清空</span>
          </div>
          <div v-for="h in history.slice(0, 5)" :key="h.keyword" class="dropdown-item" @mousedown.prevent="pickSuggestion(h.keyword)">
            <span class="item-icon">🕐</span>{{ h.keyword }}
          </div>
        </template>

        <!-- Suggestions -->
        <template v-if="query && suggestions.length > 0">
          <div class="dropdown-title">🔍 搜索建议</div>
          <div v-for="s in suggestions" :key="s.text" class="dropdown-item" @mousedown.prevent="pickSuggestion(s.text)">
            <span class="item-icon">{{ s.type === 'song' ? '🎵' : '🕐' }}</span>
            <span v-html="highlightMatch(s.text)" />
          </div>
        </template>

        <div v-if="query && suggestions.length === 0" class="dropdown-empty">搜索 "{ query }"</div>
      </div>
    </div>

    <button class="ai-toggle" :class="{ active: aiEnabled }" @click="aiEnabled = !aiEnabled"
      title="切换 AI 智能搜索">
      <span class="toggle-dot" />
      <span class="toggle-label">AI</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { searchApi, type SuggestItem, type TrendingItem, type HistoryItem } from '../api/search'
import { ElMessage } from 'element-plus'

const query = ref('')
const aiEnabled = ref(false)
const router = useRouter()
const wrapperRef = ref<HTMLElement | null>(null)

const suggestions = ref<SuggestItem[]>([])
const trending = ref<TrendingItem[]>([])
const history = ref<HistoryItem[]>([])
const showDropdown = ref(false)
let blurTimer: ReturnType<typeof setTimeout> | null = null
let suggestTimer: ReturnType<typeof setTimeout> | null = null

const naturalPatterns = [
  /什么|哪些|有没有|怎么|如何|帮我|给我/,
  /类似|像|一样|推荐|适合|合适|听什么/,
  /跑步|睡觉|开车|下雨|伤感|开心|安静|热血|放松|专注|运动|健身|派对|旅行|咖啡|学习|工作/,
  /但不是|除了|不要|排除|去掉/,
  /好听的|经典的|冷门的|小众|热门|最新的|老的|老歌/,
]

const isNaturalLanguage = computed(() => {
  const q = query.value.trim()
  if (!q || q.length <= 2) return false
  if (q.length > 15) return true
  return naturalPatterns.some(p => p.test(q))
})

function highlightMatch(text: string): string {
  const q = query.value.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<b>$1</b>')
}

function onInput() { 
  if (suggestTimer) clearTimeout(suggestTimer)
  suggestTimer = setTimeout(async () => {
    if (!query.value.trim()) { suggestions.value = []; return }
    try {
      const res = await searchApi.suggest(query.value.trim())
      if (res.code === 200 && res.data) suggestions.value = res.data.suggestions
    } catch { suggestions.value = [] }
  }, 200)
}
function onFocus() { 
  if (blurTimer) { clearTimeout(blurTimer); blurTimer = null }
  showDropdown.value = true
}
function onBlur() { blurTimer = setTimeout(() => { showDropdown.value = false }, 200) }
function pickSuggestion(text: string) {
  query.value = text
  showDropdown.value = false
  doSearch()
}
function doSearch() {
  const q = query.value.trim()
  if (!q) return
  showDropdown.value = false
  if (aiEnabled.value || isNaturalLanguage.value) {
    router.push({ name: 'Search', query: { q, mode: 'ai' } })
  } else {
    router.push({ name: 'Search', query: { q } })
  }
}
async function clearHistory() {
  await searchApi.clearHistory()
  history.value = []
  ElMessage.success('搜索历史已清空')
}

onMounted(async () => {
  try {
    const [tRes, hRes] = await Promise.all([
      searchApi.trending(), searchApi.history()
    ])
    if (tRes.code === 200 && tRes.data) trending.value = tRes.data
    if (hRes.code === 200 && hRes.data) history.value = hRes.data
  } catch { /* offline */ }
})
</script>

<style scoped>
.search-bar { display: flex; align-items: center; gap: 8px; padding: 2px 4px; flex-shrink: 0; }
.search-input-wrapper { flex: 1; position: relative; display: flex; align-items: center; }
.search-input { flex: 1; }
.ai-badge { position: absolute; right: 10px; font-size: 16px; pointer-events: none; opacity: 0.7; }

.ai-toggle { display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 20px; border: 1.5px solid rgba(0,0,0,0.12); background: rgba(0,0,0,0.04); cursor: pointer; transition: all 0.25s; flex-shrink: 0; white-space: nowrap; }
.ai-toggle:hover { border-color: rgba(99,102,241,0.3); }
.ai-toggle.active { border-color: rgba(99,102,241,0.5); background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08)); }
.toggle-dot { width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.15); transition: background 0.25s, box-shadow 0.25s; }
.ai-toggle.active .toggle-dot { background: linear-gradient(135deg, #6366f1, #a855f7); box-shadow: 0 0 8px rgba(99,102,241,0.3); }
.toggle-label { font-size: 11px; font-weight: 600; color: rgba(0,0,0,0.3); transition: color 0.25s; }
.ai-toggle.active .toggle-label { color: #6366f1; }

/* Dropdown */
.search-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; max-height: 320px; overflow-y: auto; z-index: 100; border-radius: var(--radius-md); padding: 6px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.1); border: 1px solid var(--border-subtle); background: var(--bg-base); }
.dropdown-title { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px 4px; font-size: 11px; color: var(--text-muted); }
.clear-btn { color: var(--text-accent); cursor: pointer; font-size: 11px; }
.clear-btn:hover { text-decoration: underline; }
.dropdown-item { display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer; color: var(--text-secondary); }
.dropdown-item:hover { background: rgba(30,80,162,0.05); }
.item-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
.dropdown-empty { padding: 12px 14px; font-size: 13px; color: var(--text-muted); text-align: center; }
:deep(.dropdown-item b) { color: var(--text-accent); font-weight: 600; }
</style>
