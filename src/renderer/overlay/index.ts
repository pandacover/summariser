import '../styles/shared.css'
import './overlay.css'

const phaseEl = document.querySelector('#phase') as HTMLElement
const hintEl = document.querySelector('#hint') as HTMLElement
const errorEl = document.querySelector('#error') as HTMLElement
const micEl = document.querySelector('#mic') as HTMLElement
const confirmBtn = document.querySelector('#confirm') as HTMLButtonElement
const cancelBtn = document.querySelector('#cancel') as HTMLButtonElement

let media: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
let recording = false

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const batch = 0x8000
  for (let i = 0; i < bytes.length; i += batch) {
    binary += String.fromCharCode(...bytes.subarray(i, i + batch))
  }
  return btoa(binary)
}

async function startRecording(): Promise<void> {
  if (recording) return
  stopRecording()
  recording = true
  try {
    media = await navigator.mediaDevices.getUserMedia({ audio: true })
    recorder = new MediaRecorder(media)
    chunks = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data)
    })
    recorder.start()
    micEl.classList.add('live')
    hintEl.textContent = 'Mic is live. Speak, then Confirm — or press the hotkey again.'
  } catch {
    recording = false
    hintEl.textContent =
      'Mic unavailable in this window. Confirm will fail without audio — type the ask in Chat instead.'
    micEl.classList.remove('live')
  }
}

function stopRecording(): void {
  recording = false
  if (recorder && recorder.state !== 'inactive') {
    try {
      recorder.stop()
    } catch {
      /* already stopped */
    }
  }
  recorder = null
  media?.getTracks().forEach((track) => track.stop())
  media = null
  micEl.classList.remove('live')
}

async function flushAudio(): Promise<void> {
  recording = false
  if (!recorder && chunks.length === 0) return

  await new Promise<void>((resolve) => {
    if (!recorder || recorder.state === 'inactive') {
      resolve()
      return
    }
    recorder.addEventListener('stop', () => resolve(), { once: true })
    recorder.stop()
  })

  media?.getTracks().forEach((track) => track.stop())
  media = null
  recorder = null
  micEl.classList.remove('live')

  if (!chunks.length) return
  const blob = new Blob(chunks, { type: 'audio/webm' })
  const base64 = toBase64(await blob.arrayBuffer())
  chunks = []
  await window.digest.sendOverlayAudio({ mimeType: blob.type || 'audio/webm', base64 })
}

window.digest.onOverlayUpdated((state) => {
  errorEl.textContent = state.error ?? ''
  if (state.phase === 'listening' && state.visible) {
    phaseEl.textContent = 'Listening…'
    void startRecording()
  } else if (state.phase === 'transcribing') {
    phaseEl.textContent = 'Transcribing…'
    stopRecording()
  } else if (!state.visible) {
    stopRecording()
    chunks = []
  }
})

confirmBtn.addEventListener('click', async () => {
  await flushAudio()
  await window.digest.confirmOverlay()
})

cancelBtn.addEventListener('click', async () => {
  stopRecording()
  chunks = []
  await window.digest.cancelOverlay()
})

void window.digest.getOverlay().then((state) => {
  if (state.visible && state.phase === 'listening') void startRecording()
})
