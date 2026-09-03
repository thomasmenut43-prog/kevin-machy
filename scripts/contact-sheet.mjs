/** Planches-contact pour arbitrer la sélection. node scripts/contact-sheet.mjs */
import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.cache', 'raw');
const OUT = path.join(ROOT, '.cache', 'sheets');
await mkdir(OUT, { recursive: true });

const GROUPS = {
  mariage: /^wed-/,
  portrait: /^(por-|corp-)/,
  iris: /^iris/,
  divers: /^(studio|photographer|print)/,
};

const CELL = 260;
const COLS = 6;
const files = (await readdir(RAW)).filter((f) => f.endsWith('.jpg')).sort();

for (const [name, re] of Object.entries(GROUPS)) {
  const list = files.filter((f) => re.test(f));
  const rows = Math.ceil(list.length / COLS);
  const composites = [];
  for (const [i, f] of list.entries()) {
    const cell = await sharp(path.join(RAW, f))
      .resize(CELL, CELL, { fit: 'cover' })
      .composite([
        {
          input: Buffer.from(
            `<svg width="${CELL}" height="${CELL}"><rect x="0" y="${CELL - 26}" width="${CELL}" height="26" fill="#000" opacity="0.72"/><text x="8" y="${CELL - 8}" font-family="monospace" font-size="15" fill="#fff">${f.replace('.jpg', '')}</text></svg>`,
          ),
          top: 0,
          left: 0,
        },
      ])
      .toBuffer();
    composites.push({ input: cell, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL });
  }
  await sharp({
    create: { width: COLS * CELL, height: rows * CELL, channels: 3, background: '#111' },
  })
    .composite(composites)
    .jpeg({ quality: 72 })
    .toFile(path.join(OUT, `${name}.jpg`));
  console.log(`${name}: ${list.length} images`);
}
