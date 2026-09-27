import { Notification } from 'electron'
import type { DigestRecord } from '../shared/types'
import { APP_NAME } from '../shared/constants'
import { openChatWindow } from './windows'

export function notifyDigestReady(digest: DigestRecord): void {
  if (!Notification.isSupported()) return
  const ok = digest.status === 'done'
  const notification = new Notification({
    title: ok ? `${APP_NAME} is ready` : `${APP_NAME} hit a snag`,
    body: ok
      ? truncate(digest.query, 90)
      : truncate(digest.error || digest.query, 90),
    timeoutType: 'default'
  })
  notification.on('click', () => {
    openChatWindow(digest.id)
  })
  notification.show()
}

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}
