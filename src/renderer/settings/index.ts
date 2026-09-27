import '../styles/shared.css'
import './settings.css'

const apiKey = document.querySelector('#api-key') as HTMLInputElement
const keyStatus = document.querySelector('#key-status') as HTMLElement
const saveKey = document.querySelector('#save-key') as HTMLButtonElement
const clearKey = document.querySelector('#clear-key') as HTMLButtonElement
const holdHotkey = document.querySelector('#hold-hotkey') as HTMLInputElement
const openHotkey = document.querySelector('#open-hotkey') as HTMLInputElement
const srcX = document.querySelector('#src-x') as HTMLInputElement
const srcYc = document.querySelector('#src-yc') as HTMLInputElement
const srcYoutube = document.querySelector('#src-youtube') as HTMLInputElement
const srcArxiv = document.querySelector('#src-arxiv') as HTMLInputElement
const chatModel = document.querySelector('#chat-model') as HTMLInputElement
const sttModel = document.querySelector('#stt-model') as HTMLInputElement
const form = document.querySelector('#settings-form') as HTMLFormElement
const saveStatus = document.querySelector('#save-status') as HTMLElement

async function load(): Promise<void> {
  const settings = await window.digest.getSettings()
  keyStatus.textContent = settings.hasApiKey
    ? 'A key is saved on this machine.'
    : 'No key saved — paste one to enable chat, STT, and hotkeys.'
  apiKey.placeholder = settings.hasApiKey ? '••••••••  (saved)' : 'sk-or-…'
  holdHotkey.value = settings.hotkeys.holdToTalk
  openHotkey.value = settings.hotkeys.openChat
  srcX.checked = settings.sources.x
  srcYc.checked = settings.sources.yc
  srcYoutube.checked = settings.sources.youtube
  srcArxiv.checked = settings.sources.arxiv
  chatModel.value = settings.models.chat
  sttModel.value = settings.models.stt
}

saveKey.addEventListener('click', async () => {
  const result = await window.digest.setApiKey(apiKey.value)
  saveStatus.textContent = result.ok ? 'Key saved.' : result.error || 'Could not save key.'
  if (result.ok) {
    apiKey.value = ''
    await load()
  }
})

clearKey.addEventListener('click', async () => {
  await window.digest.clearApiKey()
  saveStatus.textContent = 'Key removed.'
  await load()
})

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  await window.digest.saveSettings({
    hotkeys: {
      holdToTalk: holdHotkey.value.trim(),
      openChat: openHotkey.value.trim()
    },
    sources: {
      x: srcX.checked,
      yc: srcYc.checked,
      youtube: srcYoutube.checked,
      arxiv: srcArxiv.checked
    },
    models: {
      chat: chatModel.value.trim(),
      stt: sttModel.value.trim()
    }
  })
  if (apiKey.value.trim()) {
    await window.digest.setApiKey(apiKey.value)
    apiKey.value = ''
  }
  saveStatus.textContent = 'Settings saved.'
  await load()
})

void load()
