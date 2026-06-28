# МИНИСТЕРСТВО ЯЗЫКОВОГО ПРОСВЕЩЕНИЯ · ОТДЕЛ ВОССТАНОВЛЕНИЯ

A single-file installable PWA for relearning Russian by the Pimsleur method, skinned as a Soviet-era language ministry. Audio-first, produce-before-reveal recall on a graduated spaced-repetition ladder.

---

## Install on iPhone (required for full PWA experience)

1. Open the GitHub Pages URL **in Safari** (not Chrome)
2. Tap the Share button (□↑)
3. Tap **"Add to Home Screen"**
4. Tap Add — the app installs with its own icon

> Chrome on iOS cannot install PWAs. Safari only.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app — drill loop, IndexedDB storage, Soviet UI |
| `manifest.json` | PWA manifest — makes it installable |
| `sw.js` | Service worker — cache-first offline support |
| `deck.json` | 10 seed cards loaded on first run |
| `gen_audio.mjs` | Offline script: generate TTS audio from your deck |
| `gen_icons.mjs` | Generate PWA icons (requires `sharp`) |
| `fonts/` | Self-hosted Handjet + IBM Plex Mono (Cyrillic) |
| `icons/` | PWA home-screen icons |

---

## The Drill Loop (Pimsleur method)

Each card runs four phases:

**en2ru (production — default):**
1. **PROMPT** — English shown. Russian hidden.
2. **GAP** — Countdown timer. Say the Russian aloud.
3. **REVEAL** — Stress-marked Russian + transliteration shown. Audio plays.
4. **GRADE** — Three stamps advance the spaced-repetition ladder.

**ru2en (comprehension):**
1. **PROMPT** — Russian audio plays. Text hidden.
2. **GAP** — Say the English aloud.
3. **REVEAL** — English + Russian shown.
4. **GRADE** — As above.

Tap the obscured answer during the gap to skip early.

**Backward buildup:** Cards with `chunks[]` play each chunk from last to first, then the full phrase — the Pimsleur long-sentence drill.

---

## Spaced Repetition Ladder

10 rungs: 30s · 2m · 10m · 1h · 5h · 1d · 3d · 7d · 21d · 60d

- **ОДОБРЕНО** → rung +1
- **НА ПЕРЕСМОТР** → rung unchanged
- **ОТКАЗАНО** → rung −2, re-shows in 30s

---

## Adding Cards

**In the app:** ПОДАТЬ tab → fill fields or paste a pipe-delimited row:
```
English phrase | Ру́сская фра́за | Rússkaya fráza
```

**Bulk import:** export a deck JSON from another device, import via ДОСЬЕ tab.

### Card format (deck.json)

```json
{
  "id": "0001",
  "en": "Hello",
  "ru": "Приве́т",
  "translit": "Privét",
  "case_note": "ИМ. ПАДЕЖ",
  "aspect_note": "НЕСОВ. ВИД",
  "direction": "en2ru",
  "gap_seconds": 6,
  "chunks": [],
  "rung": 0,
  "due": 0,
  "created": 0,
  "lastReviewed": 0
}
```

Use U+0301 combining acute accent for stress marks in `ru` (e.g. `е́`). The audio pipeline strips these before synthesis.

---

## Audio Generation

The app falls back to Web Speech API (`ru-RU`) by default. For pre-generated audio:

1. Get a [Google Cloud TTS API key](https://console.cloud.google.com/apis/credentials) (free tier covers thousands of cards)
2. Run the generator:
   ```bash
   node gen_audio.mjs --key YOUR_API_KEY --deck deck.json --out audio_pack.json
   ```
3. In the app: ПОДАТЬ → ИМПОРТ АУДИО → select `audio_pack.json`

Optional flags: `--voice ru-RU-Chirp3-HD-Aoede` (best quality), `--rate 0.85`

**iOS Web Speech:** requires Russian voice installed under  
Settings → Accessibility → Spoken Content → Voices → Russian

---

## Data Safety

- All data lives in **IndexedDB** on-device — no backend, no account.
- iOS may evict storage under disk pressure. Use **ДОСЬЕ → ЭКСПОРТ** regularly.
- Export includes cards + optionally audio blobs (base64).
- Import merges by `id` (last-write-wins).

---

## Deploy to GitHub Pages

1. Push to `main` (or `gh-pages`)
2. Settings → Pages → serve from root
3. HTTPS is automatic — required for PWA install and Web Speech API

---

## iOS Notes

- Audio is gesture-gated on iOS: tap **ЗАСТУПИТЬ НА ПОСТ** to unlock audio for the session.
- Screen stays awake during sessions via Wake Lock API (partial iOS support).
- IndexedDB persists across sessions but can be cleared by Safari's "Clear History and Website Data".
- Backgrounded audio pauses on iOS — keep the screen on during drills.
