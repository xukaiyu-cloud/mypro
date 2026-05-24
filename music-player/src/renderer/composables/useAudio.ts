import { watch } from 'vue'
import { ElMessage } from 'element-plus'
import { usePlayerStore } from '../stores/player'
import type { Song } from '../types/song'
import { playApi } from '../api/play'

let audio: HTMLAudioElement | null = null
let lastKnownTime = 0
let resolveSeq = 0

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    audio.playbackRate = 1
  }
  return audio
}

function setupEvents(player: ReturnType<typeof usePlayerStore>) {
  const a = getAudio()
  a.ontimeupdate = () => {
    lastKnownTime = a.currentTime
    player.seekTo(a.currentTime)
  }
  a.onloadedmetadata = () => {
    if (a.duration && isFinite(a.duration)) player.duration = a.duration
  }
  a.onended = () => {
    if (player.playMode === 'single-loop') {
      a.currentTime = 0
      a.play()
    } else {
      player.next()
    }
  }
  a.onerror = () => {
    ElMessage.error('播放失败，该歌曲可能受版权保护或需VIP')
    player.pause()
  }
  a.onplay = () => {
    player.isPlaying = true
  }
  a.onpause = () => {
    player.isPlaying = false
  }
}

async function fetchLyricsForSong(song: Song) {
  try {
    const res = await playApi.fetchLyrics(song.filePath, song.sourcePlatform || '', song.title, song.artist)
    if (res.data.lyrics) {
      song.lyrics = res.data.lyrics
    }
  } catch { /* unavailable */ }
}

async function resolveUrl(song: NonNullable<ReturnType<typeof usePlayerStore>['currentSong']>): Promise<string> {
  if (song.audioUrl) return song.audioUrl

  // Local file path: C:\... or /home/...
  if (song.filePath && /^[a-zA-Z]:[\\/]/.test(song.filePath)) {
    return 'file:///' + song.filePath.replace(/\\/g, '/')
  }

  // Determine hash and platform
  let hash = song.filePath
  let platform = song.sourcePlatform || ''

  // If filePath is missing, try to extract from externalLink
  if ((!hash || hash.length <= 1) && song.externalLink) {
    const link = song.externalLink
    if (!platform) {
      if (link.includes('kugou')) platform = 'kugou'
      else if (link.includes('music.163')) platform = 'netease'
      else if (link.includes('y.qq.com') || link.includes('qq.com')) platform = 'qqmusic'
    }
    const kugouMatch = link.match(/[#&]hash=([A-Fa-f0-9]+)/)
    if (kugouMatch) hash = kugouMatch[1].toUpperCase()
  }

  // Try platform API resolution (Netease, Kugou, etc.)
  if (hash && hash.length > 1) {
    try {
      const res = await playApi.resolveUrl(hash, song.albumId || '', platform, song.title, song.artist)
      if (res.data.url) {
        song.audioUrl = res.data.url
        return res.data.url
      }
      console.warn('[resolveUrl] 返回空 URL:', { title: song.title, hash, platform })
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string }
      console.error('[resolveUrl] 解析失败:', {
        title: song.title, hash, platform,
        status: err?.response?.status,
        msg: err?.response?.data || err?.message,
      })
    }
  } else {
    console.warn('[resolveUrl] filePath 缺失:', { title: song.title, artist: song.artist, sourcePlatform: song.sourcePlatform, externalLink: song.externalLink })
  }

  return ''
}

export function useAudio() {
  const player = usePlayerStore()
  setupEvents(player)

  watch(() => player.currentSong, async (song) => {
    const a = getAudio()
    a.pause()
    a.src = ''
    a.removeAttribute('src')

    const seq = ++resolveSeq

    if (!song) return

    const url = await resolveUrl(song)

    // Discard stale result if user switched songs during URL resolution
    if (seq !== resolveSeq) return

    if (!url) {
      const platform = song.sourcePlatform || '未知平台'
      ElMessage.warning(`无法获取播放链接（${platform}），该歌曲可能需要版权授权`)
      player.pause()
      return
    }

    if (!song.lyrics && song.filePath && song.filePath.length > 1) {
      fetchLyricsForSong(song)
    }

    a.src = url
    a.volume = player.volume / 100
    try { a.play() } catch { /* autoplay blocked */ }
  })

  watch(() => player.isPlaying, (playing) => {
    const a = getAudio()
    if (playing && a.paused && a.src) {
      a.play()
    } else if (!playing && !a.paused) {
      a.pause()
    }
  })

  watch(() => player.volume, (v) => {
    getAudio().volume = v / 100
  })

  watch(() => player.playbackRate, (rate) => {
    getAudio().playbackRate = rate
  })

  // Seek from progress bar drag
  watch(() => player.currentTime, (t) => {
    const a = getAudio()
    if (Math.abs(a.currentTime - t) > 1 && Math.abs(lastKnownTime - t) > 0.1) {
      a.currentTime = t
    }
  })
}
