import { existsSync, rmSync } from 'node:fs'
import type { PerformanceState } from '@shared/types'
import { readJson, writeJson } from './jsonStore'
import { getPerformanceStateFile } from './paths'

export function saveState(state: PerformanceState): void {
  writeJson(getPerformanceStateFile(), state)
}

export function loadState(): PerformanceState | null {
  return readJson<PerformanceState | null>(getPerformanceStateFile(), null)
}

export function clearState(): void {
  const file = getPerformanceStateFile()
  if (existsSync(file)) rmSync(file, { force: true })
}
