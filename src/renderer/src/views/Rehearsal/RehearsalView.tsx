import type { Song } from '@shared/types'
import { useEffect, useRef, useState } from 'react'
import {
  MAX_SEMITONES,
  MAX_TEMPO_PERCENT,
  MIN_SEMITONES,
  MIN_TEMPO_PERCENT,
  useRehearsalAudio
} from './useRehearsalAudio'

interface RehearsalViewProps {
  song: Song
  onExit: () => void
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function RehearsalView({ song, onExit }: RehearsalViewProps): React.JSX.Element {
  const audio = useRehearsalAudio(song)
  const [displayPosition, setDisplayPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const lastDisplayedRef = useRef(0)

  // Local rAF loop mirroring CdgLyricsView's pattern — polls the engine's position each frame,
  // throttled to a coarser React state update so the seek bar doesn't re-render at 60Hz.
  useEffect(() => {
    let rafId: number
    function tick(): void {
      if (!isDragging) {
        const pos = audio.getPosition()
        if (Math.abs(pos - lastDisplayedRef.current) >= 0.05) {
          lastDisplayedRef.current = pos
          setDisplayPosition(pos)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
    // getPosition is a stable function (useCallback with no deps) — depending on it rather than
    // the whole `audio` object (a fresh literal every render) avoids tearing down and restarting
    // this rAF loop on every throttled position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.getPosition, isDragging])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          audio.togglePlay()
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
        case '[':
          e.preventDefault()
          audio.setLoopStart()
          break
        case ']':
          e.preventDefault()
          audio.setLoopEnd()
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // Same reasoning as the rAF effect above — depend on the specific stable callbacks, not the
    // whole `audio` object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.togglePlay, audio.setLoopStart, audio.setLoopEnd, onExit])

  const hasLoopRegion =
    audio.loopStart !== null && audio.loopEnd !== null && audio.loopEnd > audio.loopStart
  const progressPct = audio.duration > 0 ? (displayPosition / audio.duration) * 100 : 0

  return (
    <div className="rehearsal-view">
      <div className="rehearsal-header">
        <button className="btn-link" onClick={onExit}>
          ← Back
        </button>
        <div className="rehearsal-title">
          {song.title}
          <span className="rehearsal-artist"> — {song.artist}</span>
        </div>
        <div className="rehearsal-meta mono">
          {song.key}
          {song.tempo ? ` · ${song.tempo} BPM` : ''}
        </div>
      </div>

      {audio.error && (
        <div className="performance-armed-banner performance-error-banner">{audio.error}</div>
      )}

      {audio.isLoading && !audio.error && <p className="muted rehearsal-loading">Loading…</p>}

      {!audio.isLoading && !audio.error && (
        <>
          <div className="rehearsal-seek">
            <div className="rehearsal-seek-track">
              <div className="rehearsal-seek-progress" style={{ width: `${progressPct}%` }} />
              {hasLoopRegion && (
                <div
                  className="rehearsal-seek-loop"
                  style={{
                    left: `${(audio.loopStart! / audio.duration) * 100}%`,
                    width: `${((audio.loopEnd! - audio.loopStart!) / audio.duration) * 100}%`
                  }}
                />
              )}
            </div>
            <input
              type="range"
              min={0}
              max={audio.duration}
              step={0.01}
              value={displayPosition}
              onPointerDown={() => setIsDragging(true)}
              onChange={(e) => setDisplayPosition(Number(e.target.value))}
              onPointerUp={(e) => {
                audio.seek(Number((e.target as HTMLInputElement).value))
                setIsDragging(false)
              }}
              aria-label="Seek"
            />
          </div>

          <div className="rehearsal-time mono">
            {formatTime(displayPosition)} / {formatTime(audio.duration)}
          </div>

          <div className="rehearsal-transport">
            <button
              className="performance-play"
              onClick={audio.togglePlay}
              aria-label={audio.isPlaying ? 'Pause' : 'Play'}
            >
              {audio.isPlaying ? '❚❚' : '▶'}
            </button>
          </div>

          <div className="rehearsal-loop-controls">
            <button className="btn-secondary" onClick={audio.setLoopStart}>
              Set Loop Start <span className="mono">[</span>
            </button>
            <button className="btn-secondary" onClick={audio.setLoopEnd}>
              Set Loop End <span className="mono">]</span>
            </button>
            <label className="rehearsal-loop-toggle">
              <input
                type="checkbox"
                checked={audio.loopEnabled}
                disabled={!hasLoopRegion}
                onChange={(e) => audio.setLoopEnabled(e.target.checked)}
              />
              Loop
            </label>
            <button
              className="btn-link"
              onClick={audio.clearLoop}
              disabled={audio.loopStart === null && audio.loopEnd === null}
            >
              Clear
            </button>
          </div>

          <div className="rehearsal-sliders">
            <div className="rehearsal-slider-row">
              <label className="field">
                <span>Tempo — {audio.tempoPercent}%</span>
                <input
                  type="range"
                  min={MIN_TEMPO_PERCENT}
                  max={MAX_TEMPO_PERCENT}
                  step={1}
                  value={audio.tempoPercent}
                  onChange={(e) => audio.setTempoPercent(Number(e.target.value))}
                />
              </label>
              <button
                className="btn-link"
                onClick={() => audio.setTempoPercent(100)}
                disabled={audio.tempoPercent === 100}
              >
                Reset
              </button>
            </div>

            <div className="rehearsal-slider-row">
              <label className="field">
                <span>
                  Key —{' '}
                  {audio.semitones === 0
                    ? 'Original'
                    : audio.semitones > 0
                      ? `+${audio.semitones}`
                      : audio.semitones}
                </span>
                <input
                  type="range"
                  min={MIN_SEMITONES}
                  max={MAX_SEMITONES}
                  step={1}
                  value={audio.semitones}
                  onChange={(e) => audio.setSemitones(Number(e.target.value))}
                />
              </label>
              <button
                className="btn-link"
                onClick={() => audio.setSemitones(0)}
                disabled={audio.semitones === 0}
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
