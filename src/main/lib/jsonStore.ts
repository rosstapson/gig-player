import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const corruptedFiles = new Set<string>()
const backedUpFiles = new Set<string>()

/** Files that failed to parse on read this session, so a startup warning can be shown. */
export function getCorruptedFiles(): string[] {
  return [...corruptedFiles]
}

export function readJson<T>(filePath: string, fallback: T): T {
  if (!existsSync(filePath)) return fallback
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as T
  } catch (err) {
    console.error(`Failed to parse ${filePath}, falling back to default:`, err)
    corruptedFiles.add(filePath)
    // Preserve the unreadable file rather than silently losing it on the next write — but
    // only once per file per session, since this file gets re-read many times before anything
    // ever fixes it (every list()/import call re-parses from disk).
    if (!backedUpFiles.has(filePath)) {
      backedUpFiles.add(filePath)
      try {
        copyFileSync(filePath, `${filePath}.corrupted-${Date.now()}`)
      } catch {
        // best-effort only
      }
    }
    return fallback
  }
}

/** Writes to a temp file then renames over the target, so a crash mid-write never corrupts the real file. */
export function writeJson(filePath: string, data: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  renameSync(tmpPath, filePath)
}
