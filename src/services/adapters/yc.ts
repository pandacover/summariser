import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import type { AdapterContext, SourceAdapter } from './types'

/**
 * TODO: Public YC pages (news, launches, blog, Work at a Startup, etc.).
 * No account login in v1.
 */
export const ycAdapter: SourceAdapter = {
  id: 'yc',
  label: 'YC',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('yc', ctx.query)
      if (cached) return cached
    }

    const items: SourceItem[] = [
      {
        id: 'yc-stub-1',
        source: 'yc',
        title: `Stub: recent YC posts matching “${ctx.query}”`,
        url: 'https://www.ycombinator.com/blog',
        snippet:
          'TODO: fetch public YC blog / news / launches HTML (or RSS if available) and extract posts.',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'yc-stub-2',
        source: 'yc',
        title: 'Stub: YC Launch / company mention',
        url: 'https://www.ycombinator.com/launches',
        snippet: 'Placeholder launch blurb for the digest pipeline.',
        publishedAt: new Date(Date.now() - 86400_000).toISOString()
      }
    ]

    writeRawPull('yc', ctx.query, items)
    return items
  }
}
