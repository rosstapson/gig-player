import { useState } from 'react'
import { LibraryView } from './views/Library/LibraryView'
import { PerformanceView } from './views/Performance/PerformanceView'
import { SetlistsView } from './views/Setlists/SetlistsView'

type Tab = 'library' | 'setlists'

function App(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('library')
  const [performanceSetlistId, setPerformanceSetlistId] = useState<string | null>(null)

  if (performanceSetlistId) {
    return (
      <PerformanceView
        setlistId={performanceSetlistId}
        onExit={() => setPerformanceSetlistId(null)}
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
      <main className="app-body">
        {tab === 'library' && <LibraryView />}
        {tab === 'setlists' && <SetlistsView onStartPerformance={setPerformanceSetlistId} />}
      </main>
    </div>
  )
}

export default App
