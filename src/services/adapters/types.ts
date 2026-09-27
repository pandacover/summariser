import type { SourceId, SourceItem } from '../../shared/types'

export interface AdapterContext {
  query: string
  /** Bypass the raw-pull TTL cache. */
  fresh: boolean
}

export interface SourceAdapter {
  id: SourceId
  label: string
  /**
   * Public-only fetch. Must not require login.
   * Implementations should cache via the raw-pull layer unless `fresh` is set.
   */
  search(ctx: AdapterContext): Promise<SourceItem[]>
}
