import type { Settings } from '@shared/types'
import { readJson, writeJson } from './jsonStore'
import { getSettingsFile } from './paths'

const DEFAULT_SETTINGS: Settings = {
  autoplay: false,
  inputBindings: {}
}

export function getSettings(): Settings {
  // Merge onto DEFAULT_SETTINGS rather than returning the parsed file directly — a settings.json
  // written before a field like inputBindings existed won't have it, and reading that field on
  // the raw parsed object would crash the renderer instead of quietly filling in the default.
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(getSettingsFile(), {}) }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const settings = { ...getSettings(), ...patch }
  writeJson(getSettingsFile(), settings)
  return settings
}
