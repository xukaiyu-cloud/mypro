import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { searchSong, searchPlaylists, searchAlbums, searchArtists, searchVideos, getPlaylistSongs } from '../services/ncm'
import type { NCMPlaylist, NCMAlbum, NCMArtist, NCMVideo } from '../services/ncm'
import { parseIntent } from '../services/ai'
import { queryAll, execute, queryOne } from '../db'
import { toPinyinInitials, isPinyinPattern, expandAliases } from '../services/pinyin'
import axios from 'axios'

const router = Router()
router.use(authMiddleware)

interface SongResult {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverUrl: string
  sourcePlatform: string
  externalLink: string
  lyrics?: string
}

interface SearchData {
  query: string
  explanation: string
  songs: SongResult[]
  playlists: NCMPlaylist[]
  albums: NCMAlbum[]
  artists: NCMArtist[]
  videos: NCMVideo[]
  lyricSongs: SongResult[]
  searchType: 'ai' | 'normal'
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\(\)\[\]（）【】\s\-_.,，、]/g, '')
}

function dedupeSongs(songs: SongResult[]): SongResult[] {
  const seen = new Set<string>()
  const result = songs.filter(s => {
    const key = `${normalize(s.title)}|${normalize(s.artist)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // Assign unique sequential IDs to avoid collisions (e.g. Kugou songs all have id=0)
  result.forEach((s, i) => { s.id = i + 1 })
  return result
}

// Build MySQL LIKE clauses with pinyin support
function buildLocalSearchClauses(keywords: string[]): { clauses: string[]; params: string[] } {
  const clauses: string[] = []
  const params: string[] = []

  for (const kw of keywords) {
    const like = `%${kw}%`
    clauses.push('(title LIKE ? OR artist LIKE ? OR album LIKE ?)')
    params.push(like, like, like)

    // Pinyin matching: if input looks like pinyin, also search by pinyin initials
    if (isPinyinPattern(kw)) {
      clauses.push('(title LIKE ? OR artist LIKE ?)')
      // MySQL-side pinyin matching is approximate; we also do client-side filtering
      params.push(like, like)
    }

    // Expand aliases
    const aliases = expandAliases(kw)
    for (const alias of aliases) {
      if (alias !== kw) {
        const aliasLike = `%${alias}%`
        clauses.push('(title LIKE ? OR artist LIKE ?)')
        params.push(aliasLike, aliasLike)
      }
    }
  }

  return { clauses, params }
}

// Kugou search
async function searchKugou(keyword: string): Promise<SongResult[]> {
  try {
    const { data } = await axios.get('https://msearchcdn.kugou.com/api/v3/search/song', {
      params: { keyword, page: 1, pagesize: 10, showtype: 1 },
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const list = data?.data?.info || data?.data?.lists || []
    return (Array.isArray(list) ? list : []).map((item: Record<string, unknown>) => ({
      id: 0,
      title: String(item.songname || item.filename || ''),
      artist: String(item.singername || ''),
      album: String(item.album_name || ''),
      duration: Number(item.duration) || 0,
      filePath: String(item.hash || ''),
      coverUrl: String(item.cover || '').replace('{size}', '400'),
      sourcePlatform: 'kugou',
      externalLink: '',
    }))
  } catch { return [] }
}

// ---- Routes ----

router.post('/ai', async (req: Request, res: Response) => {
  try {
    const { query } = req.body
    if (!query || !query.trim()) {
      res.status(400).json({ code: 400, message: '请输入搜索内容', data: null })
      return
    }

    const intent = await parseIntent(query.trim())
    const songs: SongResult[] = []
    const lyricSongs: SongResult[] = []

    // Step 1: Local MySQL search
    if (intent.keywords.length > 0) {
      const { clauses, params } = buildLocalSearchClauses(intent.keywords)
      const localResults = queryAll(
        `SELECT * FROM song WHERE ${clauses.join(' OR ')} LIMIT 50`,
        params
      ) as Record<string, unknown>[]
      for (const s of localResults) {
        const song: SongResult = {
          id: s.id as number,
          title: String(s.title || ''),
          artist: String(s.artist || ''),
          album: String(s.album || ''),
          duration: Number(s.duration) || 0,
          filePath: String(s.file_path || ''),
          coverUrl: String(s.cover_url || ''),
          sourcePlatform: String(s.source_platform || ''),
          externalLink: String(s.external_link || ''),
        }
        songs.push(song)

        // Check for lyrics match
        const lyrics = String(s.lyrics || '')
        if (lyrics) {
          for (const kw of intent.keywords) {
            if (lyrics.includes(kw)) {
              lyricSongs.push({ ...song, lyrics })
              break
            }
          }
        }
      }
    }

    // Step 2: Pinyin filtering for local songs
    if (songs.length === 0 && isPinyinPattern(query.trim())) {
      const pinyinLocal = queryAll(
        'SELECT * FROM song LIMIT 200'
      ) as Record<string, unknown>[]
      for (const s of pinyinLocal) {
        const title = String(s.title || '')
        const artist = String(s.artist || '')
        const titlePy = toPinyinInitials(title)
        const artistPy = toPinyinInitials(artist)
        const input = query.trim().toLowerCase()
        if (titlePy.includes(input) || artistPy.includes(input) ||
            title.toLowerCase().includes(input) || artist.toLowerCase().includes(input)) {
          songs.push({
            id: s.id as number, title, artist,
            album: String(s.album || ''), duration: Number(s.duration) || 0,
            filePath: String(s.file_path || ''), coverUrl: String(s.cover_url || ''),
            sourcePlatform: String(s.source_platform || ''), externalLink: String(s.external_link || ''),
          })
        }
      }
    }

    // Step 3: Online search — multi-platform
    const searchTerms: string[] = []
    if (intent.genres.length > 0) searchTerms.push(...intent.genres)
    if (intent.keywords.length > 0) searchTerms.push(...intent.keywords)
    if (intent.referenceArtists.length > 0) searchTerms.push(...intent.referenceArtists)
    if (intent.mood) searchTerms.push(intent.mood)
    if (intent.artists.length > 0) searchTerms.push(...intent.artists)
    const uniqueTerms = [...new Set(searchTerms)]
    const primaryTerm = uniqueTerms[0] || query.trim()

    const [onlineSongs, kugouSongs, playlists, albums, artists, videos] = await Promise.allSettled([
      (async () => {
        const all: NonNullable<Awaited<ReturnType<typeof searchSong>>> = []
        for (const term of uniqueTerms.slice(0, 3)) {
          const r = await searchSong(term, 10)
          if (r) all.push(...r)
        }
        return all
      })(),
      searchKugou(primaryTerm),
      searchPlaylists(primaryTerm, 6),
      searchAlbums(primaryTerm, 6),
      searchArtists(primaryTerm, 6),
      searchVideos(primaryTerm, 6),
    ])

    if (onlineSongs.status === 'fulfilled') {
      for (const s of onlineSongs.value) {
        songs.push({ id: 0, title: s.title, artist: s.artist, album: s.album, duration: s.duration, filePath: s.filePath, coverUrl: s.coverUrl, sourcePlatform: 'netease', externalLink: '' })
      }
    }
    if (kugouSongs.status === 'fulfilled') songs.push(...kugouSongs.value)

    // Filter out excluded artists
    const excludeSet = new Set(intent.excludeArtists.map(a => normalize(a)))
    const filteredSongs = excludeSet.size > 0 ? songs.filter(s => !excludeSet.has(normalize(s.artist))) : songs

    const data: SearchData = {
      query: query.trim(),
      explanation: intent.explanation,
      songs: dedupeSongs(filteredSongs).slice(0, intent.limit),
      playlists: playlists.status === 'fulfilled' ? playlists.value : [],
      albums: albums.status === 'fulfilled' ? albums.value : [],
      artists: artists.status === 'fulfilled' ? artists.value : [],
      videos: videos.status === 'fulfilled' ? videos.value : [],
      lyricSongs: dedupeSongs(lyricSongs).slice(0, 10),
      searchType: 'ai',
    }

    // Record search
    recordSearch(query.trim())

    res.json({ code: 200, message: 'ok', data })
  } catch (e) {
    console.error('[search/ai] error:', e)
    res.status(500).json({ code: 500, message: '搜索失败', data: null })
  }
})

router.post('/quick', async (req: Request, res: Response) => {
  try {
    const { query } = req.body
    if (!query || !query.trim()) {
      res.status(400).json({ code: 400, message: '请输入搜索内容', data: null })
      return
    }

    const kw = query.trim()
    const songs: SongResult[] = []
    const lyricSongs: SongResult[] = []

    // Local search with pinyin support
    const { clauses, params } = buildLocalSearchClauses([kw])
    const localResults = queryAll(
      `SELECT * FROM song WHERE ${clauses.join(' OR ')} LIMIT 30`,
      params
    ) as Record<string, unknown>[]

    for (const s of localResults) {
      const song: SongResult = {
        id: s.id as number, title: String(s.title || ''), artist: String(s.artist || ''),
        album: String(s.album || ''), duration: Number(s.duration) || 0,
        filePath: String(s.file_path || ''), coverUrl: String(s.cover_url || ''),
        sourcePlatform: String(s.source_platform || ''), externalLink: String(s.external_link || ''),
      }
      songs.push(song)

      const lyrics = String(s.lyrics || '')
      if (lyrics && lyrics.includes(kw)) lyricSongs.push({ ...song, lyrics })
    }

    // Pinyin fallback
    if (songs.length === 0 && isPinyinPattern(kw)) {
      const pinyinLocal = queryAll('SELECT * FROM song LIMIT 200') as Record<string, unknown>[]
      for (const s of pinyinLocal) {
        const title = String(s.title || ''); const artist = String(s.artist || '')
        const titlePy = toPinyinInitials(title); const artistPy = toPinyinInitials(artist)
        const input = kw.toLowerCase()
        if (titlePy.includes(input) || artistPy.includes(input) || title.toLowerCase().includes(input) || artist.toLowerCase().includes(input)) {
          songs.push({
            id: s.id as number, title, artist, album: String(s.album || ''),
            duration: Number(s.duration) || 0, filePath: String(s.file_path || ''),
            coverUrl: String(s.cover_url || ''), sourcePlatform: String(s.source_platform || ''), externalLink: String(s.external_link || ''),
          })
        }
      }
    }

    // Multi-platform online search
    const [onlineSongs, kugouSongs, playlists, albums, artists, videos] = await Promise.allSettled([
      searchSong(kw, 10), searchKugou(kw), searchPlaylists(kw, 6),
      searchAlbums(kw, 6), searchArtists(kw, 6), searchVideos(kw, 6),
    ])

    if (onlineSongs.status === 'fulfilled' && onlineSongs.value) {
      for (const s of onlineSongs.value) {
        songs.push({ id: 0, title: s.title, artist: s.artist, album: s.album, duration: s.duration, filePath: s.filePath, coverUrl: s.coverUrl, sourcePlatform: 'netease', externalLink: '' })
      }
    }
    if (kugouSongs.status === 'fulfilled') songs.push(...kugouSongs.value)

    const data: SearchData = {
      query: kw, explanation: '',
      songs: dedupeSongs(songs).slice(0, 30),
      playlists: playlists.status === 'fulfilled' ? playlists.value : [],
      albums: albums.status === 'fulfilled' ? albums.value : [],
      artists: artists.status === 'fulfilled' ? artists.value : [],
      videos: videos.status === 'fulfilled' ? videos.value : [],
      lyricSongs: dedupeSongs(lyricSongs).slice(0, 10),
      searchType: 'normal',
    }

    recordSearch(kw)
    res.json({ code: 200, message: 'ok', data })
  } catch (e) {
    console.error('[search/quick] error:', e)
    res.status(500).json({ code: 500, message: '搜索失败', data: null })
  }
})

// ---- Search suggestions (real-time dropdown) ----
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const { query } = req.body
    if (!query || !query.trim()) {
      res.json({ code: 200, message: 'ok', data: { suggestions: [] } })
      return
    }

    const kw = query.trim()
    const like = `%${kw}%`

    // Quick local match for suggestions (first 5 matches)
    const localSongs = queryAll(
      'SELECT title, artist FROM song WHERE title LIKE ? OR artist LIKE ? LIMIT 5',
      [like, like]
    ) as Record<string, unknown>[]

    const suggestions: { text: string; type: 'song' | 'history' | 'hot' }[] = []

    // Local matches
    for (const s of localSongs) {
      suggestions.push({
        text: `${String(s.title || '')} — ${String(s.artist || '')}`,
        type: 'song',
      })
    }

    // Search history
    const history = queryAll(
      'SELECT keyword, COUNT(*) as cnt FROM search_history WHERE keyword LIKE ? GROUP BY keyword ORDER BY cnt DESC LIMIT 3',
      [like]
    ) as Record<string, unknown>[]
    for (const h of history) {
      suggestions.push({ text: String(h.keyword || ''), type: 'history' })
    }

    res.json({ code: 200, message: 'ok', data: { suggestions } })
  } catch {
    res.json({ code: 200, message: 'ok', data: { suggestions: [] } })
  }
})

// ---- Trending searches ----
router.get('/trending', (_req: Request, res: Response) => {
  try {
    const trending = queryAll(
      'SELECT keyword, COUNT(*) as cnt FROM search_history GROUP BY keyword ORDER BY cnt DESC LIMIT 10'
    ) as Record<string, unknown>[]
    res.json({
      code: 200, message: 'ok',
      data: trending.map(t => ({ keyword: t.keyword, count: t.cnt })),
    })
  } catch {
    res.json({ code: 200, message: 'ok', data: [] })
  }
})

// ---- Search history ----
router.get('/history', (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: number }).userId
    const history = queryAll(
      'SELECT keyword, MAX(created_at) as last_time FROM search_history WHERE user_id = ? GROUP BY keyword ORDER BY last_time DESC LIMIT 20',
      [userId]
    ) as Record<string, unknown>[]
    res.json({
      code: 200, message: 'ok',
      data: history.map(h => ({ keyword: h.keyword, lastTime: h.last_time })),
    })
  } catch {
    res.json({ code: 200, message: 'ok', data: [] })
  }
})

// ---- Clear history ----
router.delete('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: number }).userId
    await queryOne('DELETE FROM search_history WHERE user_id = ?', [userId])
    res.json({ code: 200, message: '已清除', data: null })
  } catch {
    res.status(500).json({ code: 500, message: '清除失败', data: null })
  }
})

// ---- Record search ----
function recordSearch(keyword: string): void {
  try {
    execute(
      "INSERT INTO search_history (keyword, created_at) VALUES (?, datetime('now'))",
      [keyword]
    )
  } catch { /* non-critical */ }
}


// ---- Playlist detail: fetch songs in a playlist ----
router.post('/playlist-songs', async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.body
    if (!playlistId) {
      res.status(400).json({ code: 400, message: '缺少歌单ID', data: null })
      return
    }

    const songs = await getPlaylistSongs(String(playlistId))
    if (!songs) {
      res.json({ code: 200, message: 'ok', data: { songs: [] } })
      return
    }

    const result: SongResult[] = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      filePath: s.filePath,
      coverUrl: s.coverUrl,
      sourcePlatform: 'netease',
      externalLink: '',
    }))

    res.json({ code: 200, message: 'ok', data: { songs: result } })
  } catch (e) {
    console.error('[search/playlist-songs] error:', e)
    res.status(500).json({ code: 500, message: '获取歌单歌曲失败', data: null })
  }
})

export default router
