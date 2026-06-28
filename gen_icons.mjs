#!/usr/bin/env node
/**
 * gen_icons.mjs — Generates PWA icons as SVG + PNG placeholder
 *
 * Run: node gen_icons.mjs
 * Outputs: icons/icon-192.png, icons/icon-512.png
 *
 * Requires: npm install sharp  (or use the SVG icon directly)
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const iconDir = join(__dir, 'icons');
mkdirSync(iconDir, { recursive: true });

// SVG icon: hammer & sickle on olive desk background
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#2b2e28"/>
  <rect x="${size*0.05}" y="${size*0.05}" width="${size*0.9}" height="${size*0.9}" fill="none" stroke="#6e6a55" stroke-width="${size*0.02}"/>
  <g transform="translate(${size/2},${size/2}) scale(${size/130})">
    <g fill="#8a2b22" transform="translate(-50,-50)">
      <path d="M72 18 q20 16 11 44 q-4 14 -18 21 l-6 -10 q11 -5 13 -16 q5 -18 -8 -30 z"/>
      <path d="M58 34 l10 10 -34 34 q-5 5 -11 0 q-5 -5 0 -11 z"/>
      <rect x="19" y="70" width="42" height="9" rx="2" transform="rotate(-45 40 74)"/>
      <polygon points="50,8 53,18 64,18 55,24 58,34 50,28 42,34 45,24 36,18 47,18"/>
    </g>
  </g>
  <text x="${size/2}" y="${size*0.88}" font-family="monospace" font-size="${size*0.09}" fill="#7a6f4e" text-anchor="middle" letter-spacing="2">МЯ</text>
</svg>`;

// Write SVG files
writeFileSync(join(iconDir, 'icon.svg'), svgIcon(512), 'utf8');
console.log('Wrote icons/icon.svg');

// Try to generate PNG with sharp
try {
  const { default: sharp } = await import('sharp');
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svgIcon(size)))
      .png()
      .toFile(join(iconDir, `icon-${size}.png`));
    console.log(`Wrote icons/icon-${size}.png`);
  }
} catch(e) {
  console.log('sharp not installed — writing SVG fallback PNGs (install sharp for real PNGs)');
  // Write minimal 1x1 placeholder PNGs so the manifest doesn't 404
  // (real icons need sharp or another PNG renderer)
  const placeholder = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  writeFileSync(join(iconDir, 'icon-192.png'), placeholder);
  writeFileSync(join(iconDir, 'icon-512.png'), placeholder);
  console.log('Wrote placeholder PNGs. Run: npm install sharp && node gen_icons.mjs for real icons.');
}
