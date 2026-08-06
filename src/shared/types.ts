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
