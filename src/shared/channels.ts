export const IPC = {
  library: {
    list: 'library:list',
    pickAudioFile: 'library:pickAudioFile',
    pickLyricsFile: 'library:pickLyricsFile',
    importSong: 'library:importSong',
    updateSong: 'library:updateSong',
    deleteSong: 'library:deleteSong',
    resolvePath: 'library:resolvePath',
    readText: 'library:readText',
    readBinary: 'library:readBinary'
  },
  setlists: {
    list: 'setlists:list',
    create: 'setlists:create',
    rename: 'setlists:rename',
    delete: 'setlists:delete',
    setSongIds: 'setlists:setSongIds'
  },
  performance: {
    start: 'performance:start',
    stop: 'performance:stop',
    saveState: 'performance:saveState',
    loadState: 'performance:loadState',
    clearState: 'performance:clearState'
  },
  diagnostics: {
    getStartupWarnings: 'diagnostics:getStartupWarnings'
  },
  settings: {
    get: 'settings:get',
    set: 'settings:set'
  }
} as const
