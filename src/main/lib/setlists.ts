import { randomUUID } from 'node:crypto'
import type { Setlist, SetlistsFile } from '@shared/types'
import { readJson, writeJson } from './jsonStore'
import { getSetlistsFile } from './paths'

function readSetlists(): SetlistsFile {
  return readJson<SetlistsFile>(getSetlistsFile(), { setlists: [] })
}

function writeSetlists(file: SetlistsFile): void {
  writeJson(getSetlistsFile(), file)
}

function findOrThrow(file: SetlistsFile, id: string): Setlist {
  const setlist = file.setlists.find((s) => s.id === id)
  if (!setlist) throw new Error(`Setlist not found: ${id}`)
  return setlist
}

export function listSetlists(): Setlist[] {
  return readSetlists().setlists
}

export function createSetlist(name: string): Setlist {
  const now = new Date().toISOString()
  const setlist: Setlist = { id: randomUUID(), name, songIds: [], createdAt: now, updatedAt: now }
  const file = readSetlists()
  file.setlists.push(setlist)
  writeSetlists(file)
  return setlist
}

export function renameSetlist(id: string, name: string): Setlist {
  const file = readSetlists()
  const setlist = findOrThrow(file, id)
  setlist.name = name
  setlist.updatedAt = new Date().toISOString()
  writeSetlists(file)
  return setlist
}

export function deleteSetlist(id: string): void {
  const file = readSetlists()
  file.setlists = file.setlists.filter((s) => s.id !== id)
  writeSetlists(file)
}

export function setSongIds(id: string, songIds: string[]): Setlist {
  const file = readSetlists()
  const setlist = findOrThrow(file, id)
  setlist.songIds = songIds
  setlist.updatedAt = new Date().toISOString()
  writeSetlists(file)
  return setlist
}
