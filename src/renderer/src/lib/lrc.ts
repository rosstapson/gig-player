export interface LrcLine {
  time: number
  text: string
}

// Matches [mm:ss], [mm:ss.xx], or [mm:ss:xx] tags. Non-timestamp metadata tags like
// [ar:Artist] or [ti:Title] don't match (their first group isn't digits-colon-digits)
// so lines carrying only those are naturally dropped below.
const TIMESTAMP_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g

/** Parses standard .lrc timed-lyrics text into a time-sorted list of lines. */
export function parseLrc(source: string): LrcLine[] {
  const lines: LrcLine[] = []

  for (const rawLine of source.split(/\r?\n/)) {
    TIMESTAMP_RE.lastIndex = 0
    const times: number[] = []
    let match: RegExpExecArray | null
    while ((match = TIMESTAMP_RE.exec(rawLine))) {
      const minutes = Number(match[1])
      const seconds = Number(match[2])
      const fraction = match[3] ? Number(match[3].padEnd(3, '0').slice(0, 3)) / 1000 : 0
      times.push(minutes * 60 + seconds + fraction)
    }
    if (times.length === 0) continue

    const text = rawLine.replace(TIMESTAMP_RE, '').trim()
    for (const time of times) lines.push({ time, text })
  }

  return lines.sort((a, b) => a.time - b.time)
}
