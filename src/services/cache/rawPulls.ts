import type { RawPullCacheEntry, SourceId, SourceItem } from '../../shared/types'
import { RAW_PULL_TTL_MS } from '../../shared/constants'
import { getRawPull, setRawPull } from '../../main/store'

export function rawCacheKey(source: SourceId, query: string): string {
  return `${source}::${query.trim().toLowerCase()}`
}

export function readFreshRawPull(source: SourceId, query: string): SourceItem[] | null {
  const entry = getRawPull(rawCacheKey(source, query))
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > RAW_PULL_TTL_MS) return null
  return entry.items
}

export function writeRawPull(source: SourceId, query: string, items: SourceItem[]): void {
  const entry: RawPullCacheEntry = {
    key: rawCacheKey(source, query),
    source,
    query,
    fetchedAt: Date.now(),
    items
  }
  setRawPull(entry)
}
