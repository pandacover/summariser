import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import { fetchText } from './http'
import { extractTopic, parseRssItems } from './text'
import type { AdapterContext, SourceAdapter } from './types'

const GOOGLE_NEWS =
  'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q='
const DDG_HTML = 'https://html.duckduckgo.com/html/'

function xSearchUrl(topic: string): string {
  const q = topic ? `${topic} lang:en` : 'min_retweets:2'
  return `https://x.com/search?q=${encodeURIComponent(q)}&src=typed_query&f=live`
}

function looksLikeX(item: { link: string; sourceName?: string; sourceUrl?: string; title: string }): boolean {
  const blob = `${item.sourceName ?? ''} ${item.sourceUrl ?? ''} ${item.link} ${item.title}`.toLowerCase()
  return blob.includes('x.com') || blob.includes('twitter.com') || blob.includes('twitter')
}

function fromNews(xml: string, topic: string): SourceItem[] {
  return parseRssItems(xml)
    .filter((item) => item.title && !/google news/i.test(item.title))
    .filter(looksLikeX)
    .slice(0, 8)
    .map((item, index) => ({
      id: `x-news-${index}-${item.link.slice(-24)}`,
      source: 'x' as const,
      title: item.title.replace(/\s+-\s+x\.com\s*$/i, '').slice(0, 240),
      url: item.link || xSearchUrl(topic),
      snippet:
        (item.snippet || item.title) +
        ' (Public X post indexed by Google News RSS. X’s own search page requires login, so the URL may be a News wrapper.)',
      publishedAt: item.publishedAt
    }))
}

function decodeDdgHref(href: string): string {
  try {
    const url = new URL(href, 'https://html.duckduckgo.com/')
    const uddg = url.searchParams.get('uddg')
    return uddg ? decodeURIComponent(uddg) : url.href
  } catch {
    return href
  }
}

function fromDdg(html: string): SourceItem[] {
  const items: SourceItem[] = []
  const re = /<a\b([^>]*class="[^"]*result__a[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const href = /href="([^"]+)"/i.exec(match[1] ?? '')?.[1]
    const title = (match[2] ?? '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').trim()
    if (!href || !title) continue
    const url = decodeDdgHref(href)
    if (!/https?:\/\/(www\.)?(x|twitter)\.com\//i.test(url)) continue
    items.push({
      id: `x-ddg-${items.length}`,
      source: 'x',
      title: title.slice(0, 240),
      url,
      snippet: 'Public page on X/Twitter from DuckDuckGo HTML search (no login).'
    })
    if (items.length >= 8) break
  }
  return items
}

async function fetchGoogleNews(topic: string): Promise<SourceItem[]> {
  const q = topic
    ? `site:x.com OR site:twitter.com ${topic} when:7d`
    : 'site:x.com when:1d'
  const { text } = await fetchText(GOOGLE_NEWS + encodeURIComponent(q), {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8' }
  })
  return fromNews(text, topic)
}

async function fetchDdg(topic: string): Promise<SourceItem[]> {
  const q = topic ? `site:x.com OR site:twitter.com ${topic}` : 'site:x.com'
  const { text } = await fetchText(`${DDG_HTML}?q=${encodeURIComponent(q)}`, {
    headers: { Accept: 'text/html' }
  })
  const parsed = fromDdg(text)
  if (parsed.length) return parsed

  const { text: posted } = await fetchText(DDG_HTML, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html'
    },
    body: new URLSearchParams({ q })
  })
  return fromDdg(posted)
}

export async function fetchXPublic(query: string): Promise<SourceItem[]> {
  const topic = extractTopic(query)
  const errors: string[] = []

  try {
    const news = await fetchGoogleNews(topic)
    if (news.length) return news
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  try {
    const ddg = await fetchDdg(topic)
    if (ddg.length) return ddg
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  throw new Error(
    errors.length
      ? `No public X posts found. ${errors.join(' | ')}`
      : 'No public X posts found via Google News RSS or DuckDuckGo. X search itself redirects to login.'
  )
}

export const xAdapter: SourceAdapter = {
  id: 'x',
  label: 'X',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('x', ctx.query)
      if (cached) return cached
    }
    const items = await fetchXPublic(ctx.query)
    writeRawPull('x', ctx.query, items)
    return items
  }
}
