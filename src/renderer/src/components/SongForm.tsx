import type { LyricsFormat, Song } from '@shared/types'
import { useState } from 'react'

export interface SongFormValues {
  title: string
  artist: string
  key: string
  tempo: number | null
  notes: string
  lyricsFormat: LyricsFormat
  volume: number
  sourceAudioPath: string | null
  sourceLyricsPath: string | null
}

interface SongFormProps {
  mode: 'add' | 'edit'
  initial?: Song
  onCancel: () => void
  onSubmit: (values: SongFormValues) => Promise<void>
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() ?? p
}

export function SongForm({ mode, initial, onCancel, onSubmit }: SongFormProps): React.JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [artist, setArtist] = useState(initial?.artist ?? '')
  const [key, setKey] = useState(initial?.key ?? '')
  const [tempo, setTempo] = useState(initial?.tempo != null ? String(initial.tempo) : '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [lyricsFormat, setLyricsFormat] = useState<LyricsFormat>(initial?.lyricsFormat ?? 'text')
  const [volume, setVolume] = useState(initial?.volume ?? 1)
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [lyricsPath, setLyricsPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const needsAudio = mode === 'add'
  const canSubmit = title.trim().length > 0 && (!needsAudio || audioPath !== null) && !submitting

  async function handlePickAudio(): Promise<void> {
    const path = await window.api.library.pickAudioFile()
    if (path) setAudioPath(path)
  }

  async function handlePickLyrics(): Promise<void> {
    const path = await window.api.library.pickLyricsFile()
    if (!path) return
    setLyricsPath(path)
    const ext = path.split('.').pop()?.toLowerCase()
    if (ext === 'cdg') setLyricsFormat('cdg')
    else if (ext === 'lrc') setLyricsFormat('lrc')
    else if (ext === 'md') setLyricsFormat('markdown')
    else if (ext === 'txt') setLyricsFormat('text')
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        title: title.trim(),
        artist: artist.trim(),
        key: key.trim(),
        tempo: tempo.trim() === '' ? null : Number(tempo),
        notes,
        lyricsFormat,
        volume,
        sourceAudioPath: audioPath,
        sourceLyricsPath: lyricsPath
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <form className="modal song-form" onSubmit={handleSubmit}>
        <h2>{mode === 'add' ? 'Add song' : 'Edit song'}</h2>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Artist</span>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} />
          </label>
          <label className="field field-narrow">
            <span>Key</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. Bb" />
          </label>
          <label className="field field-narrow">
            <span>Tempo</span>
            <input
              value={tempo}
              onChange={(e) => setTempo(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="bpm"
              inputMode="numeric"
            />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {mode === 'add' && (
          <div className="field-row">
            <div className="field">
              <span>Audio file</span>
              <button type="button" className="btn-secondary" onClick={handlePickAudio}>
                {audioPath ? basename(audioPath) : 'Choose file…'}
              </button>
            </div>
            <div className="field">
              <span>Lyrics file (optional)</span>
              <button type="button" className="btn-secondary" onClick={handlePickLyrics}>
                {lyricsPath ? basename(lyricsPath) : 'Choose file…'}
              </button>
            </div>
          </div>
        )}

        <label className="field field-narrow">
          <span>Lyrics format</span>
          <select
            value={lyricsFormat}
            onChange={(e) => setLyricsFormat(e.target.value as LyricsFormat)}
          >
            <option value="text">Plain text</option>
            <option value="markdown">Markdown</option>
            <option value="lrc">Timed (.lrc)</option>
            <option value="cdg">CD+G (.cdg)</option>
          </select>
        </label>

        <label className="field">
          <span>Volume — {Math.round(volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {mode === 'add' ? 'Add song' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
