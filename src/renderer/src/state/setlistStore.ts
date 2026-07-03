import type { Setlist } from '@shared/types'
import { create } from 'zustand'

interface SetlistState {
  setlists: Setlist[]
  loaded: boolean
  load(): Promise<void>
  create(name: string): Promise<Setlist>
  rename(id: string, name: string): Promise<void>
  remove(id: string): Promise<void>
  setSongIds(id: string, songIds: string[]): Promise<void>
}

export const useSetlistStore = create<SetlistState>((set) => ({
  setlists: [],
  loaded: false,

  async load() {
    const setlists = await window.api.setlists.list()
    set({ setlists, loaded: true })
  },

  async create(name) {
    const setlist = await window.api.setlists.create(name)
    set((state) => ({ setlists: [...state.setlists, setlist] }))
    return setlist
  },

  async rename(id, name) {
    const setlist = await window.api.setlists.rename(id, name)
    set((state) => ({ setlists: state.setlists.map((s) => (s.id === id ? setlist : s)) }))
  },

  async remove(id) {
    await window.api.setlists.delete(id)
    set((state) => ({ setlists: state.setlists.filter((s) => s.id !== id) }))
  },

  async setSongIds(id, songIds) {
    const setlist = await window.api.setlists.setSongIds(id, songIds)
    set((state) => ({ setlists: state.setlists.map((s) => (s.id === id ? setlist : s)) }))
  }
}))
