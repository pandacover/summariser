import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import type { AdapterContext, SourceAdapter } from './types'

/**
 * TODO: Public YouTube search / pages without login.
 * No OAuth or personal subscriptions in v1.
 */
export const youtubeAdapter: SourceAdapter = {
  id: 'youtube',
  label: 'YouTube',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('youtube', ctx.query)
      if (cached) return cached
    }

    const items: SourceItem[] = [
      {
        id: 'yt-stub-1',
        source: 'youtube',
        title: `Stub: public YouTube results for “${ctx.query}”`,
        url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ctx.query),
        snippet:
          'TODO: use public search HTML or a public API key (not user OAuth) to list recent videos.',
        publishedAt: new Date().toISOString()
      },
      {
        id: 'yt-stub-2',
        source: 'youtube',
        title: 'Stub: video title placeholder',
        url: 'https://www.youtube.com/',
        snippet: 'Placeholder description so source chips and summarization have material.',
        publishedAt: new Date(Date.now() - 7200_000).toISOString()
      }
    ]

    writeRawPull('youtube', ctx.query, items)
    return items
  }
}
