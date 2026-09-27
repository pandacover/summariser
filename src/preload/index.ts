import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type { DigestAPI, SettingsSavePatch } from '../shared/ipc'
import type { DigestRecord, OverlayState, TrayBusyState } from '../shared/types'

function subscribe<T>(channel: string, handler: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => {
    handler(payload)
  }
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: DigestAPI = {
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  saveSettings: (patch: SettingsSavePatch) => ipcRenderer.invoke(IPC.settingsSave, patch),
  setApiKey: (key: string) => ipcRenderer.invoke(IPC.settingsSetApiKey, key),
  clearApiKey: () => ipcRenderer.invoke(IPC.settingsClearApiKey),
  listJobs: () => ipcRenderer.invoke(IPC.jobsList),
  getJob: (id: string) => ipcRenderer.invoke(IPC.jobsGet, id),
  submitAsk: (input) => ipcRenderer.invoke(IPC.jobsSubmit, input),
  pinJob: (id: string) => ipcRenderer.invoke(IPC.jobsPin, id),
  unpinJob: (id: string) => ipcRenderer.invoke(IPC.jobsUnpin, id),
  markOpened: (id: string) => ipcRenderer.invoke(IPC.jobsMarkOpened, id),
  dismissJob: (id: string) => ipcRenderer.invoke(IPC.jobsDismiss, id),
  getOverlay: () => ipcRenderer.invoke(IPC.overlayGet),
  confirmOverlay: () => ipcRenderer.invoke(IPC.overlayConfirm),
  cancelOverlay: () => ipcRenderer.invoke(IPC.overlayCancel),
  sendOverlayAudio: (payload) => ipcRenderer.invoke(IPC.overlayAudio, payload),
  listSources: () => ipcRenderer.invoke(IPC.sourcesList),
  onJobsUpdated: (handler) => subscribe<DigestRecord[]>(IPC.jobsUpdated, handler),
  onOverlayUpdated: (handler) => subscribe<OverlayState>(IPC.overlayUpdated, handler),
  onTrayState: (handler) => subscribe<TrayBusyState>(IPC.trayState, handler),
  onChatFocus: (handler) => subscribe<string>(IPC.chatFocus, handler)
}

contextBridge.exposeInMainWorld('digest', api)
