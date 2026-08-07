import type { InputBinding } from '@shared/types'
import { useEffect } from 'react'

export type MidiInputBinding = Extract<InputBinding, { type: 'midi' }>

/**
 * If an incoming MIDI message counts as a "press", returns the binding it would create —
 * channel-masked, so it doesn't matter which channel a device is configured to transmit on.
 * Otherwise returns null. Only the "on" half of a message counts — Note Off, velocity-0 Note On
 * (a running-status convention some devices use in place of a real Note Off), and low CC values
 * are all excluded, so one physical press fires exactly once rather than twice. Used both to
 * build a new binding during capture and, via isActivation below, to match against one already
 * saved.
 */
export function classifyMidiActivation(
  statusType: number,
  data1: number,
  data2: number
): MidiInputBinding | null {
  const type = statusType & 0xf0
  if (type === 0xc0) return { type: 'midi', statusType: 0xc0, data1 } // Program Change: single-byte message, every receipt is a press
  if (type === 0x90 && data2 > 0) return { type: 'midi', statusType: 0x90, data1 } // Note On, velocity > 0
  if (type === 0xb0 && data2 >= 64) return { type: 'midi', statusType: 0xb0, data1 } // Control Change, value >= 64
  return null
}

/** True if an incoming MIDI message is a press that matches the given saved binding. */
export function isActivation(
  statusType: number,
  data1: number,
  data2: number,
  binding: MidiInputBinding
): boolean {
  const candidate = classifyMidiActivation(statusType, data1, data2)
  return (
    candidate !== null &&
    candidate.statusType === binding.statusType &&
    candidate.data1 === binding.data1
  )
}

// Requested exactly once per app session and shared by every consumer (the binding-capture modal
// and Performance Mode's live listener), rather than each independently calling
// requestMIDIAccess(). MIDIAccess stays valid for the life of the page once obtained.
let cachedAccess: Promise<MIDIAccess> | null = null

export function getMidiAccess(): Promise<MIDIAccess> {
  if (!cachedAccess) cachedAccess = navigator.requestMIDIAccess()
  return cachedAccess
}

/** Subscribes to every current and future MIDI input's messages for the life of the component. */
export function useMidiMessage(
  onMessage: (statusType: number, data1: number, data2: number) => void
): void {
  useEffect(() => {
    let disposed = false
    let access: MIDIAccess | null = null

    function attachAll(): void {
      access?.inputs.forEach((input) => {
        input.onmidimessage = (e) => {
          const data = e.data
          if (!data || data.length < 2) return
          onMessage(data[0], data[1], data[2] ?? 0)
        }
      })
    }

    getMidiAccess()
      .then((a) => {
        if (disposed) return
        access = a
        attachAll()
        // Re-attach when a device is plugged in or unplugged mid-session — a stage tool
        // specifically wants to survive a cable getting bumped mid-performance.
        a.onstatechange = attachAll
      })
      .catch(() => {
        // No MIDI support, or permission denied — the keyboard-binding path still works
        // independently, so this is a silent no-op rather than a surfaced error.
      })

    return () => {
      disposed = true
      if (access) access.onstatechange = null
    }
  }, [onMessage])
}
