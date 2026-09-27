import { app, BrowserWindow, session } from 'electron'
import { APP_ID, APP_NAME } from '../shared/constants'
import { appEvents } from './events'
import { registerHotkeys, unregisterHotkeys } from './hotkeys'
import { registerIpc } from './ipc'
import { syncTrayBusy } from './pipeline'
import { hasApiKey } from './secrets'
import { initStore } from './store'
import { createTray } from './tray'
import { getChatWindow, getOverlayWindow, openSettingsWindow, setQuitting } from './windows'

app.setName(APP_NAME)
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const chat = getChatWindow()
    if (chat) {
      chat.show()
      chat.focus()
    } else {
      void openSettingsWindow()
    }
  })
}

app.on('window-all-closed', () => {
  // Stay in the tray on all platforms for this app.
})

app.on('before-quit', () => {
  setQuitting()
  unregisterHotkeys()
})

app.whenReady().then(async () => {
  initStore()
  registerIpc()
  createTray()
  getOverlayWindow()
  registerHotkeys()
  syncTrayBusy()

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })

  appEvents.on('jobs-updated', (jobs) => {
    getChatWindow()?.webContents.send('jobs:updated', jobs)
  })
  appEvents.on('overlay-updated', (state) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('overlay:updated', state)
    }
  })
  appEvents.on('tray-state', (state) => {
    getChatWindow()?.webContents.send('tray:state', state)
  })

  if (!(await hasApiKey())) {
    openSettingsWindow()
  }
})
