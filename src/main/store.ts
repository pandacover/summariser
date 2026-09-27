import Store from 'electron-store'
// electron-store v8 (CJS) — kept for a reliable Electron main-process require.
import {
  defaultSettings,
  RAW_PULL_TTL_MS,
  READ_DIGEST_TTL_MS
} from '../shared/constants'
import type {
  AppSettings,
  DigestRecord,
  RawPullCacheEntry
} from '../shared/types'

interface PersistShape {
  settings: AppSettings
  /** Base64 of Electron safeStorage (DPAPI on Windows) ciphertext. */
  encryptedApiKey: string | null
  /**
   * Plaintext fallback only when OS encryption is unavailable
   * (some Linux/dev environments). Not used on a typical Windows install.
   */
  apiKeyFallback: string | null
  digests: DigestRecord[]
  rawPulls: RawPullCacheEntry[]
}

let store: Store<PersistShape> | null = null

export function initStore(): Store<PersistShape> {
  if (!store) {
    store = new Store<PersistShape>({
      name: 'digest-tray',
      defaults: {
        settings: defaultSettings(),
        encryptedApiKey: null,
        apiKeyFallback: null,
        digests: [],
        rawPulls: []
      }
    })
    pruneExpired()
  }
  return store
}

function db(): Store<PersistShape> {
  if (!store) return initStore()
  return store
}

export function getStoredSettings(): AppSettings {
  const settings = db().get('settings') ?? defaultSettings()
  const defaults = defaultSettings()
  return {
    hotkeys: { ...defaults.hotkeys, ...settings.hotkeys },
    sources: { ...defaults.sources, ...settings.sources },
    models: { ...defaults.models, ...settings.models }
  }
}

export function getSettings(): AppSettings {
  return getStoredSettings()
}

export function patchSettings(patch: Partial<AppSettings>): AppSettings {
  const current = getStoredSettings()
  const next: AppSettings = {
    hotkeys: { ...current.hotkeys, ...patch.hotkeys },
    sources: { ...current.sources, ...patch.sources },
    models: { ...current.models, ...patch.models }
  }
  db().set('settings', next)
  return next
}

export function getEncryptedApiKey(): string | null {
  return db().get('encryptedApiKey') ?? null
}

export function setEncryptedApiKey(value: string | null): void {
  db().set('encryptedApiKey', value)
}

export function getApiKeyFallback(): string | null {
  return db().get('apiKeyFallback') ?? null
}

export function setApiKeyFallback(value: string | null): void {
  db().set('apiKeyFallback', value)
}

export function listDigests(): DigestRecord[] {
  pruneExpired()
  return [...db().get('digests')].sort((a, b) => b.createdAt - a.createdAt)
}

export function getDigest(id: string): DigestRecord | null {
  return listDigests().find((d) => d.id === id) ?? null
}

export function upsertDigest(record: DigestRecord): DigestRecord {
  const all = db().get('digests').filter((d) => d.id !== record.id)
  all.push(record)
  db().set('digests', all)
  return record
}

export function removeDigest(id: string): void {
  db().set(
    'digests',
    db().get('digests').filter((d) => d.id !== id)
  )
}

export function getRawPull(key: string): RawPullCacheEntry | undefined {
  pruneRawPulls()
  return db().get('rawPulls').find((e) => e.key === key)
}

export function setRawPull(entry: RawPullCacheEntry): void {
  pruneRawPulls()
  const rest = db().get('rawPulls').filter((e) => e.key !== entry.key)
  rest.push(entry)
  db().set('rawPulls', rest)
}

export function pruneExpired(): void {
  pruneRawPulls()
  const now = Date.now()
  const kept = db().get('digests').filter((d) => {
    if (d.pinned) return true
    if (d.status === 'researching') return true
    if (d.unread) return true
    if (!d.openedAt) return true
    return now - d.openedAt < READ_DIGEST_TTL_MS
  })
  db().set('digests', kept)
}

function pruneRawPulls(): void {
  const now = Date.now()
  db().set(
    'rawPulls',
    db().get('rawPulls').filter((e) => now - e.fetchedAt <= RAW_PULL_TTL_MS)
  )
}
