import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import { fetchText } from './http'
import { extractTopic, unescapeXml, xmlTag } from './text'
import type { AdapterContext, SourceAdapter } from './types'

const ARXIV_API = 'https://export.arxiv.org/api/query'

function parseAtom(xml: string): SourceItem[] {
  const entries = xml.split(/<entry>/i).slice(1)
  return entries.map((raw, index) => {
    const block = raw.split(/<\/entry>/i)[0] ?? raw
    const id = xmlTag(block, 'id') || `arxiv-${index}`
    const absId = id.replace(/^https?:\/\/arxiv\.org\/abs\//i, '')
    const url = id.startsWith('http') ? id : `https://arxiv.org/abs/${absId}`
    return {
      id: absId || id,
      source: 'arxiv' as const,
      title: xmlTag(block, 'title') || 'Untitled arXiv paper',
      url,
      snippet: unescapeXml(xmlTag(block, 'summary')).slice(0, 600),
      publishedAt: xmlTag(block, 'published') || undefined
    }
  })
}

export async function fetchArxivPublic(query: string): Promise<SourceItem[]> {
  const topic = extractTopic(query) || 'cs.LG'
  const search = `all:${topic}`
  const url =
    `${ARXIV_API}?search_query=${encodeURIComponent(search)}` +
    `&start=0&max_results=8&sortBy=submittedDate&sortOrder=descending`

  const { text: xml } = await fetchText(url, {
    headers: { Accept: 'application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8' }
  })
  const items = parseAtom(xml)
  if (items.length === 0) {
    throw new Error(`arXiv API returned no entries for “${topic}”.`)
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
    const items = await fetchArxivPublic(ctx.query)
    writeRawPull('arxiv', ctx.query, items)
    return items
  }
}
