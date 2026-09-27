import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import type { AdapterContext, SourceAdapter } from './types'

/**
 * TODO: Public X search without login.
 * Options to explore later: public search pages, syndication, or a documented
 * public API. No OAuth / account login in v1.
 */
export const xAdapter: SourceAdapter = {
  id: 'x',
  label: 'X',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('x', ctx.query)
      if (cached) return cached
    }

    const items: SourceItem[] = [
      {
        id: 'x-stub-1',
        source: 'x',
        title: `Stub: recent public posts about “${ctx.query}”`,
        url: 'https://x.com/search?q=' + encodeURIComponent(ctx.query),
        snippet:
          'TODO: scrape or call a public X search surface. This v1 stub does not hit X. No login.',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'x-stub-2',
        source: 'x',
        title: 'Stub: thread-style public conversation',
        url: 'https://x.com/',
        snippet: 'Placeholder item so the job pipeline and source chips work before a real adapter.',
        publishedAt: new Date(Date.now() - 3600_000).toISOString()
      }
    ]

    writeRawPull('x', ctx.query, items)
    return items
  }
}
