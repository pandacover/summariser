import { randomUUID } from 'node:crypto'
import type { DigestRecord, EnabledSources, SourceId, SourceItem } from '../shared/types'
import { SOURCE_IDS, SOURCE_LABELS } from '../shared/constants'
import { getAdapter } from '../services/adapters/registry'
import { buildSummarizePrompt, chatComplete } from '../services/openrouter/client'
import { appEvents } from './events'
import { notifyDigestReady } from './notifications'
import { getSettings, listDigests, upsertDigest } from './store'
import { setTrayBusy } from './tray'

const FRESH_RE = /\b(fresh|refresh|force|right now|latest now)\b/i

const SOURCE_HINTS: Array<{ id: SourceId; pattern: RegExp }> = [
  { id: 'arxiv', pattern: /\bar\s*xiv\b/i },
  { id: 'youtube', pattern: /\byoutube\b|\byt\b/i },
  { id: 'yc', pattern: /\byc\b|y\s*combinator/i },
  { id: 'x', pattern: /\btwitter\b|\bx\.com\b|\bon x\b/i }
]

export function parseAsk(
  query: string,
  enabled: EnabledSources
): { sources: SourceId[]; fresh: boolean } {
  const fresh = FRESH_RE.test(query)
  const mentioned = SOURCE_HINTS.filter((h) => h.pattern.test(query)).map((h) => h.id)
  const allowed = SOURCE_IDS.filter((id) => enabled[id])
  const sources = (mentioned.length ? mentioned.filter((id) => enabled[id]) : allowed).filter(
    Boolean
  ) as SourceId[]
  return {
    sources: sources.length ? sources : allowed,
    fresh
  }
}

export function submitAsk(query: string, freshFlag = false): DigestRecord {
  const trimmed = query.trim()
  if (!trimmed) {
    throw new Error('Ask cannot be empty.')
  }

  const settings = getSettings()
  const parsed = parseAsk(trimmed, settings.sources)
  const fresh = freshFlag || parsed.fresh

  const record: DigestRecord = {
    id: randomUUID(),
    query: trimmed,
    sources: parsed.sources,
    content: '',
    items: [],
    status: 'researching',
    unread: true,
    pinned: false,
    createdAt: Date.now(),
    fresh
  }

  upsertDigest(record)
  syncTrayBusy()
  appEvents.jobsUpdated(listDigests())

  void runJob(record.id)
  return record
}

async function runJob(id: string): Promise<void> {
  const current = listDigests().find((d) => d.id === id)
  if (!current) return

  try {
    const collected: SourceItem[] = []
    const errors: string[] = []

    await Promise.all(
      current.sources.map(async (source) => {
        try {
          const items = await getAdapter(source).search({
            query: current.query,
            fresh: current.fresh
          })
          collected.push(...items)
        } catch (error) {
          errors.push(`${SOURCE_LABELS[source]}: ${errorMessage(error)}`)
        }
      })
    )

    let content: string
    try {
      const prompt = buildSummarizePrompt(current.query, collected)
      content = await chatComplete(prompt)
    } catch (error) {
      content = stitchFallback(current.query, collected, errorMessage(error))
    }

    if (errors.length) {
      content += `\n\nAdapter notes:\n${errors.map((e) => `- ${e}`).join('\n')}`
    }

    const done: DigestRecord = {
      ...current,
      items: collected,
      content,
      status: 'done',
      unread: true
    }
    upsertDigest(done)
    notifyDigestReady(done)
  } catch (error) {
    const failed: DigestRecord = {
      ...current,
      status: 'error',
      unread: true,
      error: errorMessage(error),
      content: `Could not finish this digest.\n\n${errorMessage(error)}`
    }
    upsertDigest(failed)
    notifyDigestReady(failed)
  } finally {
    syncTrayBusy()
    appEvents.jobsUpdated(listDigests())
  }
}

export function syncTrayBusy(): void {
  const researching = listDigests().some((d) => d.status === 'researching')
  setTrayBusy(researching ? 'researching' : 'idle')
}

function stitchFallback(query: string, items: SourceItem[], reason: string): string {
  const lines = items.map(
    (item) => `- **${SOURCE_LABELS[item.source]}** — [${item.title}](${item.url})\n  ${item.snippet}`
  )
  return [
    `Digest (local fallback) for: ${query}`,
    '',
    'OpenRouter summarization was skipped or failed:',
    reason,
    '',
    items.length ? 'Source material:' : 'No source items returned.',
    ...lines
  ].join('\n')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
