import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC } from '@shared/channels'
import type { ImportSongInput, SongPatch } from '@shared/ipc-contract'
import type { PerformanceState } from '@shared/types'

const api = {
  library: {
    list: () => ipcRenderer.invoke(IPC.library.list),
    pickAudioFile: () => ipcRenderer.invoke(IPC.library.pickAudioFile),
    pickLyricsFile: () => ipcRenderer.invoke(IPC.library.pickLyricsFile),
    importSong: (input: ImportSongInput) => ipcRenderer.invoke(IPC.library.importSong, input),
    updateSong: (id: string, patch: SongPatch) =>
      ipcRenderer.invoke(IPC.library.updateSong, id, patch),
    deleteSong: (id: string) => ipcRenderer.invoke(IPC.library.deleteSong, id),
    resolvePath: (relativePath: string) =>
      ipcRenderer.invoke(IPC.library.resolvePath, relativePath),
    readText: (relativePath: string) => ipcRenderer.invoke(IPC.library.readText, relativePath)
  },
  setlists: {
    list: () => ipcRenderer.invoke(IPC.setlists.list),
    create: (name: string) => ipcRenderer.invoke(IPC.setlists.create, name),
    rename: (id: string, name: string) => ipcRenderer.invoke(IPC.setlists.rename, id, name),
    delete: (id: string) => ipcRenderer.invoke(IPC.setlists.delete, id),
    setSongIds: (id: string, songIds: string[]) =>
      ipcRenderer.invoke(IPC.setlists.setSongIds, id, songIds)
  },
  performance: {
    start: () => ipcRenderer.invoke(IPC.performance.start),
    stop: () => ipcRenderer.invoke(IPC.performance.stop),
    saveState: (state: PerformanceState) => ipcRenderer.invoke(IPC.performance.saveState, state),
    loadState: () => ipcRenderer.invoke(IPC.performance.loadState),
    clearState: () => ipcRenderer.invoke(IPC.performance.clearState)
  },
  diagnostics: {
    getStartupWarnings: () => ipcRenderer.invoke(IPC.diagnostics.getStartupWarnings)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
