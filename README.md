# Digest tray

Windows Electron app that lives in the system tray. You ask by voice or text for digests and topic summaries from a small set of public sites. It researches in the background, then notifies you when the answer is ready.

## What v1 covers

- System tray icon and menu: **Open**, **Settings**, **Quit**
- Chat window (history, digests, source chips, text ask)
- Settings window (OpenRouter key, hotkeys, sources, model ids)
- Hold-to-talk overlay stub (listening UI, mic capture when allowed)
- First launch opens Settings if no API key is saved
- Job pipeline: ask → tray “researching” → Windows notification → click focuses that digest
- Cache: raw pulls ~20 minutes, unread until opened, pin support, read digests expire after a day unless pinned
- Live public source adapters (no OAuth / no login)

## Sources

All adapters are public-only. If one source fails, the others still return and the digest notes the failure.

| Source | How it pulls | Auth | Fragility / limits |
| --- | --- | --- | --- |
| **arXiv** | Official Atom API `export.arxiv.org/api/query` | None | Stable. Courtesy User-Agent; keep request volume low (cache already 20 min). |
| **YC** | Official blog RSS `ycombinator.com/blog/rss` plus public launches JSON `GET /launches?query=` (`Accept: application/json`) | None | RSS is the stable feed. Launches JSON is the same unauthenticated payload the public launches page uses; undocumented and can change. Not Bookface, not signed-in jobs. |
| **YouTube** | Public InnerTube search `POST youtube.com/youtubei/v1/search` (same endpoint the website uses, no Data API key). Fallback: parse `ytInitialData` from `/results`. | None | Unofficial. Client version / HTML shape can change. IP rate limits or consent walls possible. Not subscriptions, not OAuth. Sorted by upload date when the public `sp=CAI=` param works. |
| **X** | **Not** X’s login-gated search (that redirects to onboarding). Public posts via [Google News RSS](https://news.google.com/rss/search?q=site:x.com) `site:x.com OR site:twitter.com`, then DuckDuckGo HTML search as fallback. | None | No official unauthenticated X search in 2026 (Nitter-style frontends are gone). Google News indexes public posts; item URLs are often News wrappers, not `x.com/status/…` permalinks. DDG HTML markup and anti-bot pages can break. Do not hammer these endpoints. |

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
| `npm run probe:adapters` | Hit public source endpoints (no Electron, no API key) |
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

Live adapter results are passed into this summarize path. If OpenRouter is down, the pipeline still stores a local fallback digest of the source items.

## Hotkeys (editable in Settings)

| Action | Default |
| --- | --- |
| Hold to talk | `Ctrl+Shift+Space` (`CommandOrControl+Shift+Space`) |
| Open chat | `Ctrl+Shift+D` |

Hold-to-talk in this scaffold is a **press / toggle stub**: Electron `globalShortcut` fires on press, not key-up. Press once to show the overlay, press again (or click Confirm) to submit. True hold-to-release would need a native key-up hook later.

## Example asks

- `what's new on arXiv about transformers`
- `summarize recent YC posts on AI agents`
- `what's new on YouTube about rust`
- `what's new on X about AI agents` (public indexed posts, not an X account timeline)

Tick **Fresh** in chat (or say “fresh” / “refresh”) to skip the raw-pull cache.

## Known limitations

- X has no usable official public search without login; we use Google News RSS of public posts. Permalinks may be News wrappers.
- YC launches JSON and YouTube InnerTube are public but unofficial — they can change without notice
- Hold-to-talk is not a true physical hold; overlay STT needs mic permission and a working OpenRouter key
- Summarization needs the OpenRouter key; source pulls do not
- Unread digests stay until opened or dismissed; pinned digests stay until unpinned; read unpinned digests drop after about a day
- Raw pulls cache for 20 minutes (within the brief’s 15–30 minute window). Be polite: one ask hits a handful of public URLs per enabled source.
- Mac / mobile packaging is not supported in v1
- Designed for a single running instance (second launch focuses the existing app)

## Project layout

```
src/main/          Electron main: tray, windows, hotkeys, IPC, secrets
src/preload/       contextBridge API
src/renderer/      Chat, Settings, overlay
src/services/      OpenRouter client, cache, source adapters
src/shared/        Types and constants
```

## License

Private scaffold unless the repository owner adds a license file.
