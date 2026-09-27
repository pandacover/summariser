import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import { fetchJson, fetchText } from './http'
import { extractTopic, matchesTopic, parseRssItems } from './text'
import type { AdapterContext, SourceAdapter } from './types'

const BLOG_RSS = 'https://www.ycombinator.com/blog/rss'
const LAUNCHES = 'https://www.ycombinator.com/launches'

interface LaunchHit {
  id?: number | string
  title?: string
  tagline?: string
  slug?: string
  created_at?: string
  search_path?: string
  company?: { name?: string; batch?: string; industry?: string; tags?: string[] }
}

interface LaunchesResponse {
  hits?: LaunchHit[]
}

async function fetchBlog(topic: string): Promise<SourceItem[]> {
  const { text } = await fetchText(BLOG_RSS, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8' }
  })
  const parsed = parseRssItems(text)
  const filtered = topic
    ? parsed.filter((item) => matchesTopic(`${item.title} ${item.snippet}`, topic))
    : parsed
  return filtered.slice(0, topic ? 8 : 6).map((item, index) => ({
    id: `yc-blog-${item.link || index}`,
    source: 'yc' as const,
    title: item.title || 'YC blog post',
    url: item.link,
    snippet: item.snippet.slice(0, 500) || 'Y Combinator blog (public RSS).',
    publishedAt: item.publishedAt
  }))
}

async function fetchLaunches(topic: string): Promise<SourceItem[]> {
  const url = topic ? `${LAUNCHES}?query=${encodeURIComponent(topic)}` : LAUNCHES
  const data = await fetchJson<LaunchesResponse>(url, {
    headers: { Accept: 'application/json' }
  })
  return (data.hits ?? []).slice(0, 8).map((hit) => {
    const company = hit.company?.name ? `${hit.company.name} (${hit.company.batch ?? 'YC'})` : 'YC company'
    const tags = (hit.company?.tags ?? []).slice(0, 4).join(', ')
    return {
      id: `yc-launch-${hit.id ?? hit.slug ?? hit.title}`,
      source: 'yc' as const,
      title: hit.title || hit.tagline || 'YC launch',
      url:
        hit.search_path ||
        (hit.slug ? `https://www.ycombinator.com/launches/${hit.slug}` : LAUNCHES),
      snippet: [hit.tagline, company, hit.company?.industry, tags].filter(Boolean).join(' — '),
      publishedAt: hit.created_at
    }
  })
}

export async function fetchYcPublic(query: string): Promise<SourceItem[]> {
  const topic = extractTopic(query)
  const settled = await Promise.allSettled([fetchBlog(topic), fetchLaunches(topic)])
  const items: SourceItem[] = []
  const errors: string[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') items.push(...result.value)
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
  }
  if (!items.length) {
    throw new Error(
      errors.length
        ? `YC public feeds returned nothing. ${errors.join(' | ')}`
        : `No YC blog/launch matches for “${topic || query}”.`
    )
  }
  return items.slice(0, 12)
}

export const ycAdapter: SourceAdapter = {
  id: 'yc',
  label: 'YC',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('yc', ctx.query)
      if (cached) return cached
    }
    const items = await fetchYcPublic(ctx.query)
    writeRawPull('yc', ctx.query, items)
    return items
  }
}
