import { BrowserWindow, ipcMain, powerSaveBlocker } from 'electron'
import { IPC } from '@shared/channels'
import type { PerformanceState } from '@shared/types'
import * as performanceState from '../lib/performanceState'

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

  ipcMain.handle(IPC.performance.saveState, (_event, state: PerformanceState) =>
    performanceState.saveState(state)
  )

  ipcMain.handle(IPC.performance.loadState, () => performanceState.loadState())

  ipcMain.handle(IPC.performance.clearState, () => performanceState.clearState())
}
