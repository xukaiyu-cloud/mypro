<template>
  <div class="search-page">
    <h3 v-if="q">搜索结果："{{ q }}"</h3>
    <h3 v-else>搜索歌曲</h3>

    <div v-if="explanation" class="ai-banner">
      <span class="ai-icon">🤖</span>
      <span>AI 理解: "{{ explanation }}"</span>
    </div>

    <!-- Skeleton loading -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 6" :key="i" class="skeleton-row">
        <div class="skeleton-cover" />
        <div class="skeleton-lines">
          <div class="skeleton-line w60" />
          <div class="skeleton-line w40" />
        </div>
      </div>
    </div>

    <template v-if="!loading && q">
      <el-tabs v-model="activeTab" class="search-tabs">
        <el-tab-pane label="综合" name="all" />
        <el-tab-pane :label="'单曲 (' + data.songs.length + ')'" name="songs" />
        <el-tab-pane :label="'歌手 (' + data.artists.length + ')'" name="artists" />
        <el-tab-pane :label="'专辑 (' + data.albums.length + ')'" name="albums" />
        <el-tab-pane :label="'歌单 (' + data.playlists.length + ')'" name="playlists" />
        <el-tab-pane :label="'歌词 (' + data.lyricSongs.length + ')'" name="lyrics" />
        <el-tab-pane v-if="data.videos.length > 0" :label="'视频 (' + data.videos.length + ')'" name="videos" />
      </el-tabs>

      <!-- ===== 综合 ===== -->
      <div v-if="activeTab === 'all'" class="tab-content">
        <!-- Best match song (pinned) -->
        <section v-if="data.songs.length > 0" class="result-section">
          <div class="section-header">
            <h4>最佳匹配</h4>
            <div class="section-actions">
              <el-button size="small" type="primary" @click="playAllSongs">▶ 播放全部</el-button>
              <span class="section-more" @click="activeTab = 'songs'">更多 →</span>
            </div>
          </div>
          <SongTable :songs="data.songs.slice(0, 8)" />
        </section>

        <!-- Playlists -->
        <section v-if="data.playlists.length > 0" class="result-section">
          <div class="section-header"><h4>相关歌单</h4><span class="section-more" @click="activeTab = 'playlists'">更多 →</span></div>
          <div class="playlist-scroll">
            <PlaylistCard v-for="pl in data.playlists" :key="pl.id" :playlist="pl" @click="onPlaylistClick" @contextmenu="onPlaylistContext" />
          </div>
        </section>

        <!-- Artists -->
        <section v-if="data.artists.length > 0" class="result-section">
          <div class="section-header"><h4>相关歌手</h4><span class="section-more" @click="activeTab = 'artists'">更多 →</span></div>
          <div class="artist-scroll">
            <div v-for="a in data.artists.slice(0, 4)" :key="a.id" class="artist-chip">
              <div class="artist-avatar"><img v-if="a.coverUrl" :src="a.coverUrl" alt="" /><span v-else>🎤</span></div>
              <span class="artist-name">{{ a.name }}</span>
            </div>
          </div>
        </section>

        <!-- Lyrics match -->
        <section v-if="data.lyricSongs.length > 0" class="result-section">
          <div class="section-header"><h4>歌词匹配</h4><span class="section-more" @click="activeTab = 'lyrics'">更多 →</span></div>
          <SongTable :songs="data.lyricSongs.slice(0, 5)" />
        </section>

        <p v-if="isEmpty" class="empty">{{ searchType === 'ai' ? '没有找到匹配的内容，试试换个说法？' : '无匹配结果 — 试试拼音或艺人别名？' }}</p>
      </div>

      <!-- ===== 单曲 ===== -->
      <div v-if="activeTab === 'songs'" class="tab-content">
        <div v-if="data.songs.length > 0" class="section-actions-bar">
          <el-button size="small" type="primary" @click="playAllSongs">▶ 播放全部 ({{ data.songs.length }})</el-button>
        </div>
        <SongTable v-if="data.songs.length > 0" :songs="data.songs" />
        <p v-else class="empty">未找到相关单曲</p>
      </div>

      <!-- ===== 歌手 ===== -->
      <div v-if="activeTab === 'artists'" class="tab-content">
        <div v-if="data.artists.length > 0" class="simple-grid">
          <div v-for="a in data.artists" :key="a.id" class="simple-card">
            <div class="simple-cover artist-cover"><img v-if="a.coverUrl" :src="a.coverUrl" alt="" /><span v-else>🎤</span></div>
            <div class="simple-title" v-html="hl(a.name)" />
            <div class="simple-meta">{{ a.albumCount }} 张专辑</div>
          </div>
        </div>
        <p v-else class="empty">未找到相关歌手</p>
      </div>

      <!-- ===== 专辑 ===== -->
      <div v-if="activeTab === 'albums'" class="tab-content">
        <div v-if="data.albums.length > 0" class="simple-grid">
          <div v-for="a in data.albums" :key="a.id" class="simple-card">
            <div class="simple-cover"><img v-if="a.coverUrl" :src="a.coverUrl" alt="" /><span v-else>💿</span></div>
            <div class="simple-title" v-html="hl(a.name)" />
            <div class="simple-meta">{{ a.artist }} · {{ a.songCount }} 首</div>
          </div>
        </div>
        <p v-else class="empty">未找到相关专辑</p>
      </div>

      <!-- ===== 歌单 ===== -->
      <div v-if="activeTab === 'playlists'" class="tab-content">
        <div v-if="data.playlists.length > 0" class="playlist-grid">
          <PlaylistCard v-for="pl in data.playlists" :key="pl.id" :playlist="pl" @click="onPlaylistClick" @contextmenu="onPlaylistContext" />
        </div>
        <p v-else class="empty">未找到相关歌单</p>
      </div>

      <!-- ===== 歌词 ===== -->
      <div v-if="activeTab === 'lyrics'" class="tab-content">
        <SongTable v-if="data.lyricSongs.length > 0" :songs="data.lyricSongs" />
        <p v-else class="empty">未找到歌词包含关键词的歌曲</p>
      </div>

      <!-- ===== 视频 ===== -->
      <div v-if="activeTab === 'videos' && data.videos.length > 0" class="tab-content">
        <div class="video-list">
          <div v-for="v in data.videos" :key="v.id" class="video-row">
            <div class="video-row-cover"><img v-if="v.coverUrl" :src="v.coverUrl" alt="" /><span class="video-duration">{{ fmtDuration(v.duration) }}</span></div>
            <div class="video-row-info">
              <div class="video-row-title" v-html="hl(v.title)" />
              <div class="video-row-meta">{{ v.artist }} · {{ fmtCount(v.playCount) }} 次播放</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty initial state with smart suggestions -->
    <div v-if="!q && !loading" class="empty-state">
      <p class="empty-hint">🔍 试试这些搜索：</p>
      <div class="empty-chips">
        <span v-for="t in hotExamples" :key="t" class="empty-chip" @click="quickSearch(t)">{{ t }}</span>
      </div>
    </div>

    <!-- Add-to-playlist dialog -->
    <el-dialog v-model="showPlaylistDialog" title="添加到歌单" width="360px">
      <el-select v-model="selectedPlaylistId" placeholder="选择歌单" style="width:100%">
        <el-option v-for="pl in playlistStore.localPlaylists" :key="pl.id" :label="pl.name" :value="pl.id" />
      </el-select>
      <template #footer>
        <el-button @click="showPlaylistDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAddToPlaylist">确认</el-button>
      </template>
    </el-dialog>

    <!-- Playlist detail modal -->
    <PlaylistDetailModal v-model:playlist="selectedPlaylist" />

    <!-- Batch add playlist songs dialog -->
    <el-dialog v-model="showBatchAddDialog" title="将歌单歌曲添加到我的歌单" width="360px">
      <el-select v-model="selectedPlaylistId" placeholder="选择目标歌单" style="width:100%">
        <el-option v-for="pl in playlistStore.localPlaylists" :key="pl.id" :label="pl.name" :value="pl.id" />
      </el-select>
      <template #footer>
        <el-button @click="showBatchAddDialog = false">取消</el-button>
        <el-button type="primary" :loading="batchAdding" @click="batchAddPlaylistSongs">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- Context menu (teleported to body by component) -->
    <ContextMenu ref="contextMenuRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Song } from '../types/song'
import SongTable from '../components/SongTable.vue'
import PlaylistCard from '../components/PlaylistCard.vue'
import PlaylistDetailModal from '../components/PlaylistDetailModal.vue'
import ContextMenu from '../components/ContextMenu.vue'
import { searchApi, type SearchData, type PlaylistItem } from '../api/search'
import { usePlayerStore } from '../stores/player'
import { useFavoritesStore } from '../stores/favorites'
import { usePlaylistStore } from '../stores/playlist'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const player = usePlayerStore()
const favStore = useFavoritesStore()
const playlistStore = usePlaylistStore()

const q = computed(() => (route.query.q as string) ?? '')
const mode = computed(() => (route.query.mode as string) ?? '')

const activeTab = ref('all')
const loading = ref(false)
const explanation = ref('')
const searchType = ref<'ai' | 'normal' | ''>('')

const data = reactive<SearchData>({
  query: '', explanation: '', songs: [], playlists: [],
  albums: [], artists: [], videos: [], lyricSongs: [], searchType: 'normal',
})

const hotExamples = ['周杰伦', '安静治愈', '抖音热门', '薛之谦', '开车听的歌', '粤语经典']

const showPlaylistDialog = ref(false)
const selectedPlaylistId = ref<number | null>(null)
const pendingSong = ref<Song | null>(null)
const selectedPlaylist = ref<PlaylistItem | null>(null)
const pendingPlaylist = ref<PlaylistItem | null>(null)
const showBatchAddDialog = ref(false)
const contextMenuRef = ref<InstanceType<typeof ContextMenu> | null>(null)

const isEmpty = computed(() =>
  data.songs.length === 0 && data.playlists.length === 0 &&
  data.artists.length === 0 && data.albums.length === 0 &&
  data.lyricSongs.length === 0 && data.videos.length === 0
)

function hl(text: string): string {
  const kw = q.value.trim()
  if (!kw || !text) return text
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<b>$1</b>')
}

watch([q, mode], async ([newQ, newMode]) => {
  if (!newQ) {
    Object.assign(data, { query: '', explanation: '', songs: [], playlists: [], albums: [], artists: [], videos: [], lyricSongs: [] })
    explanation.value = ''; searchType.value = ''
    return
  }
  loading.value = true; activeTab.value = 'all'; explanation.value = ''
  try {
    const res = newMode === 'ai' ? await searchApi.aiSearch(newQ) : await searchApi.quickSearch(newQ)
    if (res.code === 200 && res.data) {
      // Assign unique sequential IDs to avoid collisions from multi-platform sources
      res.data.songs.forEach((s, i) => { s.id = i + 1 })
      res.data.lyricSongs.forEach((s, i) => { s.id = 1000 + i + 1 })
      Object.assign(data, res.data)
      explanation.value = res.data.explanation
      searchType.value = res.data.searchType
    }
  } catch { Object.assign(data, { query: '', explanation: '', songs: [], playlists: [], albums: [], artists: [], videos: [], lyricSongs: [] }) }
  finally { loading.value = false }
}, { immediate: true })

function playAllSongs() {
  if (data.songs.length === 0) { ElMessage.info('没有可播放的歌曲'); return }
  player.playlist.splice(0, player.playlist.length, ...data.songs)
  player.play(data.songs[0])
}
function quickSearch(kw: string) { router.push({ name: 'Search', query: { q: kw } }) }
function addToPlaylist(song: Song) { pendingSong.value = song; showPlaylistDialog.value = true }
function confirmAddToPlaylist() {
  if (!selectedPlaylistId.value || !pendingSong.value) return
  playlistStore.addSongsToPlaylist(selectedPlaylistId.value, [pendingSong.value])
  ElMessage.success('已加入歌单')
  showPlaylistDialog.value = false; pendingSong.value = null; selectedPlaylistId.value = null
}
function toggleFav(song: Song) { favStore.toggleFavorite(song) }
function fmtCount(n: number): string { if (n >= 1e8) return (n/1e8).toFixed(1)+'亿'; if (n>=1e4) return (n/1e4).toFixed(0)+'万'; return String(n) }
const batchAdding = ref(false)
async function batchAddPlaylistSongs() { if (!pendingPlaylist.value || !selectedPlaylistId.value) return; batchAdding.value = true; try { const res = await searchApi.playlistSongs(pendingPlaylist.value.id); if (res.code === 200 && res.data && res.data.songs.length > 0) { const added = playlistStore.addSongsToPlaylist(selectedPlaylistId.value, res.data.songs); ElMessage.success(`已添加 ${added} 首歌曲到歌单`) } else { ElMessage.warning('该歌单暂无歌曲') } } catch { ElMessage.error('获取歌单歌曲失败') } finally { batchAdding.value = false; showBatchAddDialog.value = false; pendingPlaylist.value = null } }
function fmtDuration(s: number): string { const m=Math.floor(s/60); const sec=Math.floor(s%60); return m+':'+sec.toString().padStart(2,'0') }

function onPlaylistClick(pl: PlaylistItem) { selectedPlaylist.value = pl }
function onPlaylistContext(e: MouseEvent, pl: PlaylistItem) {
  contextMenuRef.value?.open(e, [
    { key: 'view', label: '查看歌单详情', icon: '📋', action: () => { selectedPlaylist.value = pl } },
    { key: 'add', label: '添加到我的歌单', icon: '➕', action: () => { pendingPlaylist.value = pl; showBatchAddDialog.value = true } },
  ])
}
</script>

<style scoped>
.search-page { display: flex; flex-direction: column; flex: 1; min-height: 0; }
h3 { font-size: 15px; margin-bottom: 6px; flex-shrink: 0; }
.ai-banner { display: flex; align-items: center; gap: 8px; padding: 6px 14px; margin-bottom: 8px; background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06)); border: 1px solid rgba(99,102,241,0.15); border-radius: var(--radius-sm); font-size: 12px; color: var(--text-secondary); flex-shrink: 0; }
.ai-icon { font-size: 16px; }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.skeleton-row { display: flex; gap: 12px; align-items: center; }
.skeleton-cover { width: 40px; height: 40px; border-radius: var(--radius-sm); background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skeleton-line { height: 12px; border-radius: 4px; background: linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.04) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.w60 { width: 60%; } .w40 { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.search-tabs { flex-shrink: 0; margin-bottom: 4px; }
.tab-content { flex: 1; overflow-y: auto; min-height: 0; padding-bottom: 20px; }
.result-section { margin-bottom: 20px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.section-header h4 { font-size: 14px; font-weight: 600; margin: 0; }
.section-more { font-size: 12px; color: var(--text-accent); cursor: pointer; }
.section-more:hover { text-decoration: underline; }
.section-actions { display: flex; align-items: center; gap: 12px; }
.section-actions-bar { margin-bottom: 8px; }

.playlist-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; }
.playlist-scroll::-webkit-scrollbar { height: 4px; }
.playlist-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
.playlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }

.artist-scroll { display: flex; gap: 16px; }
.artist-chip { display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.artist-avatar { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02)); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.artist-avatar img { width: 100%; height: 100%; object-fit: cover; }
.artist-name { font-size: 12px; font-weight: 600; }

.simple-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; }
.simple-card { cursor: pointer; text-align: center; }
.simple-cover { width: 110px; height: 110px; border-radius: var(--radius-md); margin: 0 auto 6px; overflow: hidden; background: linear-gradient(135deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02)); display: flex; align-items: center; justify-content: center; font-size: 40px; opacity: 0.5; }
.simple-cover img { width: 100%; height: 100%; object-fit: cover; }
.artist-cover { border-radius: 50%; }
.simple-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.simple-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
:deep(.simple-title b) { color: var(--text-accent); }

.video-list { display: flex; flex-direction: column; gap: 10px; }
.video-row { display: flex; gap: 10px; align-items: center; cursor: pointer; }
.video-row-cover { width: 120px; height: 68px; border-radius: var(--radius-sm); overflow: hidden; position: relative; background: rgba(0,0,0,0.06); flex-shrink: 0; }
.video-row-cover img { width: 100%; height: 100%; object-fit: cover; }
.video-duration { position: absolute; right: 4px; bottom: 4px; padding: 1px 6px; border-radius: 4px; background: rgba(0,0,0,0.6); color: #fff; font-size: 10px; }
.video-row-info { flex: 1; min-width: 0; }
.video-row-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.video-row-meta { font-size: 11px; color: var(--text-muted); margin-top: 4px; }

.empty { color: var(--text-muted); text-align: center; padding: 60px 0; font-size: 13px; }
.empty-state { padding: 40px 0; text-align: center; }
.empty-hint { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; }
.empty-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.empty-chip { padding: 6px 14px; border-radius: 20px; background: rgba(30,80,162,0.06); color: var(--text-accent); font-size: 13px; cursor: pointer; transition: background 0.15s; }
.empty-chip:hover { background: rgba(30,80,162,0.12); }
</style>
