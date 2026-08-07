import { ipcMain } from 'electron'
import { IPC } from '@shared/channels'
import type { Settings } from '@shared/types'
import * as settings from '../lib/settings'

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC.settings.get, () => settings.getSettings())

  ipcMain.handle(IPC.settings.set, (_event, patch: Partial<Settings>) =>
    settings.updateSettings(patch)
  )
}
