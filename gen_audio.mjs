#!/usr/bin/env node
// gen_audio.mjs — offline audio pack generator for russian_drill
//
// Pluggable provider architecture. Default provider is Google Chirp 3: HD.
// Synthesis happens HERE, once — the app only plays cached blobs at review time.
//
// Usage:
//   GOOGLE_TTS_API_KEY=... node gen_audio.mjs [--deck deck.json] [--out audio_pack.json]
//                          [--provider google-chirp3hd] [--voice ru-RU-Chirp3-HD-<Name>]
//   node gen_audio.mjs --list-voices          # enumerate live ru-RU voices for the provider
//
// Output pack format (unchanged): { "<key>": "<base64 audio>" , ... }
//   keys: <id>_a (answer ru), <id>_p (prompt ru, ru2en cards), <id>_c<i> (chunks)
// Import into the app via ПОДАТЬ → ИМПОРТ АУДИО.
//
// The API key is read from the environment only. Never commit it or ship it
// in the deployed bundle.

import { readFileSync, writeFileSync } from 'node:fs';

// ── CLI ────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, dflt) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
}
const LIST_VOICES = args.includes('--list-voices');
const DECK_PATH   = flag('deck', 'deck.json');
const OUT_PATH    = flag('out', 'audio_pack.json');
const PROVIDER_ID = flag('provider', 'google-chirp3hd');
const VOICE       = flag('voice', null);   // null → auto-pick first matching voice
const LANG        = 'ru-RU';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const stripAccents = s => s.replace(/́/g, '');

// ── PROVIDER INTERFACE ─────────────────────────────────────
// Provider = {
//   id, label,
//   listVoices(langCode) -> [{ name, gender }],
//   synth(text, { voice, format }) -> Buffer   (one utterance)
// }

function googleProvider(id, label, nameFilter) {
  const key = () => {
    const k = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_TTS_KEY;
    if (!k) { console.error('Set GOOGLE_TTS_API_KEY in the environment.'); process.exit(1); }
    return k;
  };
  return {
    id, label,
    async listVoices(langCode = LANG) {
      const r = await fetch(
        `https://texttospeech.googleapis.com/v1/voices?languageCode=${langCode}&key=${key()}`);
      if (!r.ok) throw new Error(`voices ${r.status}: ${await r.text()}`);
      const { voices = [] } = await r.json();
      return voices
        .filter(v => nameFilter(v.name))
        .map(v => ({ name: v.name, gender: v.ssmlGender }));
    },
    async synth(text, { voice, format = 'MP3' } = {}) {
      // Chirp 3 HD: plain text only (no SSML), speakingRate/pitch not honored.
      // Pacing comes from script wording and the app's own gap timing.
      const body = {
        input: { text },
        voice: { languageCode: LANG, name: voice },
        audioConfig: { audioEncoding: format }
      };
      const r = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key()}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`synth ${r.status}: ${await r.text()}`);
      const { audioContent } = await r.json();
      return Buffer.from(audioContent, 'base64');
    }
  };
}

const stubProvider = (id, label) => ({
  id, label,
  async listVoices() { throw new Error(`${label}: not implemented yet`); },
  async synth()      { throw new Error(`${label}: not implemented yet`); }
});

const PROVIDERS = {
  'google-chirp3hd': googleProvider('google-chirp3hd', 'Google Chirp 3: HD',
                                    n => n.includes('Chirp3-HD')),
  'google-wavenet':  googleProvider('google-wavenet', 'Google WaveNet/Neural2',
                                    n => /Wavenet|Neural2/.test(n)),
  'azure': stubProvider('azure', 'Azure Speech'),
  'polly': stubProvider('polly', 'Amazon Polly'),
  // 'stored': user-supplied clips (Tatoeba/Forvo/tutor recordings) are imported
  // directly through the app's ИМПОРТ АУДИО, keyed by card id — nothing to do here.
};

// ── MAIN ───────────────────────────────────────────────────
const provider = PROVIDERS[PROVIDER_ID];
if (!provider) {
  console.error(`Unknown provider "${PROVIDER_ID}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  process.exit(1);
}

if (LIST_VOICES) {
  const voices = await provider.listVoices(LANG);
  console.log(`${provider.label} — ${LANG} voices:`);
  for (const v of voices) console.log(`  ${v.name}  (${v.gender})`);
  process.exit(0);
}

let voice = VOICE;
if (!voice) {
  const voices = await provider.listVoices(LANG);
  if (!voices.length) { console.error('No voices available for ' + provider.label); process.exit(1); }
  voice = voices[0].name;
  console.log(`No --voice given; using ${voice}`);
}

const deckRaw = JSON.parse(readFileSync(DECK_PATH, 'utf8'));
const cards = Array.isArray(deckRaw) ? deckRaw : deckRaw.cards;
const pack = {};
let n = 0;

for (const card of cards) {
  const jobs = [];
  jobs.push([`${card.id}_a`, stripAccents(card.ru)]);
  if (card.direction === 'ru2en') jobs.push([`${card.id}_p`, stripAccents(card.ru)]);
  (card.chunks || []).forEach((c, i) => jobs.push([`${card.id}_c${i}`, stripAccents(c)]));

  for (const [key, text] of jobs) {
    process.stdout.write(`  ${key}  «${text}» ... `);
    try {
      const buf = await provider.synth(text, { voice });
      pack[key] = buf.toString('base64');
      n++;
      console.log(`${(buf.length / 1024).toFixed(1)} KB`);
    } catch (e) {
      console.log('FAILED: ' + e.message);
    }
    await sleep(110); // stay under ~9 req/s
  }
}

writeFileSync(OUT_PATH, JSON.stringify(pack));
console.log(`\nWrote ${n} clips → ${OUT_PATH}`);
console.log('Import in the app: ПОДАТЬ → ИМПОРТ АУДИО');
