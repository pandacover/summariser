import type {
  DigestRecord,
  OverlayState,
  PublicSettings,
  SourceId,
  SubmitAskInput,
  TrayBusyState
} from './types'

export const IPC = {
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsSetApiKey: 'settings:setApiKey',
  settingsClearApiKey: 'settings:clearApiKey',
  jobsList: 'jobs:list',
  jobsGet: 'jobs:get',
  jobsSubmit: 'jobs:submit',
  jobsPin: 'jobs:pin',
  jobsUnpin: 'jobs:unpin',
  jobsMarkOpened: 'jobs:markOpened',
  jobsDismiss: 'jobs:dismiss',
  overlayGet: 'overlay:get',
  overlayConfirm: 'overlay:confirm',
  overlayCancel: 'overlay:cancel',
  overlayAudio: 'overlay:audio',
  sourcesList: 'sources:list',
  jobsUpdated: 'jobs:updated',
  overlayUpdated: 'overlay:updated',
  trayState: 'tray:state',
  chatFocus: 'chat:focus'
} as const

export interface SettingsSavePatch {
  hotkeys?: PublicSettings['hotkeys']
  sources?: PublicSettings['sources']
  models?: PublicSettings['models']
}

export interface DigestAPI {
  getSettings: () => Promise<PublicSettings>
  saveSettings: (patch: SettingsSavePatch) => Promise<PublicSettings>
  setApiKey: (key: string) => Promise<{ ok: boolean; error?: string }>
  clearApiKey: () => Promise<void>
  listJobs: () => Promise<DigestRecord[]>
  getJob: (id: string) => Promise<DigestRecord | null>
  submitAsk: (input: SubmitAskInput) => Promise<DigestRecord>
  pinJob: (id: string) => Promise<DigestRecord | null>
  unpinJob: (id: string) => Promise<DigestRecord | null>
  markOpened: (id: string) => Promise<DigestRecord | null>
  dismissJob: (id: string) => Promise<void>
  getOverlay: () => Promise<OverlayState>
  confirmOverlay: () => Promise<void>
  cancelOverlay: () => Promise<void>
  sendOverlayAudio: (payload: { mimeType: string; base64: string }) => Promise<void>
  listSources: () => Promise<SourceId[]>
  onJobsUpdated: (handler: (jobs: DigestRecord[]) => void) => () => void
  onOverlayUpdated: (handler: (state: OverlayState) => void) => () => void
  onTrayState: (handler: (state: TrayBusyState) => void) => () => void
  onChatFocus: (handler: (digestId: string) => void) => () => void
}
