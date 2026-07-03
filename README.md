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
| `fonts/` | Self-hosted Stalinist One + PT Sans / PT Sans Narrow (Cyrillic + Latin) |
| `icons/` | PWA home-screen icons |

---

## The Drill Loop (Pimsleur method)

A lesson (СМЕНА) is a **bounded sitting**: up to 4 new cards mixed with due reviews, capped at ~30 presentations, with a clear start (ЗАСТУПИТЬ НА ПОСТ — also unlocks iOS audio) and a lesson-complete stamp at the end.

Each presentation runs ear-first, text hidden by default:

1. **PROMPT** — new/comprehension cards: Russian audio plays, no text. Production cards: English shown.
2. **GAP** — enforced anticipation beat with countdown. Produce the answer aloud. A cue tone marks "produce now"; tap to skip early.
3. **CONFIRM** — Russian audio plays. Text stays hidden (ПОКАЗАТЬ ТЕКСТ reveals it).
4. **ECHO** — a second short beat to repeat aloud, then one replay.
5. **GRADE** — three stamps; grading never stalls the flow.

**Graduated introduction:** a brand-new card enters in *comprehension* (hear Russian → grasp meaning). After a clean hit it flips to *production* (English → produce Russian). Tracked per card as `intro_state: new → comprehension → production`.

**Intra-lesson graduated recall:** separate from the ladder, new or missed cards re-surface *within the same lesson* at expanding spacings — after 1, 3, 7, then 15 intervening items. The ladder decides what is due today; this scheduler decides ordering within the sitting.

**Backward buildup:** Cards with `chunks[]` play each chunk from last to first with echo pauses — the Pimsleur long-sentence drill.

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

Any audio source can drive the deck through one provider interface; **Google Chirp 3: HD** Russian is the primary one. Clips are generated once, cached in IndexedDB, and never re-synthesized at review time. Missing clips fall back to Web Speech (`ru-RU`).

**Offline generator (preferred):**

1. Get a [Google Cloud TTS API key](https://console.cloud.google.com/apis/credentials)
2. List live Chirp 3 HD voices, then generate:
   ```bash
   GOOGLE_TTS_API_KEY=... node gen_audio.mjs --list-voices
   GOOGLE_TTS_API_KEY=... node gen_audio.mjs --voice ru-RU-Chirp3-HD-Aoede
   ```
3. In the app: ПОДАТЬ → ИМПОРТ АУДИО → select `audio_pack.json`

Flags: `--provider google-chirp3hd | google-wavenet` (azure/polly are stubs), `--deck`, `--out`, `--voice`. The key is read from the environment only — never committed, never shipped in the bundle. Note Chirp 3 HD takes plain text only (no SSML) and ignores rate/pitch; pacing comes from the app's gap timing.

**In-app synth (backup):** ДОСЬЕ → ЗВУКОЗАПИСЬ — pick a provider, paste a key (stored only in on-device localStorage, at your own risk), load the live voice list, and synthesize clips for cards missing audio.

**Stored clips:** open-licensed recordings (Tatoeba, Forvo) or tutor audio can be imported as an audio pack `{ "<id>_a": "<base64>" }` keyed by card id.

**iOS Web Speech fallback:** requires a Russian voice installed under  
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
