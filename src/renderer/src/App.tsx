import type { PerformanceState, Song } from '@shared/types'
import { useEffect, useState } from 'react'
import { useLibraryStore } from './state/libraryStore'
import { useSetlistStore } from './state/setlistStore'
import { LibraryView } from './views/Library/LibraryView'
import { PerformanceView } from './views/Performance/PerformanceView'
import { SetlistsView } from './views/Setlists/SetlistsView'

type Tab = 'library' | 'setlists'

type ActivePerformance = ({ setlistId: string } | { songs: Song[] }) & { startIndex: number }

function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('library')
  const [performance, setPerformance] = useState<ActivePerformance | null>(null)
  const [resumeState, setResumeState] = useState<PerformanceState | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const { setlists, loaded: setlistsLoaded, load: loadSetlists } = useSetlistStore()
  const { loaded: libraryLoaded, load: loadLibrary } = useLibraryStore()

  useEffect(() => {
    if (!setlistsLoaded) loadSetlists()
    if (!libraryLoaded) loadLibrary()
    window.api.performance.loadState().then(setResumeState)
    window.api.diagnostics.getStartupWarnings().then(setWarnings)
  }, [setlistsLoaded, loadSetlists, libraryLoaded, loadLibrary])

  const resumeSetlist = resumeState ? (setlists.find((s) => s.id === resumeState.setlistId) ?? null) : null
  const resumeIsValid =
    resumeState !== null &&
    resumeSetlist !== null &&
    resumeState.songIndex >= 0 &&
    resumeState.songIndex < resumeSetlist.songIds.length

  // A leftover state that no longer points anywhere valid (setlist deleted, songs removed)
  // gets silently cleared rather than prompting about something we can't actually resume.
  useEffect(() => {
    if (!resumeState || !setlistsLoaded) return
    if (!resumeIsValid) {
      window.api.performance.clearState()
      setResumeState(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeState, setlistsLoaded, resumeIsValid])

  function handleResume(): void {
    if (!resumeState) return
    setPerformance({ setlistId: resumeState.setlistId, startIndex: resumeState.songIndex })
    setResumeState(null)
  }

  function handleDiscardResume(): void {
    window.api.performance.clearState()
    setResumeState(null)
  }

  if (performance) {
    return (
      <PerformanceView
        {...('setlistId' in performance
          ? { setlistId: performance.setlistId }
          : { songs: performance.songs })}
        startIndex={performance.startIndex}
        onExit={() => setPerformance(null)}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Gig Player</h1>
        <nav className="app-nav">
          <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}>
            Library
          </button>
          <button
            className={tab === 'setlists' ? 'active' : ''}
            onClick={() => setTab('setlists')}
          >
            Setlists
          </button>
        </nav>
      </header>

      {warnings.length > 0 && (
        <div className="startup-warnings">
          {warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </div>
      )}

      <main className="app-body">
        {tab === 'library' && (
          <LibraryView onPlaySong={(song) => setPerformance({ songs: [song], startIndex: 0 })} />
        )}
        {tab === 'setlists' && (
          <SetlistsView
            onStartPerformance={(setlistId, startIndex = 0) =>
              setPerformance({ setlistId, startIndex })
            }
          />
        )}
      </main>

      {resumeIsValid && resumeState && resumeSetlist && (
        <div className="modal-backdrop">
          <div className="modal resume-prompt">
            <h2>Resume interrupted performance?</h2>
            <p>
              Gig Player didn't exit cleanly last time — it was on song {resumeState.songIndex + 1}{' '}
              of "{resumeSetlist.name}".
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleDiscardResume}>
                Discard
              </button>
              <button className="btn-primary" onClick={handleResume}>
                Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
