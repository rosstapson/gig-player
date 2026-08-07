import type { BindableAction, InputBinding, Settings } from '@shared/types'
import { useEffect, useState } from 'react'
import { classifyMidiActivation, useMidiMessage } from '../lib/midi'

interface InputBindingsModalProps {
  inputBindings: Settings['inputBindings']
  onChange: (next: Settings['inputBindings']) => void
  onClose: () => void
}

const ACTIONS: { id: BindableAction; label: string }[] = [
  { id: 'togglePlay', label: 'Play / Pause' },
  { id: 'next', label: 'Next song' },
  { id: 'prev', label: 'Previous song' },
  { id: 'stop', label: 'Emergency stop' }
]

function describeBinding(binding: InputBinding | undefined): string {
  if (!binding) return 'Not set'
  if (binding.type === 'key') return binding.key === ' ' ? 'Space' : binding.key
  const type = binding.statusType & 0xf0
  if (type === 0xc0) return `MIDI Program ${binding.data1}`
  if (type === 0x90) return `MIDI Note ${binding.data1}`
  if (type === 0xb0) return `MIDI CC ${binding.data1}`
  return 'MIDI'
}

/**
 * Bindings here are additive on top of Performance Mode's hardcoded Space/←/→/Esc shortcuts —
 * this only lets a footswitch or MIDI pedal trigger the same actions through an extra path,
 * never replaces the keyboard defaults.
 */
export function InputBindingsModal({
  inputBindings,
  onChange,
  onClose
}: InputBindingsModalProps): React.JSX.Element {
  const [capturing, setCapturing] = useState<BindableAction | null>(null)

  function commitBinding(action: BindableAction, binding: InputBinding): void {
    onChange({ ...inputBindings, [action]: binding })
    setCapturing(null)
  }

  function clearBinding(action: BindableAction): void {
    const next = { ...inputBindings }
    delete next[action]
    onChange(next)
  }

  useEffect(() => {
    const action = capturing
    if (!action) return
    function handleKeyDown(e: KeyboardEvent): void {
      e.preventDefault()
      if (e.key === 'Escape') {
        setCapturing(null)
        return
      }
      // TS can't carry the `if (!action) return` narrowing above across this closure boundary,
      // but `action` is a const captured before the listener is ever registered, so it's safe.
      commitBinding(action!, { type: 'key', key: e.key })
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturing])

  useMidiMessage((statusType, data1, data2) => {
    if (!capturing) return
    const binding = classifyMidiActivation(statusType, data1, data2)
    if (binding) commitBinding(capturing, binding)
  })

  return (
    <div className="modal-backdrop">
      <div className="modal input-bindings-modal">
        <h2>Footswitch / MIDI bindings</h2>
        <p className="muted">
          Bindings are additive — the built-in Space/←/→/Esc shortcuts always keep working. MIDI
          pedals should be set to momentary (not toggle) mode for reliable detection.
        </p>
        <table className="bindings-table">
          <tbody>
            {ACTIONS.map((action) => (
              <tr key={action.id}>
                <td>{action.label}</td>
                <td className="mono">
                  {capturing === action.id
                    ? 'Listening… (press a key or pedal, Esc to cancel)'
                    : describeBinding(inputBindings[action.id])}
                </td>
                <td className="bindings-row-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setCapturing(action.id)}
                    disabled={capturing !== null}
                  >
                    Set
                  </button>
                  <button
                    className="btn-link"
                    onClick={() => clearBinding(action.id)}
                    disabled={!inputBindings[action.id]}
                  >
                    Clear
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
