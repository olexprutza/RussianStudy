#!/usr/bin/env node
/**
 * gen_audio.mjs — Offline audio generation script
 *
 * Usage:
 *   node gen_audio.mjs --key YOUR_GOOGLE_TTS_KEY [--deck deck.json] [--out audio_pack.json]
 *
 * Reads deck.json, synthesizes each Russian phrase via Google Cloud TTS,
 * and outputs an audio pack JSON: { key: base64_mp3 }
 *
 * The app imports this pack via the "ИМПОРТ АУДИО" button.
 *
 * Google Cloud TTS free tier: 1 million chars/month (WaveNet: 1M chars free)
 * Sign up: https://cloud.google.com/text-to-speech
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ── Parse args ─────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag, def) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : def;
}

const API_KEY   = getArg('--key', process.env.GOOGLE_TTS_KEY || '');
const DECK_FILE = getArg('--deck', join(__dir, 'deck.json'));
const OUT_FILE  = getArg('--out',  join(__dir, 'audio_pack.json'));
const VOICE     = getArg('--voice', 'ru-RU-Neural2-A'); // or ru-RU-Chirp3-HD-Aoede
const RATE      = parseFloat(getArg('--rate', '0.85')); // speaking rate

if (!API_KEY) {
  console.error('ERROR: No Google TTS API key. Pass --key KEY or set GOOGLE_TTS_KEY env var.');
  console.error('Get a key: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

if (!existsSync(DECK_FILE)) {
  console.error('ERROR: deck.json not found at', DECK_FILE);
  process.exit(1);
}

const deck = JSON.parse(readFileSync(DECK_FILE, 'utf8'));
console.log(`Loaded ${deck.length} cards from ${DECK_FILE}`);

// ── Strip combining acute accents before TTS ───────────────
function stripAccents(str) {
  // Remove U+0301 combining acute accent
  return str.replace(/́/g, '').normalize('NFC');
}

// ── Google Cloud TTS request ───────────────────────────────
async function synthesize(text, key) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;
  const body = {
    input:  { text },
    voice:  { languageCode: 'ru-RU', name: VOICE },
    audioConfig: {
      audioEncoding:   'MP3',
      speakingRate:    RATE,
      effectsProfileId: ['handset-class-device'],
    }
  };

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.audioContent; // base64 MP3
}

// ── Sleep helper for rate-limiting ─────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ───────────────────────────────────────────────────
async function main() {
  const pack  = {};
  let   total = 0;
  let   done  = 0;
  let   errors = 0;

  // Count total clips to synthesize
  for (const card of deck) {
    total++; // _a clip (answer)
    if (card.direction === 'ru2en') total++; // _p clip (prompt)
    if (card.chunks) total += card.chunks.length;
  }
  console.log(`Synthesizing ${total} audio clips...`);

  for (const card of deck) {
    const ruClean = stripAccents(card.ru);

    // Answer clip (always)
    try {
      process.stdout.write(`  [${card.id}] answer... `);
      pack[card.id + '_a'] = await synthesize(ruClean, API_KEY);
      done++;
      console.log('OK');
    } catch(e) {
      errors++;
      console.error('FAILED:', e.message);
    }
    await sleep(110); // ~9 req/s to stay under quota

    // Prompt clip (ru2en cards only — separate clip for the Russian prompt)
    if (card.direction === 'ru2en') {
      try {
        process.stdout.write(`  [${card.id}] prompt... `);
        pack[card.id + '_p'] = await synthesize(ruClean, API_KEY);
        done++;
        console.log('OK');
      } catch(e) {
        errors++;
        console.error('FAILED:', e.message);
      }
      await sleep(110);
    }

    // Chunk clips for backward buildup
    if (card.chunks && card.chunks.length > 0) {
      for (let i = 0; i < card.chunks.length; i++) {
        const chunkClean = stripAccents(card.chunks[i]);
        try {
          process.stdout.write(`  [${card.id}] chunk${i}... `);
          pack[card.id + '_c' + i] = await synthesize(chunkClean, API_KEY);
          done++;
          console.log('OK');
        } catch(e) {
          errors++;
          console.error('FAILED:', e.message);
        }
        await sleep(110);
      }
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(pack), 'utf8');
  console.log(`\nDone: ${done}/${total} clips synthesized, ${errors} errors.`);
  console.log(`Audio pack written to ${OUT_FILE}`);
  console.log('\nImport into the app: ДОСЬЕ → ИМПОРТ АУДИО → select', OUT_FILE);
}

main().catch(e => { console.error(e); process.exit(1); });
