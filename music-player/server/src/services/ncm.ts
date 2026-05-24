import crypto from 'crypto'
import axios from 'axios'
import { getConfig } from './platformConfig'

const MODULUS_HEX = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const NONCE = '0CoJUm6Qyw8W8jud'
const IV = '0102030405060708'

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://music.163.com/',
  'Content-Type': 'application/x-www-form-urlencoded',
}

function getReqHeaders(): Record<string, string> {
  const userCookie = getConfig().neteaseCookie
  const base = 'os=pc; appver=2.9.7;'
  return {
    ...BASE_HEADERS,
    Cookie: userCookie ? `${base} ${userCookie}` : base,
  }
}

let rsaPubKey: crypto.KeyObject | null = null

function getPubKey(): crypto.KeyObject {
  if (!rsaPubKey) {
    let modHex = MODULUS_HEX
    if (modHex.length > 256) modHex = modHex.substring(2)
    rsaPubKey = crypto.createPublicKey({
      key: {
        kty: 'RSA',
        n: Buffer.from(modHex, 'hex').toString('base64url'),
        e: 'AQAB',
      },
      format: 'jwk',
    })
  }
  return rsaPubKey
}

function aesEncrypt(text: string, key: string, iv: string): string {
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(key, 'utf8'), Buffer.from(iv, 'utf8'))
  return Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]).toString('base64')
}

function randStr(size: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = ''
  for (let i = 0; i < size; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

function rsaEncrypt(text: string): string {
  const reversed = Buffer.from(text.split('').reverse().join(''), 'utf8')
  const key = getPubKey()
  const keySize = (key.asymmetricKeyDetails as { modulusLength: number }).modulusLength / 8
  const padded = Buffer.concat([Buffer.alloc(keySize - reversed.length), reversed])
  return crypto.publicEncrypt({ key, padding: crypto.constants.RSA_NO_PADDING }, padded).toString('hex')
}

function weapi(data: Record<string, unknown>): { params: string; encSecKey: string } {
  const secKey = randStr(16)
  const encText = aesEncrypt(aesEncrypt(JSON.stringify(data), NONCE, IV), secKey, IV)
  return { params: encText, encSecKey: rsaEncrypt(secKey) }
}

async function weapiPost(url: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const p = weapi(data)
    const resp = await axios.post(url, new URLSearchParams(p).toString(), {
      headers: getReqHeaders(),
      timeout: 15000,
    })
    return resp.data as Record<string, unknown>
  } catch {
    return null
  }
}

// --- Public API ---

export interface NCMSong {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverUrl: string
  albumId: string
}

export async function getPlaylistSongs(playlistId: string): Promise<NCMSong[] | null> {
  const data = await weapiPost('https://music.163.com/weapi/v6/playlist/detail', {
    id: playlistId,
    n: 100000,
    s: 8,
  })

  if (data?.code !== 200) return null

  const tracks = (data?.playlist as Record<string, unknown>)?.tracks as Record<string, unknown>[]
  if (!tracks) return null

  return tracks.map((t, i) => {
    const album = (t.al as Record<string, unknown>) || {}
    const coverUrl = album.picUrl ? String(album.picUrl) : ''

    return {
      id: i + 1,
      title: String(t.name || '未知歌曲'),
      artist: ((t.ar as Record<string, unknown>[]) || []).map((a: Record<string, unknown>) => a.name).join('、') || '未知歌手',
      album: String(album.name || '未知专辑'),
      duration: Math.round(Number(t.dt) / 1000) || 240,
      filePath: String(t.id || ''),
      coverUrl: coverUrl ? `${coverUrl}?param=300y300` : '',
      albumId: String(album.id || ''),
    }
  })
}

export async function getLyrics(songId: string): Promise<string> {
  const data = await weapiPost('https://music.163.com/weapi/song/lyric', {
    id: songId,
    lv: -1,
    tv: -1,
  })
  const lrc = (data as Record<string, unknown>)?.lrc as Record<string, unknown> | undefined
  if (lrc?.lyric) return String(lrc.lyric)
  return ''
}

export async function getSongUrl(songId: string): Promise<string> {
  // Try quality levels from highest to lowest, prefer full-length over trial
  const qualities = [320000, 999000, 128000]
  let trialUrl = ''

  for (const br of qualities) {
    const data = await weapiPost('https://music.163.com/weapi/song/enhance/player/url', {
      ids: `[${songId}]`,
      br,
    })

    const list = data?.data as Record<string, unknown>[] | undefined
    if (list && list.length > 0) {
      const item = list[0]
      const url = String(item.url || '')
      if (!url) continue
      // Full-length URL (no freeTrialInfo) — return immediately
      if (!item.freeTrialInfo) return url
      // Trial URL — save as fallback, keep trying higher quality
      if (!trialUrl) trialUrl = url
    }
  }

  // Fall back to trial URL (30s preview) if no full-length URL available
  return trialUrl
}


// --- Unified Netease search (type: 1=song, 1000=playlist, 10=album, 100=artist, 1014=video) ---

export interface NCMPlaylist {
  id: number
  name: string
  coverUrl: string
  playCount: number
  trackCount: number
  creator: string
}

export interface NCMAlbum {
  id: number
  name: string
  artist: string
  coverUrl: string
  songCount: number
}

export interface NCMArtist {
  id: number
  name: string
  coverUrl: string
  albumCount: number
}

export interface NCMVideo {
  id: number
  title: string
  coverUrl: string
  duration: number
  playCount: number
  artist: string
}

export async function searchSong(keyword: string, limit = 5): Promise<NCMSong[]> {
  const data = await weapiPost('https://music.163.com/weapi/search/get', {
    s: keyword,
    type: 1,
    limit,
    offset: 0,
  })

  if (!data || data.code !== 200) return []

  const songs = (data.result as Record<string, unknown>)?.songs as Record<string, unknown>[] | undefined
  if (!songs || !Array.isArray(songs)) return []

  return songs.map((t, i) => {
    const album = (t.al as Record<string, unknown>) || {}
    const coverUrl = album.picUrl ? String(album.picUrl) : ''

    return {
      id: i + 1,
      title: String(t.name || ''),
      artist: ((t.ar as Record<string, unknown>[]) || []).map(a => String(a.name || '')).join('、'),
      album: String(album.name || ''),
      duration: Math.round(Number(t.dt) / 1000) || 0,
      filePath: String(t.id || ''),
      coverUrl: coverUrl ? `${coverUrl}?param=300y300` : '',
      albumId: String(album.id || ''),
    }
  })
}

export async function searchPlaylists(keyword: string, limit = 6): Promise<NCMPlaylist[]> {
  const data = await weapiPost('https://music.163.com/weapi/search/get', {
    s: keyword, type: 1000, limit, offset: 0,
  })
  if (!data || data.code !== 200) return []
  const list = (data.result as Record<string, unknown>)?.playlists as Record<string, unknown>[] | undefined
  if (!list) return []
  return list.map(p => ({
    id: Number(p.id) || 0,
    name: String(p.name || ''),
    coverUrl: String(p.coverImgUrl || '') + '?param=200y200',
    playCount: Number(p.playCount) || 0,
    trackCount: Number(p.trackCount) || 0,
    creator: String((p.creator as Record<string, unknown>)?.nickname || ''),
  }))
}

export async function searchAlbums(keyword: string, limit = 6): Promise<NCMAlbum[]> {
  const data = await weapiPost('https://music.163.com/weapi/search/get', {
    s: keyword, type: 10, limit, offset: 0,
  })
  if (!data || data.code !== 200) return []
  const list = (data.result as Record<string, unknown>)?.albums as Record<string, unknown>[] | undefined
  if (!list) return []
  return list.map(a => ({
    id: Number(a.id) || 0,
    name: String(a.name || ''),
    artist: String((a.artist as Record<string, unknown>)?.name || ''),
    coverUrl: String(a.picUrl || '') + '?param=200y200',
    songCount: Number(a.size) || 0,
  }))
}

export async function searchArtists(keyword: string, limit = 6): Promise<NCMArtist[]> {
  const data = await weapiPost('https://music.163.com/weapi/search/get', {
    s: keyword, type: 100, limit, offset: 0,
  })
  if (!data || data.code !== 200) return []
  const list = (data.result as Record<string, unknown>)?.artists as Record<string, unknown>[] | undefined
  if (!list) return []
  return list.map(a => ({
    id: Number(a.id) || 0,
    name: String(a.name || ''),
    coverUrl: String(a.picUrl || '') + '?param=200y200',
    albumCount: Number(a.albumSize) || 0,
  }))
}

export async function searchVideos(keyword: string, limit = 6): Promise<NCMVideo[]> {
  const data = await weapiPost('https://music.163.com/weapi/search/get', {
    s: keyword, type: 1014, limit, offset: 0,
  })
  if (!data || data.code !== 200) return []
  const list = (data.result as Record<string, unknown>)?.videos as Record<string, unknown>[] | undefined
  if (!list) return []
  return list.map(v => ({
    id: Number(v.vid) || 0,
    title: String(v.title || ''),
    coverUrl: String(v.coverUrl || '') + '?param=200y200',
    duration: Math.round(Number(v.durationms) / 1000) || 0,
    playCount: Number(v.playTime) || 0,
    artist: String((v.creator as Record<string, unknown>[])?.map(c => String((c as Record<string, unknown>).userName || '')).join('、') || ''),
  }))
}