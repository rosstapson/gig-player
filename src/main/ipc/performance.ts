import { BrowserWindow, ipcMain, powerSaveBlocker } from 'electron'
import { IPC } from '@shared/channels'

let blockerId: number | null = null

export function registerPerformanceIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.performance.start, () => {
    getWindow()?.setFullScreen(true)
    if (blockerId === null || !powerSaveBlocker.isStarted(blockerId)) {
      blockerId = powerSaveBlocker.start('prevent-display-sleep')
    }
  })

  ipcMain.handle(IPC.performance.stop, () => {
    getWindow()?.setFullScreen(false)
    if (blockerId !== null) {
      powerSaveBlocker.stop(blockerId)
      blockerId = null
    }
  })
}
