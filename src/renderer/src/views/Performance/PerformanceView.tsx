import type { Song } from '@shared/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toFileUrl } from '../../lib/fileUrl'
import { useLibraryStore } from '../../state/libraryStore'
import { useSetlistStore } from '../../state/setlistStore'

interface PerformanceViewProps {
  setlistId: string
  onExit: () => void
}

interface ArmedSkip {
  direction: 'next' | 'prev'
  targetIndex: number
}

const ARM_TIMEOUT_MS = 1500

export function PerformanceView({ setlistId, onExit }: PerformanceViewProps): React.JSX.Element {
  const { songs } = useLibraryStore()
  const setlist = useSetlistStore((state) => state.setlists.find((s) => s.id === setlistId))
  const songIds = useMemo(() => setlist?.songIds ?? [], [setlist])
  const orderedSongs = useMemo(() => {
    const byId = new Map(songs.map((s) => [s.id, s]))
    return songIds.map((id) => byId.get(id)).filter((s): s is Song => s !== undefined)
  }, [songs, songIds])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [lyricsText, setLyricsText] = useState<string | null>(null)
  const [armed, setArmed] = useState<ArmedSkip | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const armTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSong = orderedSongs[currentIndex] ?? null
  const nextSong = orderedSongs[currentIndex + 1] ?? null

  // Kiosk mode: fullscreen + block display sleep for the whole time we're on stage.
  useEffect(() => {
    window.api.performance.start()
    return () => {
      window.api.performance.stop()
    }
  }, [])

  // Load audio + lyrics whenever the current song changes. Preload immediately so
  // Space starts sound instantly rather than waiting on decoder init.
  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
    setLyricsText(null)
    if (lyricsRef.current) lyricsRef.current.scrollTop = 0

    if (!currentSong) return
    let cancelled = false

    window.api.library.resolvePath(currentSong.audioFile).then((absPath) => {
      if (cancelled || !audioRef.current) return
      audioRef.current.src = toFileUrl(absPath)
      audioRef.current.load()
    })

    if (currentSong.lyricsFile) {
      window.api.library.readText(currentSong.lyricsFile).then((text) => {
        if (!cancelled) setLyricsText(text)
      })
    }

    return () => {
      cancelled = true
    }
  }, [currentSong])

  function clearArmTimeout(): void {
    if (armTimeoutRef.current) {
      clearTimeout(armTimeoutRef.current)
      armTimeoutRef.current = null
    }
  }

  function arm(direction: 'next' | 'prev', targetIndex: number): void {
    clearArmTimeout()
    setArmed({ direction, targetIndex })
    armTimeoutRef.current = setTimeout(() => setArmed(null), ARM_TIMEOUT_MS)
  }

  function goTo(index: number): void {
    clearArmTimeout()
    setArmed(null)
    setCurrentIndex(index)
  }

  function togglePlay(): void {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play()
    else audio.pause()
  }

  function handleStop(): void {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setIsPlaying(false)
    setProgress(0)
  }

  function handleExit(): void {
    audioRef.current?.pause()
    onExit()
  }

  function requestSkip(direction: 'next' | 'prev'): void {
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    if (targetIndex < 0 || targetIndex >= orderedSongs.length) return
    if (armed && armed.direction === direction && armed.targetIndex === targetIndex) {
      goTo(targetIndex)
    } else {
      arm(direction, targetIndex)
    }
  }

  function scrollLyrics(delta: number): void {
    lyricsRef.current?.scrollBy({ top: delta, behavior: 'smooth' })
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          e.preventDefault()
          requestSkip('next')
          break
        case 'ArrowLeft':
          e.preventDefault()
          requestSkip('prev')
          break
        case 'ArrowUp':
          e.preventDefault()
          scrollLyrics(-120)
          break
        case 'ArrowDown':
          e.preventDefault()
          scrollLyrics(120)
          break
        case 'Escape':
          e.preventDefault()
          handleExit()
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, armed, orderedSongs.length])

  useEffect(() => clearArmTimeout, [])

  if (!currentSong) {
    return (
      <div className="performance-view performance-empty">
        <p>This setlist has no songs.</p>
        <button className="btn-secondary" onClick={onExit}>
          Exit
        </button>
      </div>
    )
  }

  const armedTarget = armed ? orderedSongs[armed.targetIndex] : null

  return (
    <div className="performance-view">
      <div className="performance-exit-hint">Esc to exit</div>

      <div className="performance-topbar">
        <div className="performance-meta mono">
          {currentSong.key}
          {currentSong.tempo ? ` · ${currentSong.tempo} BPM` : ''}
        </div>
        <div className="performance-title">
          {currentSong.title}
          <span className="performance-artist"> — {currentSong.artist}</span>
        </div>
        <div className="performance-next">
          {nextSong ? (
            <>
              <span className="performance-next-label">Next</span>
              {nextSong.title}
            </>
          ) : (
            <span className="performance-next-label">Last song</span>
          )}
        </div>
      </div>

      {armed && armedTarget && (
        <div className="performance-armed-banner">
          Press {armed.direction === 'next' ? '→' : '←'} again to{' '}
          {armed.direction === 'next' ? 'skip to' : 'go back to'} “{armedTarget.title}”
        </div>
      )}

      <div className="performance-lyrics" ref={lyricsRef}>
        {lyricsText ? (
          <pre>{lyricsText}</pre>
        ) : (
          <p className="performance-no-lyrics">No lyrics for this song.</p>
        )}
      </div>

      <div className="performance-transport">
        <button className="performance-stop" onClick={handleStop} aria-label="Emergency stop">
          ■
        </button>
        <button
          className="performance-play"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <div className="performance-progress">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget
          if (audio.duration > 0) setProgress(audio.currentTime / audio.duration)
        }}
      />
    </div>
  )
}
