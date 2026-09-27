import type { SourceItem } from '../../shared/types'
import { readFreshRawPull, writeRawPull } from '../cache/rawPulls'
import { fetchJson, fetchText } from './http'
import { extractTopic, runsToText, walkObjects } from './text'
import type { AdapterContext, SourceAdapter } from './types'

const INNERTUBE = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false'
const RESULTS = 'https://www.youtube.com/results'
/** Sort by upload date (public `sp` value used by youtube.com/results). */
const SORT_BY_DATE = 'CAI='
const FALLBACK_CLIENT = '2.20260101.00.00'
const CONSENT = 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwMTMxLjA3X3AxGgJlbiACGgYIgLq8sAY'

function snippetFromVideo(vr: Record<string, unknown>): string {
  const desc = runsToText(vr.descriptionSnippet)
  if (desc) return desc
  const details = vr.detailedMetadataSnippets
  if (Array.isArray(details) && details[0] && typeof details[0] === 'object') {
    return runsToText((details[0] as { snippetText?: unknown }).snippetText)
  }
  return ''
}

function itemsFromTree(root: unknown): SourceItem[] {
  const videos: SourceItem[] = []
  const seen = new Set<string>()
  walkObjects(root, (obj) => {
    const vr = (obj.videoRenderer ?? obj.compactVideoRenderer) as Record<string, unknown> | undefined
    if (!vr || typeof vr.videoId !== 'string') return
    if (seen.has(vr.videoId)) return
    seen.add(vr.videoId)
    const title = runsToText(vr.title) || 'YouTube video'
    const channel = runsToText(vr.ownerText) || runsToText(vr.longBylineText)
    const when = runsToText(vr.publishedTimeText)
    const views = runsToText(vr.shortViewCountText) || runsToText(vr.viewCountText)
    const snippet = [snippetFromVideo(vr), channel && `Channel: ${channel}`, when, views]
      .filter(Boolean)
      .join(' · ')
    videos.push({
      id: vr.videoId,
      source: 'youtube',
      title,
      url: `https://www.youtube.com/watch?v=${vr.videoId}`,
      snippet: snippet.slice(0, 500),
      publishedAt: when || undefined
    })
  })
  return videos.slice(0, 8)
}

function extractYtInitialData(html: string): unknown {
  const marker = 'ytInitialData'
  const idx = html.indexOf(marker)
  if (idx < 0) throw new Error('YouTube HTML missing ytInitialData (consent wall or layout change).')
  const eq = html.indexOf('=', idx)
  const start = html.indexOf('{', eq)
  if (start < 0) throw new Error('YouTube HTML ytInitialData JSON not found.')
  let depth = 0
  for (let i = start; i < html.length; i++) {
    const ch = html[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(html.slice(start, i + 1))
      }
    }
  }
  throw new Error('YouTube HTML ytInitialData JSON was truncated.')
}

async function fetchInnerTube(topic: string): Promise<SourceItem[]> {
  const q = topic || 'news'
  const data = await fetchJson<unknown>(INNERTUBE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://www.youtube.com',
      Referer: `${RESULTS}?search_query=${encodeURIComponent(q)}&sp=${encodeURIComponent(SORT_BY_DATE)}`,
      Cookie: CONSENT
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: FALLBACK_CLIENT,
          hl: 'en',
          gl: 'US'
        }
      },
      query: q,
      params: SORT_BY_DATE
    })
  })
  const items = itemsFromTree(data)
  if (!items.length) {
    throw new Error('YouTube InnerTube search returned no videos.')
  }
  return items
}

async function fetchResultsHtml(topic: string): Promise<SourceItem[]> {
  const q = topic || 'news'
  const url = `${RESULTS}?search_query=${encodeURIComponent(q)}&sp=${encodeURIComponent(SORT_BY_DATE)}&hl=en&gl=US`
  const { text } = await fetchText(url, {
    headers: { Cookie: CONSENT, Accept: 'text/html' }
  })
  const items = itemsFromTree(extractYtInitialData(text))
  if (!items.length) {
    throw new Error('YouTube results HTML contained no videoRenderer objects.')
  }
  return items
}

export async function fetchYoutubePublic(query: string): Promise<SourceItem[]> {
  const topic = extractTopic(query)
  const errors: string[] = []
  try {
    return await fetchInnerTube(topic)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  try {
    return await fetchResultsHtml(topic)
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }
  throw new Error(`YouTube public search failed. ${errors.join(' | ')}`)
}

export const youtubeAdapter: SourceAdapter = {
  id: 'youtube',
  label: 'YouTube',
  async search(ctx: AdapterContext): Promise<SourceItem[]> {
    if (!ctx.fresh) {
      const cached = readFreshRawPull('youtube', ctx.query)
      if (cached) return cached
    }
    const items = await fetchYoutubePublic(ctx.query)
    writeRawPull('youtube', ctx.query, items)
    return items
  }
}
