export interface Song {
  id: number
  title: string
  artist: string
  album: string
  duration: number
  filePath: string
  coverUrl: string
  sourcePlatform?: string
  externalLink?: string
  albumId?: string
  audioUrl?: string
  lyrics?: string
}
