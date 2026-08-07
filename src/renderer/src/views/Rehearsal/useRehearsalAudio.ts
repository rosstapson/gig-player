import { SoundTouchNode } from '@soundtouchjs/audio-worklet'
import processorUrl from '@soundtouchjs/audio-worklet/processor?url'
import type { Song } from '@shared/types'
import { useCallback, useEffect, useRef, useState } from 'react'

export const MIN_TEMPO_PERCENT = 50
export const MAX_TEMPO_PERCENT = 150
export const MIN_SEMITONES = -12
export const MAX_SEMITONES = 12

interface RehearsalAudioState {
  isLoading: boolean
  error: string | null
  duration: number
  isPlaying: boolean
  loopStart: number | null
  loopEnd: number | null
  loopEnabled: boolean
  tempoPercent: number
  semitones: number
}

export interface RehearsalAudio extends RehearsalAudioState {
  /** Current playback position in seconds. Not React state — call it every frame, it's cheap. */
  getPosition(): number
  play(): void
  pause(): void
  togglePlay(): void
  seek(time: number): void
  setTempoPercent(pct: number): void
  setSemitones(n: number): void
  setLoopStart(): void
  setLoopEnd(): void
  setLoopEnabled(enabled: boolean): void
  clearLoop(): void
}

const INITIAL_STATE: RehearsalAudioState = {
  isLoading: true,
  error: null,
  duration: 0,
  isPlaying: false,
  loopStart: null,
  loopEnd: null,
  loopEnabled: false,
  tempoPercent: 100,
  semitones: 0
}

/**
 * Drives independent tempo/pitch playback for Rehearsal Mode via the Web Audio API and the
 * SoundTouch AudioWorklet — a plain <audio> element's playbackRate always ties tempo and pitch
 * together, which is exactly what this view needs to break apart.
 *
 * There's no native `currentTime` once playback is driven by AudioBufferSourceNode.start(when,
 * offset), so position is tracked manually via an anchor (context time + offset at that point)
 * and derived on demand in getPosition(). Looping uses the source node's native loop/loopStart/
 * loopEnd (sample-accurate) rather than a JS-driven re-trigger, which is why getPosition() has to
 * fold elapsed time back into the loop window once it wraps — otherwise the reported position
 * keeps climbing past loopEnd/duration forever after the first wrap.
 */
export function useRehearsalAudio(song: Song): RehearsalAudio {
  const [state, setState] = useState<RehearsalAudioState>(INITIAL_STATE)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const stNodeRef = useRef<SoundTouchNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  const isPlayingRef = useRef(false)
  const anchorContextTimeRef = useRef(0)
  const anchorOffsetRef = useRef(0)
  const tempoRateRef = useRef(1)
  const loopRef = useRef<{ start: number | null; end: number | null; enabled: boolean }>({
    start: null,
    end: null,
    enabled: false
  })

  const getPosition = useCallback((): number => {
    const audioCtx = audioCtxRef.current
    if (!audioCtx || !isPlayingRef.current) return anchorOffsetRef.current
    const raw =
      anchorOffsetRef.current +
      (audioCtx.currentTime - anchorContextTimeRef.current) * tempoRateRef.current
    const { enabled, start, end } = loopRef.current
    if (enabled && start !== null && end !== null && raw >= end) {
      const len = end - start
      return len > 0 ? start + ((raw - start) % len) : start
    }
    return raw
  }, [])

  function applyLoopToActiveSource(): void {
    const source = sourceRef.current
    if (!source) return
    const { enabled, start, end } = loopRef.current
    if (enabled && start !== null && end !== null && end > start) {
      source.loop = true
      source.loopStart = start
      source.loopEnd = end
    } else {
      source.loop = false
    }
  }

  // Load the song into an AudioBuffer and stand up the AudioContext -> SoundTouchNode ->
  // GainNode -> destination graph. Runs once per song; fully torn down on cleanup so switching
  // songs (or React 19 dev-mode's double-invoke) never accumulates AudioContexts.
  useEffect(() => {
    let cancelled = false
    setState({ ...INITIAL_STATE })
    isPlayingRef.current = false
    anchorOffsetRef.current = 0
    anchorContextTimeRef.current = 0
    tempoRateRef.current = 1
    loopRef.current = { start: null, end: null, enabled: false }
    sourceRef.current = null

    const audioCtx = new AudioContext()
    audioCtxRef.current = audioCtx

    audioCtx.onstatechange = () => {
      if (audioCtx.state === 'suspended' && isPlayingRef.current) {
        anchorOffsetRef.current = getPosition()
        isPlayingRef.current = false
        setState((s) => ({ ...s, isPlaying: false }))
      }
    }

    const gainNode = audioCtx.createGain()
    gainNode.gain.value = song.volume
    gainNode.connect(audioCtx.destination)
    gainNodeRef.current = gainNode

    async function load(): Promise<void> {
      try {
        await SoundTouchNode.register(audioCtx, processorUrl)
        if (cancelled) return
        const stNode = new SoundTouchNode({ context: audioCtx })
        stNode.connect(gainNode)
        stNodeRef.current = stNode

        const bytes = await window.api.library.readBinary(song.audioFile)
        if (cancelled) return
        // .buffer is typed as ArrayBufferLike but IPC-delivered bytes are always a plain
        // ArrayBuffer — same reasoning as the CDG binary read in PerformanceView.
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        if (cancelled) return
        bufferRef.current = audioBuffer
        setState((s) => ({ ...s, isLoading: false, duration: audioBuffer.duration }))
      } catch {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: 'Audio file is missing or unreadable.'
          }))
        }
      }
    }
    load()

    return () => {
      cancelled = true
      const source = sourceRef.current
      if (source) {
        source.onended = null
        try {
          source.stop()
        } catch {
          // already stopped
        }
      }
      stNodeRef.current?.disconnect()
      gainNodeRef.current?.disconnect()
      audioCtx.onstatechange = null
      if (audioCtx.state !== 'closed') audioCtx.close()
      audioCtxRef.current = null
      stNodeRef.current = null
      gainNodeRef.current = null
      bufferRef.current = null
      sourceRef.current = null
    }
  }, [song, getPosition])

  const play = useCallback(() => {
    const audioCtx = audioCtxRef.current
    const buffer = bufferRef.current
    const stNode = stNodeRef.current
    if (!audioCtx || !buffer || !stNode) return
    audioCtx.resume()

    const prev = sourceRef.current
    if (prev) {
      prev.onended = null
      try {
        prev.stop()
      } catch {
        // already stopped
      }
    }

    const offset = getPosition()
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = tempoRateRef.current
    source.connect(stNode)
    sourceRef.current = source
    applyLoopToActiveSource()
    stNode.playbackRate.value = tempoRateRef.current

    source.onended = () => {
      isPlayingRef.current = false
      anchorOffsetRef.current = buffer.duration
      setState((s) => ({ ...s, isPlaying: false }))
    }

    source.start(0, offset)
    anchorOffsetRef.current = offset
    anchorContextTimeRef.current = audioCtx.currentTime
    isPlayingRef.current = true
    setState((s) => ({ ...s, isPlaying: true }))
  }, [getPosition])

  const pause = useCallback(() => {
    const source = sourceRef.current
    if (source) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    anchorOffsetRef.current = getPosition()
    sourceRef.current = null
    isPlayingRef.current = false
    setState((s) => ({ ...s, isPlaying: false }))
  }, [getPosition])

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) pause()
    else play()
  }, [play, pause])

  const seek = useCallback(
    (time: number) => {
      const buffer = bufferRef.current
      if (!buffer) return
      const clamped = Math.max(0, Math.min(time, buffer.duration))
      const wasPlaying = isPlayingRef.current
      if (wasPlaying) {
        const source = sourceRef.current
        if (source) {
          source.onended = null
          try {
            source.stop()
          } catch {
            // already stopped
          }
          sourceRef.current = null
        }
        isPlayingRef.current = false
      }
      anchorOffsetRef.current = clamped
      if (wasPlaying) play()
    },
    [play]
  )

  const setTempoPercent = useCallback(
    (pct: number) => {
      const clamped = Math.max(MIN_TEMPO_PERCENT, Math.min(Math.round(pct), MAX_TEMPO_PERCENT))
      const rate = clamped / 100
      const audioCtx = audioCtxRef.current
      if (audioCtx) {
        // Re-anchor before changing the rate — otherwise elapsed time under the old rate gets
        // measured at the new rate the moment it's applied, and the reported position jumps.
        anchorOffsetRef.current = getPosition()
        anchorContextTimeRef.current = audioCtx.currentTime
      }
      tempoRateRef.current = rate
      if (sourceRef.current) sourceRef.current.playbackRate.value = rate
      if (stNodeRef.current) stNodeRef.current.playbackRate.value = rate
      setState((s) => ({ ...s, tempoPercent: clamped }))
    },
    [getPosition]
  )

  const setSemitones = useCallback((n: number) => {
    const clamped = Math.max(MIN_SEMITONES, Math.min(Math.round(n), MAX_SEMITONES))
    if (stNodeRef.current) stNodeRef.current.pitchSemitones.value = clamped
    setState((s) => ({ ...s, semitones: clamped }))
  }, [])

  const setLoopStart = useCallback(() => {
    const pos = getPosition()
    loopRef.current = { ...loopRef.current, start: pos }
    applyLoopToActiveSource()
    setState((s) => ({ ...s, loopStart: pos }))
  }, [getPosition])

  const setLoopEnd = useCallback(() => {
    const pos = getPosition()
    loopRef.current = { ...loopRef.current, end: pos }
    applyLoopToActiveSource()
    setState((s) => ({ ...s, loopEnd: pos }))
  }, [getPosition])

  const setLoopEnabled = useCallback(
    (enabled: boolean) => {
      const { start, end } = loopRef.current
      const valid = start !== null && end !== null && end > start
      const nextEnabled = enabled && valid
      loopRef.current = { ...loopRef.current, enabled: nextEnabled }
      if (nextEnabled && start !== null && end !== null) {
        const pos = getPosition()
        if (pos < start || pos >= end) seek(start)
      }
      applyLoopToActiveSource()
      setState((s) => ({ ...s, loopEnabled: nextEnabled }))
    },
    [getPosition, seek]
  )

  const clearLoop = useCallback(() => {
    loopRef.current = { start: null, end: null, enabled: false }
    applyLoopToActiveSource()
    setState((s) => ({ ...s, loopStart: null, loopEnd: null, loopEnabled: false }))
  }, [])

  return {
    ...state,
    getPosition,
    play,
    pause,
    togglePlay,
    seek,
    setTempoPercent,
    setSemitones,
    setLoopStart,
    setLoopEnd,
    setLoopEnabled,
    clearLoop
  }
}
