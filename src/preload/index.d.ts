import { ElectronAPI } from '@electron-toolkit/preload'
import type { GigPlayerAPI } from '@shared/ipc-contract'

declare global {
  interface Window {
    electron: ElectronAPI
    api: GigPlayerAPI
  }
}
