import { globalShortcut } from 'electron'
import { getSettings } from './store'
import { startHoldToTalk } from './overlay'
import { hasApiKey } from './secrets'
import { openChatWindow, openSettingsWindow } from './windows'

let registered: string[] = []

export function registerHotkeys(): void {
  unregisterHotkeys()
  const { hotkeys } = getSettings()

  registerOne(hotkeys.holdToTalk, () => {
    void (async () => {
      if (!(await hasApiKey())) {
        openSettingsWindow()
        return
      }
      await startHoldToTalk()
    })()
  })

  registerOne(hotkeys.openChat, () => {
    void (async () => {
      if (!(await hasApiKey())) {
        openSettingsWindow()
        return
      }
      openChatWindow()
    })()
  })
}

export function unregisterHotkeys(): void {
  for (const accelerator of registered) {
    try {
      globalShortcut.unregister(accelerator)
    } catch {
      // ignore invalid accelerators from user edits
    }
  }
  registered = []
}

function registerOne(accelerator: string, callback: () => void): void {
  try {
    const ok = globalShortcut.register(accelerator, callback)
    if (ok) registered.push(accelerator)
    else console.warn(`[digest] hotkey in use or invalid: ${accelerator}`)
  } catch (error) {
    console.warn(`[digest] failed to register ${accelerator}`, error)
  }
}
