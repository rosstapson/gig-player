import { useEffect, useRef, useState } from 'react'
import type { LrcLine } from '../lib/lrc'

interface LrcLyricsViewProps {
  lines: LrcLine[]
  /** The performance audio element — the active line is driven off its currentTime, not a timer. */
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export function LrcLyricsView({ lines, audioRef }: LrcLyricsViewProps): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(-1)
  const activeLineRef = useRef<HTMLParagraphElement>(null)
  const activeIndexRef = useRef(-1)

  useEffect(() => {
    let rafId: number

    function tick(): void {
      const time = audioRef.current?.currentTime ?? 0
      let idx = -1
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].time > time) break
        idx = i
      }
      if (idx !== activeIndexRef.current) {
        activeIndexRef.current = idx
        setActiveIndex(idx)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, [lines, audioRef])

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeIndex])

  if (lines.length === 0) {
    return <p className="performance-no-lyrics">No timed lyrics found in this file.</p>
  }

  return (
    <div className="lrc-lyrics">
      {lines.map((line, i) => (
        <p
          key={i}
          ref={i === activeIndex ? activeLineRef : undefined}
          className={i === activeIndex ? 'lrc-line lrc-line-active' : 'lrc-line'}
        >
          {line.text || ' '}
        </p>
      ))}
    </div>
  )
}
