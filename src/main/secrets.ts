import { safeStorage } from 'electron'
import {
  getApiKeyFallback,
  getEncryptedApiKey,
  setApiKeyFallback,
  setEncryptedApiKey
} from './store'

export function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

export async function getApiKey(): Promise<string | null> {
  const encrypted = getEncryptedApiKey()
  if (encrypted && encryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    } catch {
      return null
    }
  }
  return getApiKeyFallback()
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey()
  return Boolean(key && key.trim())
}

export async function setApiKey(plain: string): Promise<void> {
  const trimmed = plain.trim()
  if (!trimmed) {
    await clearApiKey()
    return
  }
  if (encryptionAvailable()) {
    const blob = safeStorage.encryptString(trimmed)
    setEncryptedApiKey(blob.toString('base64'))
    setApiKeyFallback(null)
    return
  }
  // Fallback: electron-store plaintext. Typical Windows uses DPAPI via safeStorage.
  setEncryptedApiKey(null)
  setApiKeyFallback(trimmed)
}

export async function clearApiKey(): Promise<void> {
  setEncryptedApiKey(null)
  setApiKeyFallback(null)
}
