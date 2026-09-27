import type { DigestRecord } from '../shared/types'
import { appEvents } from './events'
import { getDigest, listDigests, removeDigest, upsertDigest } from './store'

export function pinJob(id: string, pinned: boolean): DigestRecord | null {
  const current = getDigest(id)
  if (!current) return null
  const next = { ...current, pinned }
  upsertDigest(next)
  appEvents.jobsUpdated(listDigests())
  return next
}

export function markDigestOpened(id: string): DigestRecord | null {
  const current = getDigest(id)
  if (!current) return null
  const next: DigestRecord = {
    ...current,
    unread: false,
    openedAt: Date.now()
  }
  upsertDigest(next)
  appEvents.jobsUpdated(listDigests())
  return next
}

export function dismissJob(id: string): void {
  removeDigest(id)
  appEvents.jobsUpdated(listDigests())
}
