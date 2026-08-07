import type { Settings } from '@shared/types'
import { create } from 'zustand'

interface SettingsState {
  settings: Settings
  loaded: boolean
  load(): Promise<void>
  set(patch: Partial<Settings>): Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { autoplay: false, inputBindings: {} },
  loaded: false,

  async load() {
    const settings = await window.api.settings.get()
    set({ settings, loaded: true })
  },

  async set(patch) {
    const settings = await window.api.settings.set(patch)
    set({ settings })
  }
}))
