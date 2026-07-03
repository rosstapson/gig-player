import { createReadStream, statSync } from 'node:fs'
import { extname, join, sep } from 'node:path'
import { Readable } from 'node:stream'
import { protocol } from 'electron'
import { getDataDir } from './paths'

export const MEDIA_SCHEME = 'gig-media'

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg'
}

/**
 * Loading a page over http://localhost (electron-vite's dev server) can't load file:// audio —
 * Chromium blocks cross-origin access to local files from a non-file:// page. A custom protocol
 * for reading inside the app's own data dir works the same in dev and in the packaged build.
 *
 * Must run before app.whenReady() — Electron only accepts scheme privileges up to that point.
 */
export function registerMediaProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: MEDIA_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true }
    }
  ])
}

function resolveAndGuard(requestUrl: string): string | null {
  const dataDir = getDataDir()
  const relativePath = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\/+/, '')
  // join() normalizes ".." segments, so this comparison actually blocks traversal — string-
  // concatenating the paths first would not, since "../../etc/passwd" would still pass a naive
  // startsWith check on the un-normalized string.
  const absPath = join(dataDir, relativePath)
  if (absPath === dataDir || absPath.startsWith(dataDir + sep)) return absPath
  return null
}

/**
 * Must run after app.whenReady().
 *
 * Serves the file manually (rather than via net.fetch(pathToFileURL(...))) because that path
 * doesn't reliably pass through Content-Length/Accept-Ranges for local files — without those,
 * Chromium's media element can play the audio (readyState reaches HAVE_ENOUGH_DATA) but never
 * resolves a duration or seekable range, since it can't determine the total resource size.
 */
export function registerMediaProtocolHandler(): void {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const absPath = resolveAndGuard(request.url)
    if (!absPath) return new Response('Forbidden', { status: 403 })

    let size: number
    try {
      size = statSync(absPath).size
    } catch {
      return new Response('Not Found', { status: 404 })
    }

    const mimeType = MIME_TYPES[extname(absPath).toLowerCase()] ?? 'application/octet-stream'
    const rangeMatch = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') ?? '')

    if (rangeMatch) {
      const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0
      const end = rangeMatch[2] ? Number(rangeMatch[2]) : size - 1
      const stream = createReadStream(absPath, { start, end })
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes'
        }
      })
    }

    const stream = createReadStream(absPath)
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes'
      }
    })
  })
}
