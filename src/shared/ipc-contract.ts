import type { NewSong, PerformanceState, Setlist, Settings, Song } from './types'

/** Everything needed to import a song: metadata plus absolute source paths picked via native dialogs. */
export interface ImportSongInput extends Omit<NewSong, 'audioFile' | 'lyricsFile'> {
  sourceAudioPath: string
  sourceLyricsPath: string | null
}

export type SongPatch = Partial<Omit<NewSong, 'audioFile' | 'lyricsFile'>>

/**
 * The renderer-facing API exposed via preload's contextBridge.
 * Renderer code only ever calls window.api.* — it never touches the filesystem directly.
 */
export interface GigPlayerAPI {
  library: {
    list(): Promise<Song[]>
    /** Opens a native file picker, returns the absolute path or null if cancelled. */
    pickAudioFile(): Promise<string | null>
    pickLyricsFile(): Promise<string | null>
    /** Copies the source files into the managed data dir and adds a library entry. */
    importSong(input: ImportSongInput): Promise<Song>
    updateSong(id: string, patch: SongPatch): Promise<Song>
    deleteSong(id: string): Promise<void>
    /** Resolves a song's audioFile/lyricsFile to an absolute path for playback/display. */
    resolvePath(relativePath: string): Promise<string>
    /** Reads a lyrics file's contents as utf-8 text. */
    readText(relativePath: string): Promise<string>
    /** Reads a lyrics file's raw bytes — used for binary formats like .cdg. */
    readBinary(relativePath: string): Promise<Uint8Array>
  }
  setlists: {
    list(): Promise<Setlist[]>
    create(name: string): Promise<Setlist>
    rename(id: string, name: string): Promise<Setlist>
    delete(id: string): Promise<void>
    /** Replaces the full ordered song id list — used for add/remove/reorder alike. */
    setSongIds(id: string, songIds: string[]): Promise<Setlist>
  }
  performance: {
    /** Enters fullscreen and blocks display sleep for the duration of the performance. */
    start(): Promise<void>
    /** Exits fullscreen and releases the sleep block. */
    stop(): Promise<void>
    /** Persists where we are, so a crash can offer to resume in the same spot. */
    saveState(state: PerformanceState): Promise<void>
    loadState(): Promise<PerformanceState | null>
    /** Called on a clean exit — a leftover state on next launch means we didn't exit cleanly. */
    clearState(): Promise<void>
  }
  diagnostics: {
    /** Human-readable warnings about anything recovered from at startup (e.g. corrupted data files). */
    getStartupWarnings(): Promise<string[]>
  }
  settings: {
    get(): Promise<Settings>
    /** Merges the patch into the persisted settings and returns the full result. */
    set(patch: Partial<Settings>): Promise<Settings>
  }
  backup: {
    /** Opens a native save dialog and zips the full data dir to the chosen path. Returns the
     *  chosen path, or null if the user cancelled. */
    exportLibrary(): Promise<string | null>
  }
}
