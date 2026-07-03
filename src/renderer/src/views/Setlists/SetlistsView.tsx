import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useLibraryStore } from '../../state/libraryStore'
import { useSetlistStore } from '../../state/setlistStore'
import { SetlistDetail } from './SetlistDetail'

interface SetlistsViewProps {
  onStartPerformance: (setlistId: string) => void
}

export function SetlistsView({ onStartPerformance }: SetlistsViewProps): React.JSX.Element {
  const { setlists, loaded, load, create, remove } = useSetlistStore()
  const { loaded: libraryLoaded, load: loadLibrary } = useLibraryStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
    if (!libraryLoaded) loadLibrary()
  }, [loaded, load, libraryLoaded, loadLibrary])

  useEffect(() => {
    if (selectedId === null && setlists.length > 0) setSelectedId(setlists[0].id)
  }, [setlists, selectedId])

  async function commitCreate(): Promise<void> {
    const trimmed = newName.trim()
    setCreating(false)
    setNewName('')
    if (!trimmed) return
    const setlist = await create(trimmed)
    setSelectedId(setlist.id)
  }

  const pendingDelete = setlists.find((s) => s.id === pendingDeleteId) ?? null

  async function confirmDelete(): Promise<void> {
    if (!pendingDeleteId) return
    await remove(pendingDeleteId)
    if (selectedId === pendingDeleteId) setSelectedId(null)
    setPendingDeleteId(null)
  }

  const selected = setlists.find((s) => s.id === selectedId) ?? null

  return (
    <div className="setlists-view">
      <aside className="setlist-sidebar">
        <div className="setlist-sidebar-header">
          <h2>Setlists</h2>
          {creating ? (
            <input
              className="setlist-new-input"
              autoFocus
              placeholder="Setlist name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
            />
          ) : (
            <button className="btn-primary" onClick={() => setCreating(true)}>
              New
            </button>
          )}
        </div>
        {loaded && setlists.length === 0 && (
          <p className="muted setlist-empty">No setlists yet.</p>
        )}
        <ul className="setlist-list">
          {setlists.map((setlist) => (
            <li key={setlist.id}>
              <button
                className={`setlist-list-item ${setlist.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(setlist.id)}
              >
                <span className="setlist-name">{setlist.name}</span>
                <span className="setlist-count mono">{setlist.songIds.length}</span>
              </button>
              <button
                className="btn-link btn-danger setlist-delete"
                onClick={() => setPendingDeleteId(setlist.id)}
                aria-label={`Delete ${setlist.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="setlist-main">
        {selected ? (
          <SetlistDetail setlist={selected} onStartPerformance={onStartPerformance} />
        ) : (
          <p className="muted">Select or create a setlist to start building it.</p>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete setlist?"
          message={`"${pendingDelete.name}" will be deleted. This does not delete any songs from your library.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
