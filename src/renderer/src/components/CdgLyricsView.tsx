import CDGraphics from 'cdgraphics'
import { useEffect, useRef, useState } from 'react'

interface CdgLyricsViewProps {
  data: ArrayBuffer
  /** The performance audio element — CDG frames are driven off its currentTime, not a timer. */
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export function CdgLyricsView({ data, audioRef }: CdgLyricsViewProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cdg: CDGraphics
    try {
      cdg = new CDGraphics(data)
    } catch {
      setError('This .cdg file is corrupt or unreadable.')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number

    function draw(): void {
      const time = audioRef.current?.currentTime ?? 0
      const frame = cdg.render(time)
      if (frame.isChanged) {
        if (canvas!.width !== frame.imageData.width) canvas!.width = frame.imageData.width
        if (canvas!.height !== frame.imageData.height) canvas!.height = frame.imageData.height
        ctx!.putImageData(frame.imageData, 0, 0)
      }
      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafId)
  }, [data, audioRef])

  if (error) {
    return <p className="performance-no-lyrics performance-error-text">{error}</p>
  }

  return <canvas ref={canvasRef} className="cdg-canvas" />
}
