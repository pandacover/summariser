const USER_AGENT =
  'DigestTray/0.1 (+https://github.com/pandacover/summariser) Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'

export class AdapterHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'AdapterHttpError'
  }
}

export async function fetchText(
  url: string,
  init: RequestInit = {}
): Promise<{ text: string; contentType: string }> {
  const headers = new Headers(init.headers)
  if (!headers.has('User-Agent')) headers.set('User-Agent', USER_AGENT)
  if (!headers.has('Accept-Language')) headers.set('Accept-Language', 'en-US,en;q=0.9')

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: 'follow',
    signal: init.signal ?? AbortSignal.timeout(20_000)
  })
  const text = await response.text()
  if (!response.ok) {
    throw new AdapterHttpError(
      `HTTP ${response.status} from ${url} (${text.slice(0, 120).replace(/\s+/g, ' ')})`,
      response.status
    )
  }
  return { text, contentType: response.headers.get('content-type') ?? '' }
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const { text } = await fetchText(url, { ...init, headers })
  try {
    return JSON.parse(text) as T
  } catch {
    throw new AdapterHttpError(`Non-JSON response from ${url}: ${text.slice(0, 160)}`)
  }
}
