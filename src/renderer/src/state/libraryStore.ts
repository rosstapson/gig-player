import type { ImportSongInput, SongPatch } from '@shared/ipc-contract'
import type { Song } from '@shared/types'
import { create } from 'zustand'

interface LibraryState {
  songs: Song[]
  loaded: boolean
  load(): Promise<void>
  importSong(input: ImportSongInput): Promise<Song>
  updateSong(id: string, patch: SongPatch): Promise<void>
  deleteSong(id: string): Promise<void>
}

export const useLibraryStore = create<LibraryState>((set) => ({
  songs: [],
  loaded: false,

  async load() {
    const songs = await window.api.library.list()
    set({ songs, loaded: true })
  },

  async importSong(input) {
    const song = await window.api.library.importSong(input)
    set((state) => ({ songs: [...state.songs, song] }))
    return song
  },

  async updateSong(id, patch) {
    const song = await window.api.library.updateSong(id, patch)
    set((state) => ({ songs: state.songs.map((s) => (s.id === id ? song : s)) }))
  },

  async deleteSong(id) {
    await window.api.library.deleteSong(id)
    set((state) => ({ songs: state.songs.filter((s) => s.id !== id) }))
  }
}))
