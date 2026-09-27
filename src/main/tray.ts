import { join } from 'node:path'
import { Menu, Tray, nativeImage, app } from 'electron'
import type { TrayBusyState } from '../shared/types'
import { APP_NAME } from '../shared/constants'
import { appEvents } from './events'
import { openChatWindow, openSettingsWindow } from './windows'

let tray: Tray | null = null
let busyState: TrayBusyState = 'idle'

function assetPath(file: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, file)
    : join(app.getAppPath(), 'resources', file)
}

function iconFor(state: TrayBusyState): Electron.NativeImage {
  const file = state === 'researching' ? 'tray-busy.png' : 'tray-idle.png'
  const image = nativeImage.createFromPath(assetPath(file))
  if (image.isEmpty()) {
    return nativeImage.createFromDataURL(
      state === 'researching'
        ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    )
  }
  return image.resize({ width: 16, height: 16 })
}

function buildMenu(): Electron.Menu {
  return Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => openChatWindow()
    },
    {
      label: 'Settings',
      click: () => openSettingsWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      }
    }
  ])
}

export function createTray(): Tray {
  if (tray) return tray
  tray = new Tray(iconFor(busyState))
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(buildMenu())
  tray.on('click', () => openChatWindow())
  applyTrayState(busyState)
  return tray
}

export function setTrayBusy(state: TrayBusyState): void {
  busyState = state
  applyTrayState(state)
  appEvents.trayState(state)
}

function applyTrayState(state: TrayBusyState): void {
  if (!tray) return
  tray.setImage(iconFor(state))
  tray.setToolTip(state === 'researching' ? `${APP_NAME} — researching` : APP_NAME)
}

export function getTrayState(): TrayBusyState {
  return busyState
}
