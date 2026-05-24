import type { Song } from './song'
import type { SourceType } from '../../shared/types'

export interface Playlist {
  id: number
  userId: number
  name: string
  description: string
  sourceType: SourceType
  songs: Song[]
  updatedAt: string
}
