import { randomUUID } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { ImportSongInput, SongPatch } from '@shared/ipc-contract'
import type { Library, Song } from '@shared/types'
import { readJson, writeJson } from './jsonStore'
import { getDataDir, getLibraryFile, getSongDir } from './paths'

function readLibrary(): Library {
  return readJson<Library>(getLibraryFile(), { songs: [] })
}

function writeLibrary(lib: Library): void {
  writeJson(getLibraryFile(), lib)
}

export function listSongs(): Song[] {
  return readLibrary().songs
}

export function resolveSongPath(relativePath: string): string {
  return join(getDataDir(), relativePath)
}

export function readSongText(relativePath: string): string {
  return readFileSync(join(getDataDir(), relativePath), 'utf-8')
}

export function readSongBinary(relativePath: string): Uint8Array {
  // Copy out of Node's Buffer (which may be a view into a pooled ArrayBuffer) so what
  // crosses the IPC bridge is an exact, independently-sized backing buffer.
  return new Uint8Array(readFileSync(join(getDataDir(), relativePath)))
}

export function importSong(input: ImportSongInput): Song {
  const id = randomUUID()
  const songDir = getSongDir(id)
  mkdirSync(songDir, { recursive: true })

  const audioFile = `songs/${id}/audio${extname(input.sourceAudioPath)}`
  copyFileSync(input.sourceAudioPath, join(getDataDir(), audioFile))

  let lyricsFile: string | null = null
  if (input.sourceLyricsPath) {
    lyricsFile = `songs/${id}/lyrics${extname(input.sourceLyricsPath)}`
    copyFileSync(input.sourceLyricsPath, join(getDataDir(), lyricsFile))
  }

  const now = new Date().toISOString()
  const song: Song = {
    id,
    title: input.title,
    artist: input.artist,
    key: input.key,
    tempo: input.tempo,
    notes: input.notes,
    audioFile,
    lyricsFile,
    lyricsFormat: input.lyricsFormat,
    volume: input.volume,
    createdAt: now,
    updatedAt: now
  }

  const lib = readLibrary()
  lib.songs.push(song)
  writeLibrary(lib)
  return song
}

export function updateSong(id: string, patch: SongPatch): Song {
  const lib = readLibrary()
  const song = lib.songs.find((s) => s.id === id)
  if (!song) throw new Error(`Song not found: ${id}`)
  Object.assign(song, patch, { updatedAt: new Date().toISOString() })
  writeLibrary(lib)
  return song
}

export function deleteSong(id: string): void {
  const lib = readLibrary()
  const idx = lib.songs.findIndex((s) => s.id === id)
  if (idx === -1) return
  lib.songs.splice(idx, 1)
  writeLibrary(lib)

  const dir = getSongDir(id)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}
