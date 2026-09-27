import { join } from 'node:path'
import { BrowserWindow, app, screen, shell } from 'electron'
import { APP_NAME } from '../shared/constants'
import { markDigestOpened } from './jobs'

let chatWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null
let overlayWindow: BrowserWindow | null = null
let pendingFocusId: string | undefined
let quitting = false

export function setQuitting(): void {
  quitting = true
}

function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function rendererUrl(page: 'chat' | 'settings' | 'overlay'): string {
  const devBase = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devBase) {
    return `${devBase}/${page}/index.html`
  }
  return join(__dirname, `../renderer/${page}/index.html`)
}

function load(window: BrowserWindow, page: 'chat' | 'settings' | 'overlay'): void {
  const target = rendererUrl(page)
  if (target.startsWith('http')) {
    void window.loadURL(target)
  } else {
    void window.loadFile(target)
  }
}

function attachWindowChrome(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })
}

export function openChatWindow(digestId?: string): BrowserWindow {
  if (digestId) pendingFocusId = digestId
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show()
    chatWindow.focus()
    if (digestId) {
      chatWindow.webContents.send('chat:focus', digestId)
      markDigestOpened(digestId)
    }
    return chatWindow
  }

  chatWindow = new BrowserWindow({
    width: 920,
    height: 640,
    minWidth: 720,
    minHeight: 480,
    title: APP_NAME,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  attachWindowChrome(chatWindow)
  chatWindow.on('ready-to-show', () => {
    chatWindow?.show()
    if (pendingFocusId) {
      chatWindow?.webContents.send('chat:focus', pendingFocusId)
      markDigestOpened(pendingFocusId)
      pendingFocusId = undefined
    }
  })
  chatWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      chatWindow?.hide()
    }
  })
  chatWindow.on('closed', () => {
    chatWindow = null
  })

  load(chatWindow, 'chat')
  return chatWindow
}

export function openSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show()
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 520,
    height: 640,
    resizable: false,
    title: `${APP_NAME} settings`,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  attachWindowChrome(settingsWindow)
  settingsWindow.on('ready-to-show', () => settingsWindow?.show())
  settingsWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault()
      settingsWindow?.hide()
    }
  })
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  load(settingsWindow, 'settings')
  return settingsWindow
}

export function showOverlayWindow(): BrowserWindow {
  const overlay = getOverlayWindow()
  const cursor = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursor)
  const { x, y, width } = display.workArea
  overlay.setPosition(Math.round(x + width / 2 - 170), Math.round(y + 48))
  overlay.showInactive()
  return overlay
}

export function hideOverlayWindow(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide()
  }
}

export function getOverlayWindow(): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow

  overlayWindow = new BrowserWindow({
    width: 340,
    height: 196,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    focusable: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.on('closed', () => {
    overlayWindow = null
  })
  load(overlayWindow, 'overlay')
  return overlayWindow
}

export function getChatWindow(): BrowserWindow | null {
  return chatWindow && !chatWindow.isDestroyed() ? chatWindow : null
}
