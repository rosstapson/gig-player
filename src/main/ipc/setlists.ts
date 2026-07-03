import { ipcMain } from 'electron'
import { IPC } from '@shared/channels'
import * as setlists from '../lib/setlists'

export function registerSetlistsIpc(): void {
  ipcMain.handle(IPC.setlists.list, () => setlists.listSetlists())

  ipcMain.handle(IPC.setlists.create, (_event, name: string) => setlists.createSetlist(name))

  ipcMain.handle(IPC.setlists.rename, (_event, id: string, name: string) =>
    setlists.renameSetlist(id, name)
  )

  ipcMain.handle(IPC.setlists.delete, (_event, id: string) => setlists.deleteSetlist(id))

  ipcMain.handle(IPC.setlists.setSongIds, (_event, id: string, songIds: string[]) =>
    setlists.setSongIds(id, songIds)
  )
}
