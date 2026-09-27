/**
 * Hits the same public endpoints the adapters use (no Electron, no OpenRouter).
 */
const UA =
  'DigestTray/0.1 (+https://github.com/pandacover/summariser) Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

async function get(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-US', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000)
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${url} ${text.slice(0, 80)}`)
  return { res, text }
}

function countTag(xml, tag) {
  return (xml.match(new RegExp(`<${tag}>`, 'gi')) || []).length
}

const topic = process.argv.slice(2).join(' ') || 'AI agents'
const results = []

try {
  const { text } = await get(
    'https://news.google.com/rss/search?hl=en-US&gl=US&ceid=US:en&q=' +
      encodeURIComponent(`site:x.com OR site:twitter.com ${topic} when:7d`)
  )
  results.push(`X Google News RSS items=${countTag(text, 'item')}`)
} catch (error) {
  results.push(`X FAIL ${error.message}`)
}

try {
  const rss = await get('https://www.ycombinator.com/blog/rss')
  const launches = await get(
    'https://www.ycombinator.com/launches?query=' + encodeURIComponent(topic),
    { headers: { Accept: 'application/json' } }
  )
  const hits = JSON.parse(launches.text).hits || []
  results.push(`YC blog RSS items=${countTag(rss.text, 'item')} launches hits=${hits.length} first=${hits[0]?.title ?? ''}`)
} catch (error) {
  results.push(`YC FAIL ${error.message}`)
}

try {
  const { text } = await get('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://www.youtube.com' },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: '2.20260101.00.00', hl: 'en', gl: 'US' } },
      query: topic,
      params: 'CAI='
    })
  })
  const videos = [...text.matchAll(/"videoId":"([^"]+)"/g)]
  const unique = new Set(videos.map((m) => m[1]))
  results.push(`YouTube InnerTube unique videoIds=${unique.size}`)
} catch (error) {
  results.push(`YouTube FAIL ${error.message}`)
}

try {
  const { text } = await get(
    'https://export.arxiv.org/api/query?search_query=' +
      encodeURIComponent(`all:${topic}`) +
      '&start=0&max_results=3&sortBy=submittedDate&sortOrder=descending'
  )
  results.push(`arXiv Atom entries=${countTag(text, 'entry')}`)
} catch (error) {
  results.push(`arXiv FAIL ${error.message}`)
}

for (const line of results) console.log(line)
if (results.some((line) => line.includes(' FAIL '))) process.exit(1)
