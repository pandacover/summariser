export const SOURCE_IDS = ['x', 'yc', 'youtube', 'arxiv'] as const
export type SourceId = (typeof SOURCE_IDS)[number]

export type JobStatus = 'researching' | 'done' | 'error'
export type TrayBusyState = 'idle' | 'researching'

export interface SourceItem {
  id: string
  source: SourceId
  title: string
  url: string
  snippet: string
  publishedAt?: string
}

export interface DigestRecord {
  id: string
  query: string
  sources: SourceId[]
  content: string
  items: SourceItem[]
  status: JobStatus
  unread: boolean
  pinned: boolean
  createdAt: number
  openedAt?: number
  error?: string
  fresh: boolean
}

export interface RawPullCacheEntry {
  key: string
  source: SourceId
  query: string
  fetchedAt: number
  items: SourceItem[]
}

export interface HotkeySettings {
  /** Electron accelerator, default CommandOrControl+Shift+Space */
  holdToTalk: string
  /** Electron accelerator, default CommandOrControl+Shift+D */
  openChat: string
}

export interface EnabledSources {
  x: boolean
  yc: boolean
  youtube: boolean
  arxiv: boolean
}

export interface ModelSettings {
  /** OpenRouter chat/summarize model id (GPT-Luna family). */
  chat: string
  /** OpenRouter STT model id (Whisper V3 Turbo). */
  stt: string
}

export interface AppSettings {
  hotkeys: HotkeySettings
  sources: EnabledSources
  models: ModelSettings
}

export interface PublicSettings extends AppSettings {
  hasApiKey: boolean
}

export interface OverlayState {
  visible: boolean
  phase: 'idle' | 'listening' | 'transcribing'
  transcript: string
  error?: string
}

export interface SubmitAskInput {
  query: string
  fresh?: boolean
}
