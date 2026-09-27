import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import type { AdapterContext, SourceAdapter } from './types'

const ARXIV_API = 'https://export.arxiv.org/api/query'

function topicFromQuery(query: string): string {
  return query
    .replace(/\b(arxiv|ar xiv)\b/gi, ' ')
    .replace(/\b(what'?s new|summarize|summary|digest|recent|latest|fresh|search|about|on)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'cs.LG'
}

function unescapeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? unescapeXml(match[1]) : ''
}

function parseAtom(xml: string): SourceItem[] {
  const entries = xml.split(/<entry>/i).slice(1)
  return entries.map((raw, index) => {
    const block = raw.split(/<\/entry>/i)[0] ?? raw
    const id = tag(block, 'id') || `arxiv-${index}`
    const absId = id.replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    const url = id.startsWith('http') ? id : `https://arxiv.org/abs/${absId}`
    return {
      id: absId || id,
      source: 'arxiv',
      title: tag(block, 'title') || 'Untitled arXiv paper',
      url,
      snippet: tag(block, 'summary').slice(0, 600),
      publishedAt: tag(block, 'published') || undefined
    }
  })
}

async function fetchArxiv(query: string): Promise<SourceItem[]> {
  const topic = topicFromQuery(query)
  const search = `all:${topic}`
  const url =
    `${ARXIV_API}?search_query=${encodeURIComponent(search)}` +
    `&start=0&max_results=8&sortBy=submittedDate&sortOrder=descending`

  const response = await fetch(url, {
    headers: { 'User-Agent': 'DigestTray/0.1 (https://github.com/pandacover/summariser)' }
  })
  if (!response.ok) {
    throw new Error(`arXiv API error ${response.status}`)
  }
  const xml = await response.text()
  const items = parseAtom(xml)
  if (items.length === 0) {
    return [
      {
        id: 'arxiv-empty',
        source: 'arxiv',
        title: `No arXiv hits for “${topic}”`,
        url: 'https://arxiv.org/',
        snippet: 'The public arXiv Atom API returned no entries for this query.'
      }
    ]
  }
  return items
}

export const arxivAdapter: SourceAdapter = {
  id: 'arxiv',
  label: 'arXiv',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('arxiv', ctx.query)
      if (cached) return cached
    }
    const items = await fetchArxiv(ctx.query)
    writeRawPull('arxiv', ctx.query, items)
    return items
  }
}
