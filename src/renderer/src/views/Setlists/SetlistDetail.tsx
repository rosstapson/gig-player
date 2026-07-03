import type { Setlist } from '@shared/types'
import { useState } from 'react'
import { useLibraryStore } from '../../state/libraryStore'
import { useSetlistStore } from '../../state/setlistStore'

interface SetlistDetailProps {
  setlist: Setlist
  onStartPerformance: (setlistId: string, startIndex?: number) => void
}

export function SetlistDetail({
  setlist,
  onStartPerformance
}: SetlistDetailProps): React.JSX.Element {
  const { songs } = useLibraryStore()
  const { rename, setSongIds } = useSetlistStore()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(setlist.name)
  const [addSongId, setAddSongId] = useState('')

  const songsById = new Map(songs.map((s) => [s.id, s]))
  const setlistSongs = setlist.songIds.map((id) => songsById.get(id)).filter((s) => s !== undefined)
  const availableSongs = songs.filter((s) => !setlist.songIds.includes(s.id))

  async function commitRename(): Promise<void> {
    setEditingName(false)
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== setlist.name) await rename(setlist.id, trimmed)
    else setNameDraft(setlist.name)
  }

  function move(index: number, direction: -1 | 1): void {
    const next = [...setlist.songIds]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSongIds(setlist.id, next)
  }

  function removeSong(songId: string): void {
    setSongIds(
      setlist.id,
      setlist.songIds.filter((id) => id !== songId)
    )
  }

  function addSong(): void {
    if (!addSongId) return
    setSongIds(setlist.id, [...setlist.songIds, addSongId])
    setAddSongId('')
  }

  return (
    <div className="setlist-detail">
      <div className="setlist-detail-header">
        {editingName ? (
          <input
            className="setlist-name-input"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setNameDraft(setlist.name)
                setEditingName(false)
              }
            }}
          />
        ) : (
          <h2 onClick={() => setEditingName(true)} title="Click to rename">
            {setlist.name}
          </h2>
        )}
        <button
          className="btn-primary"
          disabled={setlistSongs.length === 0}
          onClick={() => onStartPerformance(setlist.id)}
        >
          Start performance
        </button>
      </div>

      {setlistSongs.length === 0 && (
        <p className="muted setlist-empty">No songs in this setlist yet — add one below.</p>
      )}

      {setlistSongs.length > 0 && (
        <ol className="setlist-songs">
          {setlistSongs.map((song, index) => (
            <li
              key={song.id}
              className="setlist-song-row"
              onDoubleClick={() => onStartPerformance(setlist.id, index)}
              title="Double-click to perform from here"
            >
              <span className="setlist-song-position mono">{index + 1}</span>
              <div className="setlist-song-info">
                <span className="song-title">{song.title}</span>
                <span className="muted"> — {song.artist}</span>
              </div>
              <span className="mono setlist-song-key">{song.key}</span>
              <div className="setlist-song-actions" onDoubleClick={(e) => e.stopPropagation()}>
                <button
                  className="btn-link"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move up"
                >
                  ▲
                </button>
                <button
                  className="btn-link"
                  disabled={index === setlistSongs.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move down"
                >
                  ▼
                </button>
                <button className="btn-link btn-danger" onClick={() => removeSong(song.id)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {availableSongs.length > 0 && (
        <div className="setlist-add-row">
          <select value={addSongId} onChange={(e) => setAddSongId(e.target.value)}>
            <option value="">Add a song…</option>
            {availableSongs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title} — {song.artist}
              </option>
            ))}
          </select>
          <button className="btn-secondary" disabled={!addSongId} onClick={addSong}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}
