import { watch } from 'vue'
import { usePlayerStore } from '../stores/player'
import { playApi } from '../api/play'
import { getServerUrl } from '../config'

let preloadAudio: HTMLAudioElement | null = null

function getPreloader(): HTMLAudioElement {
  if (!preloadAudio) {
    preloadAudio = new Audio()
    preloadAudio.crossOrigin = 'anonymous'
    preloadAudio.preload = 'auto'
    preloadAudio.volume = 0
  }
  return preloadAudio
}

async function resolveUrl(filePath: string, albumId: string, sourcePlatform: string, externalLink?: string): Promise<string> {
  let hash = filePath
  let platform = sourcePlatform

  if (!hash && externalLink) {
    if (!platform) {
      if (externalLink.includes('kugou')) platform = 'kugou'
      else if (externalLink.includes('music.163')) platform = 'netease'
      else if (externalLink.includes('y.qq.com') || externalLink.includes('qq.com')) platform = 'qqmusic'
    }
    const kugouMatch = externalLink.match(/[#&]hash=([A-Fa-f0-9]+)/)
    if (kugouMatch) hash = kugouMatch[1].toUpperCase()
  }

  if (!hash) return ''
  if (/^[a-zA-Z]:[\\/]/.test(hash)) {
    return `${getServerUrl()}/api/local/audio?path=${encodeURIComponent(hash)}`
  }
  try {
    const res = await playApi.resolveUrl(hash, albumId, platform)
    if (res.data.url) return res.data.url
  } catch { /* unavailable */ }
  return ''
}

export function useAudioPreload() {
  const player = usePlayerStore()

  watch(() => player.currentIndex, async () => {
    const preloader = getPreloader()
    // Abort current preload
    preloader.src = ''
    preloader.removeAttribute('src')

    const nextIdx = player.currentIndex + 1
    if (nextIdx >= player.playlist.length) return

    const nextSong = player.playlist[nextIdx]
    if (!nextSong) return

    const url = await resolveUrl(
      nextSong.filePath || (nextSong as Record<string, string>).localPath || '',
      nextSong.albumId || '',
      nextSong.sourcePlatform || '',
      nextSong.externalLink
    )
    if (url) {
      preloader.src = url
    }
  })
}
