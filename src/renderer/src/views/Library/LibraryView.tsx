import type { Song } from '@shared/types'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { SongForm, type SongFormValues } from '../../components/SongForm'
import { useLibraryStore } from '../../state/libraryStore'

interface LibraryViewProps {
  onPlaySong: (song: Song) => void
}

export function LibraryView({ onPlaySong }: LibraryViewProps): React.JSX.Element {
  const { songs, loaded, load, importSong, updateSong, deleteSong } = useLibraryStore()
  const [query, setQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Song | null>(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return songs
    return songs.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    )
  }, [songs, query])

  async function handleAddSubmit(values: SongFormValues): Promise<void> {
    if (!values.sourceAudioPath) return
    await importSong({
      title: values.title,
      artist: values.artist,
      key: values.key,
      tempo: values.tempo,
      notes: values.notes,
      lyricsFormat: values.lyricsFormat,
      volume: 1,
      sourceAudioPath: values.sourceAudioPath,
      sourceLyricsPath: values.sourceLyricsPath
    })
    setShowAddForm(false)
  }

  async function handleEditSubmit(values: SongFormValues): Promise<void> {
    if (!editingSong) return
    await updateSong(editingSong.id, {
      title: values.title,
      artist: values.artist,
      key: values.key,
      tempo: values.tempo,
      notes: values.notes,
      lyricsFormat: values.lyricsFormat
    })
    setEditingSong(null)
  }

  async function confirmDelete(): Promise<void> {
    if (!pendingDelete) return
    await deleteSong(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="library-view">
      <div className="library-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search songs or artists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          Add song
        </button>
      </div>

      {loaded && songs.length === 0 && (
        <div className="empty-state">
          <p>No songs yet.</p>
          <p className="muted">Add your first backing track to get started.</p>
        </div>
      )}

      {loaded && songs.length > 0 && (
        <div className="song-table-wrap">
          <table className="song-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Artist</th>
                <th>Key</th>
                <th>Tempo</th>
                <th>Notes</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((song) => (
                <tr
                  key={song.id}
                  onDoubleClick={() => onPlaySong(song)}
                  title="Double-click to play"
                >
                  <td className="song-title">{song.title}</td>
                  <td>{song.artist}</td>
                  <td className="mono">{song.key}</td>
                  <td className="mono">{song.tempo ?? '—'}</td>
                  <td className="song-notes">{song.notes}</td>
                  <td className="song-actions">
                    <button className="btn-link" onClick={() => setEditingSong(song)}>
                      Edit
                    </button>
                    <button
                      className="btn-link btn-danger"
                      onClick={() => setPendingDelete(song)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="muted no-results">No matches for "{query}".</p>}
        </div>
      )}

      {showAddForm && (
        <SongForm mode="add" onCancel={() => setShowAddForm(false)} onSubmit={handleAddSubmit} />
      )}
      {editingSong && (
        <SongForm
          mode="edit"
          initial={editingSong}
          onCancel={() => setEditingSong(null)}
          onSubmit={handleEditSubmit}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          title="Delete song?"
          message={`"${pendingDelete.title}" and its audio/lyrics files will be deleted.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
