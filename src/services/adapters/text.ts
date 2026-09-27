const SOURCE_NOISE =
  /\b(arxiv|ar\s*xiv|youtube|\byt\b|y\s*combinator|\byc\b|twitter|x\.com|\bon x\b)\b/gi

const ASK_NOISE =
  /\b(what'?s new|summarize|summary|digest|recent|latest|fresh|search|about|\bon\b|posts?|videos?|tweets?|papers?|find|show)\b/gi

export function unescapeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
}

export function stripHtml(value: string): string {
  return unescapeXml(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function xmlTag(block: string, name: string): string {
  const match = block.match(new RegExp(`<${name}([^>]*)>([\\s\\S]*?)</${name}>`, 'i'))
  if (!match) {
    const self = block.match(new RegExp(`<${name}([^>]*)/>`, 'i'))
    return self ? '' : ''
  }
  return unescapeXml(stripHtml(match[2] ?? ''))
}

export function xmlAttr(block: string, name: string, attr: string): string {
  const open = block.match(new RegExp(`<${name}([^>]*)>`, 'i'))
  if (!open) return ''
  const found = open[1]?.match(new RegExp(`${attr}="([^"]*)"`, 'i'))
  return found ? unescapeXml(found[1]) : ''
}

export function extractTopic(query: string): string {
  return query
    .replace(SOURCE_NOISE, ' ')
    .replace(ASK_NOISE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

export function topicTokens(topic: string): string[] {
  return topic
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .filter((token) => token.length >= 2)
}

export function matchesTopic(text: string, topic: string): boolean {
  const tokens = topicTokens(topic)
  if (!tokens.length) return true
  const hay = text.toLowerCase()
  return tokens.every((token) => hay.includes(token))
}

export function runsToText(node: unknown): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (typeof node === 'object') {
    const rec = node as Record<string, unknown>
    if (typeof rec.simpleText === 'string') return rec.simpleText
    if (Array.isArray(rec.runs)) {
      return rec.runs.map((run) => runsToText(run)).join('')
    }
    if (typeof rec.text === 'string') return rec.text
    if (rec.accessibilityData && typeof rec.accessibilityData === 'object') {
      const label = (rec.accessibilityData as { label?: string }).label
      if (label) return label
    }
  }
  return ''
}

export function walkObjects(node: unknown, visit: (obj: Record<string, unknown>) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walkObjects(item, visit)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    visit(obj)
    for (const value of Object.values(obj)) walkObjects(value, visit)
  }
}

export function parseRssItems(xml: string): Array<{
  title: string
  link: string
  snippet: string
  publishedAt?: string
  sourceName?: string
  sourceUrl?: string
}> {
  return xml.split(/<item>/i).slice(1).map((raw) => {
    const block = raw.split(/<\/item>/i)[0] ?? raw
    return {
      title: xmlTag(block, 'title'),
      link: xmlTag(block, 'link'),
      snippet: xmlTag(block, 'description'),
      publishedAt: xmlTag(block, 'pubDate') || xmlTag(block, 'dc:date') || undefined,
      sourceName: xmlTag(block, 'source') || undefined,
      sourceUrl: xmlAttr(block, 'source', 'url') || undefined
    }
  })
}
