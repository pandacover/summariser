import type { DigestAPI } from '../shared/ipc'

declare global {
  interface Window {
    digest: DigestAPI
  }
}

export {}
