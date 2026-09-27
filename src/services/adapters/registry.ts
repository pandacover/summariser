import type { SourceId } from '../../shared/types'
import { arxivAdapter } from './arxiv'
import type { SourceAdapter } from './types'
import { xAdapter } from './x'
import { ycAdapter } from './yc'
import { youtubeAdapter } from './youtube'

const adapters: Record<SourceId, SourceAdapter> = {
  x: xAdapter,
  yc: ycAdapter,
  youtube: youtubeAdapter,
  arxiv: arxivAdapter
}

export function getAdapter(id: SourceId): SourceAdapter {
  return adapters[id]
}

export function listAdapters(): SourceAdapter[] {
  return Object.values(adapters)
}
