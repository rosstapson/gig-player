import { app } from 'electron'
import { join } from 'node:path'

export function getDataDir(): string {
  return app.getPath('userData')
}

export function getLibraryFile(): string {
  return join(getDataDir(), 'library.json')
}

export function getSetlistsFile(): string {
  return join(getDataDir(), 'setlists.json')
}

export function getSongsDir(): string {
  return join(getDataDir(), 'songs')
}

export function getSongDir(id: string): string {
  return join(getSongsDir(), id)
}
