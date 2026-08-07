import type { Song } from '@shared/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CdgLyricsView } from '../../components/CdgLyricsView'
import { LrcLyricsView } from '../../components/LrcLyricsView'
import { toMediaUrl } from '../../lib/fileUrl'
import { type LrcLine, parseLrc } from '../../lib/lrc'
import { useLibraryStore } from '../../state/libraryStore'
import { useSetlistStore } from '../../state/setlistStore'

type PerformanceSource = { setlistId: string } | { songs: Song[] }

type PerformanceViewProps = PerformanceSource & {
  startIndex?: number
  onExit: () => void
}

interface ArmedSkip {
  direction: 'next' | 'prev'
  targetIndex: number
}

const ARM_TIMEOUT_MS = 1500
const FADE_OUT_SECONDS = 3

export function PerformanceView(props: PerformanceViewProps): React.JSX.Element {
  const { startIndex = 0, onExit } = props
  const setlistId = 'setlistId' in props ? props.setlistId : null
  const ephemeralSongs = 'songs' in props ? props.songs : null

  const { songs: librarySongs } = useLibraryStore()
  const setlist = useSetlistStore((state) =>
    setlistId ? state.setlists.find((s) => s.id === setlistId) : undefined
  )
  const songIds = useMemo(() => setlist?.songIds ?? [], [setlist])
  const orderedSongs = useMemo(() => {
    if (ephemeralSongs) return ephemeralSongs
    const byId = new Map(librarySongs.map((s) => [s.id, s]))
    return songIds.map((id) => byId.get(id)).filter((s): s is Song => s !== undefined)
  }, [ephemeralSongs, librarySongs, songIds])

  const [currentIndex, setCurrentIndex] = useState(
    startIndex >= 0 && startIndex < orderedSongs.length ? startIndex : 0
  )
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [lyricsText, setLyricsText] = useState<string | null>(null)
  const [lrcLines, setLrcLines] = useState<LrcLine[] | null>(null)
  const [cdgData, setCdgData] = useState<ArrayBuffer | null>(null)
  const [lyricsError, setLyricsError] = useState<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
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

  // Persist where we are on every song change, so a crash can offer to resume here.
  // A clean exit (handleExit) clears this — a leftover state on next launch means we didn't.
  // Skipped for an ephemeral single-song preview (no setlistId) — there's nothing durable to
  // resume into, so we deliberately leave no trace on disk for a quick library preview.
  useEffect(() => {
    if (!currentSong || !setlistId) return
    window.api.performance.saveState({
      setlistId,
      songIndex: currentIndex,
      updatedAt: new Date().toISOString()
    })
  }, [setlistId, currentIndex, currentSong])

  // Load audio + lyrics whenever the current song changes. Preload immediately so
  // Space starts sound instantly rather than waiting on decoder init.
  useEffect(() => {
    setIsPlaying(false)
    setProgress(0)
    setLyricsText(null)
    setLrcLines(null)
    setCdgData(null)
    setLyricsError(null)
    setAudioError(null)
    if (lyricsRef.current) lyricsRef.current.scrollTop = 0

    if (!currentSong) return
    let cancelled = false

    if (audioRef.current) {
      audioRef.current.src = toMediaUrl(currentSong.audioFile)
      audioRef.current.volume = currentSong.volume
      audioRef.current.load()
    }

    if (currentSong.lyricsFile && currentSong.lyricsFormat === 'cdg') {
      window.api.library
        .readBinary(currentSong.lyricsFile)
        .then((bytes) => {
          if (!cancelled) {
            // .buffer is typed as ArrayBufferLike (could theoretically be a SharedArrayBuffer),
            // but IPC-delivered bytes never actually are one — this slice is always a plain ArrayBuffer.
            const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
            setCdgData(buf as ArrayBuffer)
          }
        })
        .catch(() => {
          if (!cancelled) setLyricsError('CD+G file is missing or unreadable.')
        })
    } else if (currentSong.lyricsFile && currentSong.lyricsFormat === 'lrc') {
      window.api.library
        .readText(currentSong.lyricsFile)
        .then((text) => {
          if (!cancelled) setLrcLines(parseLrc(text))
        })
        .catch(() => {
          if (!cancelled) setLyricsError('Lyrics file is missing or unreadable.')
        })
    } else if (currentSong.lyricsFile) {
      window.api.library
        .readText(currentSong.lyricsFile)
        .then((text) => {
          if (!cancelled) setLyricsText(text)
        })
        .catch(() => {
          if (!cancelled) setLyricsError('Lyrics file is missing or unreadable.')
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
    if (audio.paused) audio.play().catch((err) => setAudioError(err.message))
    else audio.pause()
  }

  function handleStop(): void {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    // Emergency stop is intentionally instant, not faded — restore full volume here in case
    // it was cut mid-fade-out, so a replay of the same song doesn't start quiet.
    if (currentSong) audio.volume = currentSong.volume
    setIsPlaying(false)
    setProgress(0)
  }

  function handleExit(): void {
    audioRef.current?.pause()
    window.api.performance.clearState()
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
        <p>{setlistId ? 'This setlist has no songs.' : 'No song to play.'}</p>
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

      {audioError && (
        <div className="performance-armed-banner performance-error-banner">
          Audio file is missing or unreadable — {currentSong.title} can't be played.
        </div>
      )}

      <div className="performance-lyrics" ref={lyricsRef}>
        {lyricsError ? (
          <p className="performance-no-lyrics performance-error-text">{lyricsError}</p>
        ) : cdgData ? (
          <CdgLyricsView data={cdgData} audioRef={audioRef} />
        ) : lrcLines ? (
          <LrcLyricsView lines={lrcLines} audioRef={audioRef} />
        ) : lyricsText ? (
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
          disabled={audioError !== null}
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
        onEnded={(e) => {
          setIsPlaying(false)
          // The fade-out below hits 0 right at the end — undo it so a replay of the
          // same song (no src reload, which is what normally restores volume) isn't silent.
          if (currentSong) e.currentTarget.volume = currentSong.volume
        }}
        onError={() => setAudioError('Audio file is missing or unreadable.')}
        onTimeUpdate={(e) => {
          const audio = e.currentTarget
          if (audio.duration <= 0) return
          setProgress(audio.currentTime / audio.duration)

          const remaining = audio.duration - audio.currentTime
          if (currentSong && remaining <= FADE_OUT_SECONDS) {
            audio.volume = currentSong.volume * Math.max(0, remaining / FADE_OUT_SECONDS)
          }
        }}
      />
    </div>
  )
}
