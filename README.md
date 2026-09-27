# Digest tray

Windows Electron app that lives in the system tray. You ask by voice or text for digests and topic summaries from a small set of public sites. It researches in the background, then notifies you when the answer is ready.

This repository is the v1 **scaffold**: tray + settings + chat shell, job pipeline, cache, OpenRouter stubs, a live arXiv adapter, and mock adapters for the other sources.

## What v1 covers

- System tray icon and menu: **Open**, **Settings**, **Quit**
- Chat window (history, digests, source chips, text ask)
- Settings window (OpenRouter key, hotkeys, sources, model ids)
- Hold-to-talk overlay stub (listening UI, mic capture when allowed)
- First launch opens Settings if no API key is saved
- Job pipeline: ask → tray “researching” → Windows notification → click focuses that digest
- Cache: raw pulls ~20 minutes, unread until opened, pin support, read digests expire after a day unless pinned

## Sources

| Source | v1 behavior |
| --- | --- |
| arXiv | Live public Atom API (`export.arxiv.org`) |
| X | Stub / mock data — **TODO** public search, no login |
| YC | Stub / mock data — **TODO** public pages, no login |
| YouTube | Stub / mock data — **TODO** public search, no login |

Signed-in feeds, OAuth, auto-watch monitors, local models, and Mac packaging are out of scope.

## Requirements

- Windows 10/11 for the intended tray / notification experience
- [Node.js 20+](https://nodejs.org/) and npm
- An [OpenRouter](https://openrouter.ai/) API key

You can install dependencies on other OSes. Dev on Linux/macOS may run, but this app is Windows-first.

## Install and run

```bash
npm install
npm run dev
```

`npm install` also writes tray/app icons under `resources/` (`postinstall`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Electron + Vite development |
| `npm run build` | Compile main/preload/renderer into `out/` |
| `npm run typecheck` | TypeScript checks |
| `npm run build:win` | Production build + Windows installer (`electron-builder --win`) |
| `npm start` / `npm run preview` | Run the production compile via electron-vite |

On Windows, after `npm run dev` you should see a tray icon. If no key is saved, Settings opens immediately.

## OpenRouter key

1. Create a key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Paste it in **Settings** and save
3. The key is stored with Electron `safeStorage` (Windows DPAPI / OS encryption) when available. If encryption is unavailable (some Linux dev machines), it falls back to `electron-store` in the user data directory — still not committed to git.

Never put the key in the repo, `.env` files that you commit, or screenshots.

## Models

Constants live in `src/shared/constants.ts` and can be overridden in Settings.

| Use | Default OpenRouter id | Notes |
| --- | --- | --- |
| Chat / summarize (“GPT-Luna”) | `openai/gpt-6-luna` | Current GPT-6 Luna slug (also `openai/gpt-5.6-luna`). Override if OpenRouter renames it. |
| Speech-to-text | `openai/whisper-large-v3-turbo` | Whisper Large V3 Turbo |

## Hotkeys (editable in Settings)

| Action | Default |
| --- | --- |
| Hold to talk | `Ctrl+Shift+Space` (`CommandOrControl+Shift+Space`) |
| Open chat | `Ctrl+Shift+D` |

Hold-to-talk in this scaffold is a **press / toggle stub**: Electron `globalShortcut` fires on press, not key-up. Press once to show the overlay, press again (or click Confirm) to submit. True hold-to-release would need a native key-up hook later.

## Example asks

- `what's new on arXiv about transformers`
- `summarize recent YC posts on AI agents` (uses YC stub data until that adapter is implemented)
- Tick **Fresh** in chat (or say “fresh” / “refresh”) to skip the raw-pull cache

## Known limitations

- X, YC, and YouTube adapters return labeled stub items; they do not scrape or call live APIs yet
- Hold-to-talk is not a true physical hold; overlay STT needs mic permission and a working OpenRouter key
- Summarization needs the OpenRouter key; if chat completion fails, the pipeline still stores a local fallback digest of source items
- Unread digests stay until opened or dismissed; pinned digests stay until unpinned; read unpinned digests drop after about a day
- Raw pulls cache for 20 minutes (within the brief’s 15–30 minute window)
- Mac / mobile packaging is not supported in v1
- Designed for a single running instance (second launch focuses the existing app)

## Project layout

```
src/main/          Electron main: tray, windows, hotkeys, IPC, secrets
src/preload/       contextBridge API
src/renderer/      Chat, Settings, overlay
src/services/      OpenRouter client, job pipeline helpers, cache, source adapters
src/shared/        Types and constants
```

## License

Private scaffold unless the repository owner adds a license file.
