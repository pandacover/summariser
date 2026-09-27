import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_STT_MODEL,
  OPENROUTER_BASE_URL
} from '../../shared/constants'
import type { SourceItem } from '../../shared/types'
import { getApiKey } from '../../main/secrets'
import { getSettings } from '../../main/store'

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const key = await getApiKey()
  if (!key) {
    throw new OpenRouterError('No OpenRouter API key saved. Add one in Settings.')
  }
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/pandacover/summariser',
    'X-Title': 'Digest tray'
  }
}

export async function chatComplete(input: {
  system: string
  user: string
  model?: string
}): Promise<string> {
  const settings = getSettings()
  const model = input.model ?? settings.models.chat ?? DEFAULT_CHAT_MODEL
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.user }
      ],
      temperature: 0.3
    })
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new OpenRouterError(
      `OpenRouter chat failed (${response.status}): ${body.slice(0, 400)}`,
      response.status
    )
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const text = json.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new OpenRouterError('OpenRouter returned an empty chat completion.')
  }
  return text
}

export async function transcribeAudio(input: {
  mimeType: string
  bytes: Buffer
  model?: string
}): Promise<string> {
  const settings = getSettings()
  const model = input.model ?? settings.models.stt ?? DEFAULT_STT_MODEL
  const headers = await authHeaders()

  const form = new FormData()
  form.set('model', model)
  const blob = new Blob([new Uint8Array(input.bytes)], { type: input.mimeType || 'audio/webm' })
  form.set('file', blob, guessFilename(input.mimeType))

  const response = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: headers.Authorization,
      'HTTP-Referer': 'https://github.com/pandacover/summariser',
      'X-Title': 'Digest tray'
    },
    body: form
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new OpenRouterError(
      `OpenRouter STT failed (${response.status}): ${body.slice(0, 400)}`,
      response.status
    )
  }

  const json = (await response.json()) as { text?: string }
  return (json.text ?? '').trim()
}

export function buildSummarizePrompt(query: string, items: SourceItem[]): {
  system: string
  user: string
} {
  const system =
    'You write concise, readable research digests. Group findings by source. ' +
    'Cite titles and URLs. Do not invent items that are not in the provided material. ' +
    'If the material is stub/mock data, still summarize it clearly and say so.'

  const packed = items
    .map(
      (item, i) =>
        `${i + 1}. [${item.source}] ${item.title}\n   ${item.url}\n   ${item.snippet}` +
        (item.publishedAt ? `\n   published: ${item.publishedAt}` : '')
    )
    .join('\n\n')

  const user =
    `User request:\n${query}\n\n` +
    `Source material (${items.length} items):\n${packed || '(no items)'}\n\n` +
    'Write a digest with a short headline, then bullets. End with a one-line "what to look at next".'

  return { system, user }
}

function guessFilename(mimeType: string): string {
  if (mimeType.includes('wav')) return 'hold-to-talk.wav'
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'hold-to-talk.m4a'
  if (mimeType.includes('ogg')) return 'hold-to-talk.ogg'
  return 'hold-to-talk.webm'
}
