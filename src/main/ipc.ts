import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type { SettingsSavePatch } from '../shared/ipc'
import { SOURCE_IDS } from '../shared/constants'
import { registerHotkeys } from './hotkeys'
import { dismissJob, markDigestOpened, pinJob } from './jobs'
import {
  cancelHoldToTalk,
  confirmHoldToTalk,
  getOverlayState,
  receiveOverlayAudio
} from './overlay'
import { submitAsk } from './pipeline'
import { clearApiKey, hasApiKey, setApiKey } from './secrets'
import { getDigest, getSettings, listDigests, patchSettings } from './store'
import { openSettingsWindow } from './windows'

export function registerIpc(): void {
  ipcMain.handle(IPC.settingsGet, async () => {
    const settings = getSettings()
    return { ...settings, hasApiKey: await hasApiKey() }
  })

  ipcMain.handle(IPC.settingsSave, async (_event, patch: SettingsSavePatch) => {
    const settings = patchSettings(patch)
    registerHotkeys()
    return { ...settings, hasApiKey: await hasApiKey() }
  })

  ipcMain.handle(IPC.settingsSetApiKey, async (_event, key: string) => {
    const trimmed = String(key ?? '').trim()
    if (!trimmed) return { ok: false, error: 'Paste an OpenRouter API key first.' }
    await setApiKey(trimmed)
    registerHotkeys()
    return { ok: true }
  })

  ipcMain.handle(IPC.settingsClearApiKey, async () => {
    await clearApiKey()
    registerHotkeys()
  })

  ipcMain.handle(IPC.jobsList, () => listDigests())
  ipcMain.handle(IPC.jobsGet, (_event, id: string) => getDigest(id))
  ipcMain.handle(IPC.jobsSubmit, async (_event, input: { query: string; fresh?: boolean }) => {
    if (!(await hasApiKey())) {
      openSettingsWindow()
      throw new Error('Save an OpenRouter API key in Settings first.')
    }
    return submitAsk(String(input?.query ?? ''), Boolean(input?.fresh))
  })
  ipcMain.handle(IPC.jobsPin, (_event, id: string) => pinJob(id, true))
  ipcMain.handle(IPC.jobsUnpin, (_event, id: string) => pinJob(id, false))
  ipcMain.handle(IPC.jobsMarkOpened, (_event, id: string) => markDigestOpened(id))
  ipcMain.handle(IPC.jobsDismiss, (_event, id: string) => dismissJob(id))

  ipcMain.handle(IPC.overlayGet, () => getOverlayState())
  ipcMain.handle(IPC.overlayConfirm, () => confirmHoldToTalk())
  ipcMain.handle(IPC.overlayCancel, () => cancelHoldToTalk())
  ipcMain.handle(
    IPC.overlayAudio,
    (_event, payload: { mimeType: string; base64: string }) => {
      receiveOverlayAudio(payload.mimeType, payload.base64)
    }
  )

  ipcMain.handle(IPC.sourcesList, () => [...SOURCE_IDS])
}
