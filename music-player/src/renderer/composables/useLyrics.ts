import { computed, toValue, type ComputedRef, type MaybeRef } from 'vue'
import { parseLRC, findActiveLine, type LyricLine } from '../utils/lyrics'

export function useLyrics(
  lyricsSource: MaybeRef<string | null | undefined>,
  currentTime: MaybeRef<number>,
): {
  lines: ComputedRef<LyricLine[]>
  activeIndex: ComputedRef<number>
} {
  const lines = computed(() => {
    const src = toValue(lyricsSource)
    return src ? parseLRC(src) : []
  })

  const activeIndex = computed(() => findActiveLine(lines.value, toValue(currentTime)))

  return { lines, activeIndex }
}
