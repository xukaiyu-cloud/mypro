export interface LyricLine {
  time: number
  text: string
}

export function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = []
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g

  for (const raw of lrc.split(/\r?\n/)) {
    const text = raw.replace(timeRegex, '').trim()
    if (!text) continue

    let match: RegExpExecArray | null
    timeRegex.lastIndex = 0
    while ((match = timeRegex.exec(raw)) !== null) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0
      lines.push({ time: min * 60 + sec + ms / 1000, text })
    }
  }

  lines.sort((a, b) => a.time - b.time)
  return lines
}

export function findActiveLine(lines: LyricLine[], currentTime: number): number {
  let active = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) active = i
    else break
  }
  return active
}
