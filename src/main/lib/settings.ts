import type { Settings } from '@shared/types'
import { readJson, writeJson } from './jsonStore'
import { getSettingsFile } from './paths'

const DEFAULT_SETTINGS: Settings = {
  autoplay: false
}

export function getSettings(): Settings {
  return readJson<Settings>(getSettingsFile(), DEFAULT_SETTINGS)
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const settings = { ...getSettings(), ...patch }
  writeJson(getSettingsFile(), settings)
  return settings
}
