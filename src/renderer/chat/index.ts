import '../styles/shared.css'
import './chat.css'
import type { DigestRecord, SourceId } from '../../shared/types'
import { SOURCE_LABELS } from '../../shared/constants'

const jobList = document.querySelector('#job-list') as HTMLElement
const empty = document.querySelector('#empty') as HTMLElement
const detail = document.querySelector('#detail') as HTMLElement
const detailQuery = document.querySelector('#detail-query') as HTMLElement
const detailChips = document.querySelector('#detail-chips') as HTMLElement
const detailBody = document.querySelector('#detail-body') as HTMLElement
const pinBtn = document.querySelector('#pin-btn') as HTMLButtonElement
const dismissBtn = document.querySelector('#dismiss-btn') as HTMLButtonElement
const form = document.querySelector('#ask-form') as HTMLFormElement
const input = document.querySelector('#ask-input') as HTMLInputElement
const fresh = document.querySelector('#fresh') as HTMLInputElement
const trayStatus = document.querySelector('#tray-status') as HTMLElement

let jobs: DigestRecord[] = []
let selectedId: string | null = null

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderLiteMarkdown(text: string): string {
  const escaped = escapeHtml(text)
  const withLinks = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  )
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return withBold
    .split('\n')
    .map((line) => {
      if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`
      return line ? `<p>${line}</p>` : '<br />'
    })
    .join('\n')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`)
}

function selected(): DigestRecord | undefined {
  return jobs.find((j) => j.id === selectedId)
}

function renderList(): void {
  jobList.innerHTML = ''
  if (!jobs.length) {
    jobList.innerHTML = '<div class="muted pad">No digests yet.</div>'
    return
  }
  for (const job of jobs) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `job ${job.id === selectedId ? 'active' : ''}`
    btn.innerHTML = `
      <span class="job-top">
        ${job.unread ? '<span class="unread" title="Unread"></span>' : ''}
        ${job.pinned ? '<span class="pin">Pinned</span>' : ''}
        <span class="job-status">${job.status}</span>
      </span>
      <span class="job-query">${escapeHtml(job.query)}</span>
    `
    btn.addEventListener('click', () => selectJob(job.id))
    jobList.appendChild(btn)
  }
}

function renderDetail(): void {
  const job = selected()
  if (!job) {
    empty.classList.remove('hidden')
    detail.classList.add('hidden')
    return
  }
  empty.classList.add('hidden')
  detail.classList.remove('hidden')
  detailQuery.textContent = job.query
  detailChips.innerHTML = job.sources
    .map((id: SourceId) => `<span class="chip active">${SOURCE_LABELS[id]}</span>`)
    .join('')
  if (job.status === 'researching') {
    detailBody.innerHTML = '<p class="muted">Researching in the background…</p>'
  } else {
    detailBody.innerHTML = renderLiteMarkdown(job.content || job.error || '')
  }
  pinBtn.textContent = job.pinned ? 'Unpin' : 'Pin'
}

async function selectJob(id: string): Promise<void> {
  selectedId = id
  renderList()
  renderDetail()
  await window.digest.markOpened(id)
}

async function refresh(): Promise<void> {
  jobs = await window.digest.listJobs()
  if (selectedId && !jobs.some((j) => j.id === selectedId)) selectedId = jobs[0]?.id ?? null
  renderList()
  renderDetail()
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const query = input.value.trim()
  if (!query) return
  const job = await window.digest.submitAsk({ query, fresh: fresh.checked })
  input.value = ''
  fresh.checked = false
  selectedId = job.id
  await refresh()
})

pinBtn.addEventListener('click', async () => {
  const job = selected()
  if (!job) return
  if (job.pinned) await window.digest.unpinJob(job.id)
  else await window.digest.pinJob(job.id)
})

dismissBtn.addEventListener('click', async () => {
  const job = selected()
  if (!job) return
  await window.digest.dismissJob(job.id)
  selectedId = null
})

window.digest.onJobsUpdated((next) => {
  jobs = next
  renderList()
  renderDetail()
})

window.digest.onChatFocus((id) => {
  void selectJob(id)
})

window.digest.onTrayState((state) => {
  trayStatus.textContent = state === 'researching' ? 'Researching…' : 'Idle'
})

void refresh()
