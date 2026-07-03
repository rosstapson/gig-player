import { dialog, ipcMain } from 'electron'
import { IPC } from '@shared/channels'
import type { ImportSongInput, SongPatch } from '@shared/ipc-contract'
import * as library from '../lib/library'

export function registerLibraryIpc(): void {
  ipcMain.handle(IPC.library.list, () => library.listSongs())

  ipcMain.handle(IPC.library.pickAudioFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose an audio file',
      properties: ['openFile'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.library.pickLyricsFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose a lyrics file',
      properties: ['openFile'],
      filters: [{ name: 'Lyrics', extensions: ['txt', 'md', 'lrc'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC.library.importSong, (_event, input: ImportSongInput) =>
    library.importSong(input)
  )

  ipcMain.handle(IPC.library.updateSong, (_event, id: string, patch: SongPatch) =>
    library.updateSong(id, patch)
  )

  ipcMain.handle(IPC.library.deleteSong, (_event, id: string) => library.deleteSong(id))

  ipcMain.handle(IPC.library.resolvePath, (_event, relativePath: string) =>
    library.resolveSongPath(relativePath)
  )

  ipcMain.handle(IPC.library.readText, (_event, relativePath: string) =>
    library.readSongText(relativePath)
  )
}
