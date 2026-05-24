import type { Song } from '../types/song'
import type { SongInfo } from '../stores/listen'

export function songToSongInfo(s: Song): SongInfo {
  return {
    title: s.title,
    artist: s.artist,
    album: s.album,
    coverUrl: s.coverUrl || '',
    duration: s.duration,
    sourceUrl: s.audioUrl || s.filePath || '',
    sourcePlatform: s.sourcePlatform || '',
    lyrics: s.lyrics || '',
  }
}

export function songInfoToSong(info: SongInfo): Song {
  return {
    id: Date.now(),
    title: info.title,
    artist: info.artist,
    album: info.album,
    duration: info.duration,
    filePath: info.sourceUrl,
    audioUrl: info.sourceUrl,
    coverUrl: info.coverUrl,
    sourcePlatform: info.sourcePlatform,
    lyrics: info.lyrics,
  }
}
