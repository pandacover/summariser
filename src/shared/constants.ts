import type { AppSettings, SourceId } from './types'
export { SOURCE_IDS } from './types'

export const APP_NAME = 'Digest'
export const APP_ID = 'com.pandacover.digest-tray'
export const SECRET_SERVICE = 'digest-tray'
export const SECRET_ACCOUNT = 'openrouter-api-key'

/**
 * Chat / summarize model (brief: "GPT-Luna via OpenRouter").
 *
 * OpenRouter slugs as of 2026-09:
 *   openai/gpt-6-luna     — current GPT-6 Luna (released 2026-09-22)
 *   openai/gpt-5.6-luna   — GPT-5.6 Luna
 *
 * Default is the current Luna generation. Override in Settings if the slug changes.
 */
export const DEFAULT_CHAT_MODEL = 'openai/gpt-6-luna'

/** Whisper Large V3 Turbo on OpenRouter. */
export const DEFAULT_STT_MODEL = 'openai/whisper-large-v3-turbo'

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

export const DEFAULT_HOTKEYS = {
  holdToTalk: 'CommandOrControl+Shift+Space',
  openChat: 'CommandOrControl+Shift+D'
} as const

export const DEFAULT_SOURCES = {
  x: true,
  yc: true,
  youtube: true,
  arxiv: true
} as const

/** Brief: cache raw pulls about 15–30 minutes. */
export const RAW_PULL_TTL_MS = 20 * 60 * 1000

/** Drop read (unpinned) digests after about a day. */
export const READ_DIGEST_TTL_MS = 24 * 60 * 60 * 1000

export const SOURCE_LABELS: Record<SourceId, string> = {
  x: 'X',
  yc: 'YC',
  youtube: 'YouTube',
  arxiv: 'arXiv'
}

export function defaultSettings(): AppSettings {
  return {
    hotkeys: { ...DEFAULT_HOTKEYS },
    sources: { ...DEFAULT_SOURCES },
    models: {
      chat: DEFAULT_CHAT_MODEL,
      stt: DEFAULT_STT_MODEL
    }
  }
}
