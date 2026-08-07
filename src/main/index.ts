import { app, session, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerBackupIpc } from './ipc/backup'
import { registerDiagnosticsIpc } from './ipc/diagnostics'
import { registerLibraryIpc } from './ipc/library'
import { registerPerformanceIpc } from './ipc/performance'
import { registerSettingsIpc } from './ipc/settings'
import { registerSetlistsIpc } from './ipc/setlists'
import { listSongs } from './lib/library'
import { registerMediaProtocolHandler, registerMediaProtocolScheme } from './lib/mediaProtocol'
import { listSetlists } from './lib/setlists'

// Must happen before app.whenReady() — Electron only accepts scheme privileges up to that point.
registerMediaProtocolScheme()

// Electron denies all permission requests by default. Web MIDI (for footswitch/MIDI-controller
// binding in Performance Mode) is the only one this app needs. Note: despite requesting plain
// navigator.requestMIDIAccess() with no sysex option anywhere in the renderer, this Electron
// build reports every MIDI access request to these handlers as the 'midiSysex' permission, never
// plain 'midi' — confirmed empirically, not from documentation, which describes them as distinct.
// Both names are allowed here so this keeps working if a future Electron version reports it as
// documented.
const ALLOWED_MIDI_PERMISSIONS = new Set(['midi', 'midiSysex'])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  mainWindow = win

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // A renderer crash mid-gig should self-heal rather than leave a permanently blank window.
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone, reloading:', details.reason)
    win.reload()
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.gigplayer.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  session.defaultSession.setPermissionCheckHandler((_webContents, permission) =>
    ALLOWED_MIDI_PERMISSIONS.has(permission)
  )
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_MIDI_PERMISSIONS.has(permission))
  })

  registerLibraryIpc()
  registerSetlistsIpc()
  registerPerformanceIpc(() => mainWindow)
  registerDiagnosticsIpc()
  registerSettingsIpc()
  registerBackupIpc()
  registerMediaProtocolHandler()

  // Read once up front so any corrupted file is detected before the renderer asks for warnings.
  listSongs()
  listSetlists()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
