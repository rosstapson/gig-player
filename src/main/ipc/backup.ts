import { dialog, ipcMain } from 'electron'
import { IPC } from '@shared/channels'
import * as backup from '../lib/backup'

export function registerBackupIpc(): void {
  ipcMain.handle(IPC.backup.exportLibrary, async () => {
    const result = await dialog.showSaveDialog({
      title: 'Export library backup',
      defaultPath: `gig-player-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return null
    await backup.exportLibrary(result.filePath)
    return result.filePath
  })
}
