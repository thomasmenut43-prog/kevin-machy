/**
 * shots.mjs — captures de contrôle. node scripts/shots.mjs [--mobile] [chemin…]
 * Attend que les révélations aient joué avant de photographier la page entière.
 */
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
const chemins = args.filter((a) => !a.startsWith('--'));
const pages = chemins.length ? chemins : ['/', '/mariage/', '/portrait/', '/studio-de-l-iris/', '/a-propos/', '/contact/'];

const OUT = path.resolve(import.meta.dirname, '..', '.cache', 'shots');
await mkdir(OUT, { recursive: true });

const navigateur = await chromium.launch();
const contexte = await navigateur.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'fr-FR',
});
const page = await contexte.newPage();

for (const chemin of pages) {
  await page.goto(`http://localhost:3000${chemin}`, { waitUntil: 'networkidle' });

  // Descendre pas à pas pour déclencher toutes les révélations, puis remonter.
  const hauteur = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < hauteur; y += 600) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  const nom = (chemin === '/' ? 'accueil' : chemin.replaceAll('/', '')) + (mobile ? '-mobile' : '');
  const brut = await page.screenshot({ fullPage: true });

  // Planche de lecture : la page réduite, découpée en colonnes juxtaposées.
  const LARGE = mobile ? 300 : 560;
  const HAUT = 1500;
  const reduit = await sharp(brut).resize({ width: LARGE }).png().toBuffer();
  const meta = await sharp(reduit).metadata();
  const colonnes = Math.max(1, Math.ceil(meta.height / HAUT));
  const morceaux = [];
  for (let i = 0; i < colonnes; i++) {
    const top = i * HAUT;
    const h = Math.min(HAUT, meta.height - top);
    morceaux.push({
      input: await sharp(reduit).extract({ left: 0, top, width: LARGE, height: h }).png().toBuffer(),
      left: i * (LARGE + 8),
      top: 0,
    });
  }
  await sharp({
    create: { width: colonnes * (LARGE + 8) - 8, height: HAUT, channels: 3, background: '#2a2a2e' },
  })
    .composite(morceaux)
    .jpeg({ quality: 78 })
    .toFile(path.join(OUT, `${nom}.jpg`));
  console.log(`${nom}.jpg — page ${hauteur}px, ${colonnes} colonnes`);
}

await navigateur.close();
