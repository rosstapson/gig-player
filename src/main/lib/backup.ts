import { ZipArchive } from 'archiver'
import { createWriteStream, existsSync } from 'node:fs'
import { basename } from 'node:path'
import {
  getLibraryFile,
  getPerformanceStateFile,
  getSettingsFile,
  getSetlistsFile,
  getSongsDir
} from './paths'

/**
 * Zips the app's own data files (library/setlists/settings/performance-state JSON + songs/) to
 * destPath. Deliberately does NOT zip the whole userData directory — that's also where Chromium
 * keeps its own profile data (Cache, Cookies, Local Storage, GPUCache, etc.), none of which
 * belongs in a song-library backup.
 */
export function exportLibrary(destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })

    output.on('close', () => resolve())
    output.on('error', reject)
    archive.on('error', reject)

    archive.pipe(output)

    for (const file of [
      getLibraryFile(),
      getSetlistsFile(),
      getSettingsFile(),
      getPerformanceStateFile()
    ]) {
      if (existsSync(file)) archive.file(file, { name: basename(file) })
    }
    if (existsSync(getSongsDir())) archive.directory(getSongsDir(), 'songs')

    archive.finalize()
  })
}
