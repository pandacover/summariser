import type { OverlayState } from '../shared/types'
import { transcribeAudio } from '../services/openrouter/client'
import { appEvents } from './events'
import { submitAsk } from './pipeline'
import { hasApiKey } from './secrets'
import { hideOverlayWindow, openSettingsWindow, showOverlayWindow } from './windows'

let state: OverlayState = {
  visible: false,
  phase: 'idle',
  transcript: ''
}

let pendingAudio: { mimeType: string; bytes: Buffer } | null = null

export function getOverlayState(): OverlayState {
  return { ...state }
}

function setState(patch: Partial<OverlayState>): void {
  state = { ...state, ...patch }
  appEvents.overlayUpdated(getOverlayState())
}

export async function startHoldToTalk(): Promise<void> {
  if (!(await hasApiKey())) {
    openSettingsWindow()
    return
  }

  if (state.visible && state.phase === 'listening') {
    await confirmHoldToTalk()
    return
  }

  pendingAudio = null
  showOverlayWindow()
  setState({
    visible: true,
    phase: 'listening',
    transcript: '',
    error: undefined
  })
}

export function cancelHoldToTalk(): void {
  pendingAudio = null
  hideOverlayWindow()
  setState({
    visible: false,
    phase: 'idle',
    transcript: '',
    error: undefined
  })
}

export function receiveOverlayAudio(mimeType: string, base64: string): void {
  pendingAudio = {
    mimeType,
    bytes: Buffer.from(base64, 'base64')
  }
}

export async function confirmHoldToTalk(): Promise<void> {
  if (!state.visible) return

  setState({ phase: 'transcribing', error: undefined })

  try {
    let transcript = state.transcript.trim()
    if (!transcript && pendingAudio && pendingAudio.bytes.length > 0) {
      transcript = await transcribeAudio({
        mimeType: pendingAudio.mimeType,
        bytes: pendingAudio.bytes
      })
    }

    if (!transcript) {
      setState({
        phase: 'listening',
        error: 'No transcript yet. Allow the mic, speak, then Confirm — or type in Chat.'
      })
      return
    }

    hideOverlayWindow()
    setState({
      visible: false,
      phase: 'idle',
      transcript,
      error: undefined
    })
    pendingAudio = null
    submitAsk(transcript)
  } catch (error) {
    setState({
      phase: 'listening',
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
