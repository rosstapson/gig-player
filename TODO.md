# TODO

Backlog of features not yet built. Not a commitment or a schedule — just a place to track ideas
so they don't get lost.

## Performance Mode

- **Footswitch / MIDI control** — map a footswitch (likely USB-HID, acts as a keyboard) or a MIDI
  controller to the existing play/pause/next/prev/stop actions.
- **Autoplay setting** — explicit opt-in to auto-advance to the next song when one ends (currently
  never auto-advances, by design).

## Rehearsal Mode

A practice-oriented alternative to Performance Mode — for learning a song, not for the stage.
Should probably be its own view rather than a mode bolted onto the fullscreen stage view, since
the two have pretty different jobs.

- Seek bar — drag to any point in the song.
- Loop section — mark a start/end point and repeat it.
- Change tempo by percentage without affecting pitch (time-stretch independent of pitch).
- Change key up/down by semitones without affecting tempo (pitch-shift independent of playback
  rate).

## Library / Setlists

- Backup/export of the full library (zip of the data dir).
