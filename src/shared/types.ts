export type LyricsFormat = 'text' | 'markdown' | 'lrc' | 'cdg'

export interface Song {
  id: string
  title: string
  artist: string
  key: string
  tempo: number | null
  notes: string
  /** Path relative to the userData dir, e.g. "songs/<id>/audio.mp3" */
  audioFile: string
  /** Path relative to the userData dir, e.g. "songs/<id>/lyrics.md" */
  lyricsFile: string | null
  lyricsFormat: LyricsFormat
  /** 0-1, applied to the audio element during Performance Mode playback */
  volume: number
  createdAt: string
  updatedAt: string
}

export type NewSong = Omit<Song, 'id' | 'createdAt' | 'updatedAt'>

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  createdAt: string
  updatedAt: string
}

export type NewSetlist = Omit<Setlist, 'id' | 'createdAt' | 'updatedAt' | 'songIds'>

export interface Library {
  songs: Song[]
}

export interface SetlistsFile {
  setlists: Setlist[]
}

/** Persisted continuously while Performance Mode is active, so a crash can resume in place. */
export interface PerformanceState {
  setlistId: string
  songIndex: number
  updatedAt: string
}

export interface Settings {
  /** Explicit opt-in to auto-advance to the next song when one ends. Off by default. */
  autoplay: boolean
  /** Custom footswitch/MIDI triggers for Performance Mode actions, additive on top of the
   *  built-in keyboard shortcuts (never replaces them). */
  inputBindings: Partial<Record<BindableAction, InputBinding>>
}

export type BindableAction = 'togglePlay' | 'next' | 'prev' | 'stop'

export type InputBinding =
  | { type: 'key'; key: string } // matches KeyboardEvent.key
  | { type: 'midi'; statusType: number; data1: number } // channel-masked status (0x90/0xB0/0xC0) + note/CC/program number
