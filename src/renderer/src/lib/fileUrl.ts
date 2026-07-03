/**
 * Builds a URL for a song's audio/lyrics file, relative to the app's data dir, using the
 * custom `gig-media://` protocol registered in the main process.
 *
 * A plain file:// URL would work when the page itself is loaded from file:// (the packaged
 * build), but not when it's loaded from http://localhost (electron-vite's dev server) — Chromium
 * blocks a non-file:// page from loading local file:// resources. The custom protocol works
 * identically in both cases.
 */
export function toMediaUrl(relativePath: string): string {
  const segments = relativePath.split('/').map(encodeURIComponent)
  return `gig-media://local/${segments.join('/')}`
}
