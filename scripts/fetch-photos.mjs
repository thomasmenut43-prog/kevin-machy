/**
 * fetch-photos.mjs — récupération d'images de substitution (Pexels, licence libre).
 *
 * ATTENTION : ces images ne sont PAS le travail de Kevin Machy.
 * Elles occupent les emplacements en attendant sa sélection. Voir assets.md.
 *
 * Usage : npm run photos
 */

import { mkdir, writeFile, readdir, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.cache', 'raw');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Chaque entrée produit N fichiers `<slug>-01.jpg` … dans .cache/raw */
const QUERIES = [
  // — Mariage —
  { slug: 'wed-couple', q: 'wedding couple', orientation: 'landscape', n: 10 },
  { slug: 'wed-couple-p', q: 'bride and groom', orientation: 'portrait', n: 8 },
  { slug: 'wed-ceremony', q: 'wedding ceremony', orientation: 'landscape', n: 8 },
  { slug: 'wed-prep', q: 'bride getting ready', orientation: 'portrait', n: 6 },
  { slug: 'wed-guests', q: 'wedding guests celebration', orientation: 'landscape', n: 6 },
  { slug: 'wed-party', q: 'wedding dance party night', orientation: 'landscape', n: 6 },
  { slug: 'wed-detail', q: 'wedding rings bouquet detail', orientation: 'square', n: 5 },
  { slug: 'wed-group', q: 'wedding group photo family', orientation: 'landscape', n: 4 },

  // — Portrait —
  { slug: 'por-studio', q: 'studio portrait dark background', orientation: 'portrait', n: 10 },
  { slug: 'por-bw', q: 'black and white portrait', orientation: 'portrait', n: 8 },
  { slug: 'por-outdoor', q: 'natural light portrait outdoor', orientation: 'portrait', n: 8 },
  { slug: 'por-couple', q: 'couple in love', orientation: 'portrait', n: 6 },
  { slug: 'por-family', q: 'family portrait together', orientation: 'landscape', n: 4 },

  // — Iris / macro —
  { slug: 'iris', q: 'eye iris macro', orientation: 'square', n: 10 },
  { slug: 'iris-close', q: 'human eye close up', orientation: 'landscape', n: 8 },
  { slug: 'iris-animal', q: 'cat eyes', orientation: 'square', n: 5 },
  { slug: 'iris-blue', q: 'blue eye', orientation: 'landscape', n: 6 },

  // — Entreprise / studio / matériel —
  { slug: 'corp-portrait', q: 'business portrait professional', orientation: 'portrait', n: 5 },
  { slug: 'corp-team', q: 'team at work office', orientation: 'landscape', n: 4 },
  { slug: 'studio', q: 'softbox lighting studio', orientation: 'landscape', n: 6 },
  { slug: 'studio2', q: 'camera equipment tripod', orientation: 'landscape', n: 5 },
  { slug: 'photographer', q: 'photographer holding camera', orientation: 'landscape', n: 5 },
  { slug: 'print', q: 'photo print frame wall', orientation: 'landscape', n: 4 },
];

async function searchIds({ q, orientation, n }) {
  const url = `https://www.pexels.com/search/${encodeURIComponent(q)}/?orientation=${orientation}`;
  // Node/undici est refusé par Pexels (403) ; curl passe.
  const { stdout: html } = await run(
    'curl',
    ['-sS', '-L', '--compressed', '-A', UA, '-H', 'Accept-Language: fr,en;q=0.9', url],
    { maxBuffer: 64 * 1024 * 1024 },
  );
  if (!html || html.length < 5000) throw new Error(`réponse vide sur « ${q} »`);

  // Les vignettes portent l'id dans l'URL CDN ; l'alt donne une description utilisable.
  const found = new Map();
  const re = /<img[^>]*?>/g;
  for (const tag of html.match(re) ?? []) {
    const id = tag.match(/images\.pexels\.com\/photos\/(\d+)\//)?.[1];
    if (!id || found.has(id)) continue;
    const alt = tag.match(/alt="([^"]*)"/)?.[1] ?? '';
    found.set(id, alt.replace(/\s+/g, ' ').trim());
  }
  return [...found.entries()].slice(0, n).map(([id, alt]) => ({ id, alt }));
}

async function download(id, dest) {
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=2560`;
  await run('curl', ['-sS', '-L', '--compressed', '-A', UA, '-o', dest, url], { maxBuffer: 1024 * 1024 });
  const { size } = await stat(dest);
  if (size < 20_000) throw new Error(`fichier suspect (${size} o)`);
  return size;
}

const credits = [];

await mkdir(RAW, { recursive: true });

for (const entry of QUERIES) {
  let items;
  try {
    items = await searchIds(entry);
  } catch (err) {
    console.error(`  ✗ ${entry.slug} — ${err.message}`);
    continue;
  }
  let ok = 0;
  for (const [i, item] of items.entries()) {
    const name = `${entry.slug}-${String(i + 1).padStart(2, '0')}.jpg`;
    const dest = path.join(RAW, name);
    if (existsSync(dest)) {
      ok++;
      credits.push({ file: name, id: item.id, alt: item.alt, source: `https://www.pexels.com/photo/${item.id}/` });
      continue;
    }
    try {
      await download(item.id, dest);
      ok++;
      credits.push({ file: name, id: item.id, alt: item.alt, source: `https://www.pexels.com/photo/${item.id}/` });
    } catch (err) {
      console.error(`  ✗ ${name} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(`  ${ok}/${entry.n}  ${entry.slug}  « ${entry.q} »`);
}

await writeFile(path.join(ROOT, '.cache', 'credits.json'), JSON.stringify(credits, null, 2));

const files = await readdir(RAW);
let bytes = 0;
for (const f of files) bytes += (await stat(path.join(RAW, f))).size;
console.log(`\n${files.length} fichiers, ${(bytes / 1e6).toFixed(1)} Mo dans .cache/raw`);
