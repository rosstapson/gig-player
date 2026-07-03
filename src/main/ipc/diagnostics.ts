import { basename } from 'node:path'
import { ipcMain } from 'electron'
import { IPC } from '@shared/channels'
import { getCorruptedFiles } from '../lib/jsonStore'

export function registerDiagnosticsIpc(): void {
  ipcMain.handle(IPC.diagnostics.getStartupWarnings, () =>
    getCorruptedFiles().map(
      (file) =>
        `${basename(file)} couldn't be read and was reset. The unreadable original was kept alongside it as a backup.`
    )
  )
}
