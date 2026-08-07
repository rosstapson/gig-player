# Gig Player

A Linux-first backing-track and lyrics player for solo stage performance. Built to be simple,
fullscreen-friendly, and reliable enough to trust on stage — no server, no cloud login, no
surprise updates. All data lives in local files on the machine you run it on.

## Why

Most backing-track/lyrics tools are either bloated DAWs or fragile web pages. This is neither:
a small Electron app that does a handful of things well — hold a song library, build setlists
from it, run a fullscreen performance view with big lyrics and a handful of keyboard shortcuts,
and give you a practice-oriented Rehearsal Mode for learning a song before it hits a setlist.

## Tech stack

- **Electron + React + Vite + TypeScript** ([electron-vite](https://electron-vite.org) scaffold).
  Electron was chosen over Tauri specifically for audio reliability: its bundled Chromium gives
  identical MP3/WAV/FLAC codec support on every machine, rather than depending on whatever
  GStreamer plugins happen to be installed via the system's WebKitGTK.
- **Zustand** for renderer-side state (per-view stores, no global framework).
- **Plain JSON files** for storage — no embedded database. Human-readable, diffable, and easy to
  back up by copying a folder.
- **Web Audio + [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS) AudioWorklet** for
  Rehearsal Mode's independent tempo/key control — a plain `<audio>` element's `playbackRate`
  always ties pitch and tempo together, which is exactly what that view needs to pull apart. See
  the Rehearsal Mode section below for how the two playback engines relate.

## Data location

Everything lives under the OS user-data directory (`~/.config/gig-player` on Linux):

```
~/.config/gig-player/
  library.json           # song metadata index
  setlists.json          # setlists index
  performance-state.json # current setlist + song index while performing, for crash-safe resume
  settings.json          # app-level preferences (e.g. autoplay)
  songs/
    <song-id>/
      audio.<ext>    # copied in on import — never references the original file path
      lyrics.<ext>
```

Audio and lyrics files are **copied** into this managed directory when you add a song, rather
than referenced in place — so a renamed or moved source file can never break a song mid-gig.

To restore an "Export library…" backup, quit the app, unzip it, and copy `library.json`,
`setlists.json`, `settings.json`, and `songs/` into this directory (overwriting what's there).

## Running it

```bash
npm install
npm run dev          # electron-vite dev server with HMR
```

## Building

```bash
npm run build         # typecheck + production build (out/)
npm run build:linux   # produces an AppImage + deb via electron-builder
```

No auto-updater is configured on purpose — updates happen when you choose to rebuild/reinstall,
never mid-tour.

## Project layout

```
src/
  main/            # Electron main process
    ipc/           # ipcMain.handle registrations, one file per domain
    lib/           # filesystem-backed logic (library, setlists, JSON persistence,
                   # the gig-media:// protocol handler)
  preload/         # contextBridge — the only surface the renderer can call
  renderer/src/
    views/         # Library, Setlists, Performance, Rehearsal
    components/    # shared UI (forms, confirm dialog, CD+G canvas renderer, error boundary)
    state/         # Zustand stores
    lib/           # renderer-only helpers (e.g. gig-media:// URL building)
  shared/          # types + IPC contract + channel names, imported by both processes
```

The renderer never touches the filesystem directly — every read/write goes through
`window.api.*` (defined in `src/shared/ipc-contract.ts`) and is handled in the main process.

Audio and CD+G files are served to the renderer through a custom `gig-media://` protocol
(`src/main/lib/mediaProtocol.ts`) rather than plain `file://` URLs. A page loaded from
`http://localhost` — which is how electron-vite's dev server works — can't load `file://`
resources at all (Chromium blocks it), so a raw `file://` URL only happened to work in the
packaged build, where the page itself is loaded via `file://`. The custom protocol works
identically in both cases, and serves files with proper `Content-Length`/`Accept-Ranges` headers
so `duration` and seeking resolve correctly.

## Features

**Song library** — add songs with title, artist, key, tempo, notes, per-song playback volume;
audio (MP3/WAV/FLAC) and lyrics (plain text, Markdown source, timed `.lrc`, or CD+G `.cdg`
karaoke graphics) files are copied in on import. Search, edit, delete. Double-click a song to
play it standalone in Performance Mode. "Export library…" zips the library/setlists/settings
JSON plus every song's audio and lyrics files — not the whole data directory, which also holds
Chromium's own browser-profile cache/cookies — to a location you choose.

**Setlists** — create/rename/delete setlists, add songs from the library, reorder with
up/down controls, remove. Double-click a song in a setlist to start performing from there.

**Performance Mode** — fullscreen, pure-black stage view:
- Large centered lyrics; current song title and the next song both visible
- `Space` play/pause, `←`/`→` change song, `Esc` exit, `↑`/`↓` manual lyric scroll
- Skipping is arm-then-confirm: the first arrow press shows what it would do, a second press
  within ~1.5s confirms it — a single stray key press does nothing
- A visible emergency stop, separate from pause
- Display sleep is blocked for the duration of the performance (`powerSaveBlocker`)
- A missing/unreadable audio or lyrics file shows a clear on-screen error instead of failing
  silently or crashing
- `.cdg` karaoke files render as a synced canvas overlay (via [cdgraphics](https://github.com/bhj/cdgraphics)),
  driven directly off the audio element's `currentTime`
- Timed `.lrc` lyrics auto-highlight the current line off the same `currentTime`, instead of
  requiring manual scroll
- Playback fades out over the last few seconds before a song ends naturally; the emergency stop
  stays instant on purpose
- Optional autoplay (off by default) auto-advances to the next song when one ends, toggled from
  the header and persisted across restarts

**Rehearsal Mode** — a practice-oriented view for learning a song, separate from the stage view
(open it via the "Practice" button on a Library row):
- Draggable seek bar
- Loop a section: mark a start/end point (`[`/`]` or buttons) and repeat it indefinitely
- Change tempo (50%–150%) without affecting pitch
- Change key up/down by up to an octave (semitones) without affecting tempo
- Built on the Web Audio API rather than Performance Mode's plain `<audio>` element, specifically
  so tempo and pitch can move independently — see Tech stack above

**Reliability hardening**:
- Crash-safe resume — the current setlist + song index is persisted continuously while
  performing; if the app doesn't exit cleanly, the next launch offers to resume right where it
  left off
- Corrupted `library.json`/`setlists.json` is detected on read, reset to a safe empty state
  rather than crashing, and the unreadable original is preserved alongside it as a `.corrupted-*`
  backup; a warning banner surfaces this rather than failing silently
- A top-level error boundary catches unexpected UI errors with a recoverable screen instead of a
  blank window
- If the renderer process itself crashes, the window automatically reloads rather than staying
  permanently blank mid-gig

## Not built yet

See [TODO.md](TODO.md) for the backlog — footswitch/MIDI control.

## License

[MIT](LICENSE)
