/**
 * build-images.mjs — chaîne de production des images du site.
 *
 * Chaque emplacement du site est déclaré ci-dessous avec son ratio et ses largeurs.
 * Le script recadre, encode en AVIF + WebP + JPEG et écrit `lib/images.generated.ts`.
 *
 * Un emplacement dont la source est absente n'est PAS remplacé par un visuel générique :
 * il est marqué `missing` et le composant <Photo> affiche un cadre nommé. Voir assets.md.
 *
 * Usage : npm run images
 */

import sharp from 'sharp';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, '.cache', 'raw');
const OUT = path.join(ROOT, 'public', 'img');

/** Profils de sortie : ratio + largeurs générées. */
const PROFILES = {
  heroWide: { ratio: 16 / 9, widths: [960, 1440, 1920, 2560] },
  heroTall: { ratio: 3 / 4, widths: [640, 828, 1080, 1440] },
  wide: { ratio: 3 / 2, widths: [640, 960, 1280, 1920] },
  tall: { ratio: 4 / 5, widths: [480, 720, 960, 1280] },
  square: { ratio: 1, widths: [480, 720, 1080, 1440] },
  portraitBook: { ratio: 2 / 3, widths: [480, 720, 960, 1280] },
};

const R = (f) => path.join(RAW, f);
const A = (f) => path.join(ROOT, 'public', 'assets', f);

/**
 * Emplacements du site.
 * `src` : fichier source, ou null si l'image reste à fournir par Kevin.
 * `pos` : stratégie de recadrage sharp ('attention' par défaut).
 */
const SLOTS = [
  // ————————————————————————————————— Accueil
  { name: 'home-hero-wide', profile: 'heroWide', src: R('wed-guests-05.jpg') },
  { name: 'home-hero-tall', profile: 'heroTall', src: R('wed-party-01.jpg') },
  { name: 'home-collection-mariage', profile: 'tall', src: R('wed-couple-10.jpg') },
  { name: 'home-collection-portrait', profile: 'tall', src: R('por-studio-02.jpg') },
  { name: 'home-collection-iris', profile: 'tall', src: R('irisx-01.jpg'), pos: 'centre' },
  { name: 'home-apropos', profile: 'tall', src: A('kevin-portrait.png'), pos: 'centre' },

  { name: 'home-selection-01', profile: 'wide', src: R('wed-couple-07.jpg') },
  { name: 'home-selection-02', profile: 'tall', src: R('por-studio-05.jpg'), pos: 'centre' },
  { name: 'home-selection-03', profile: 'wide', src: R('wed-detail-04.jpg') },
  { name: 'home-selection-04', profile: 'square', src: R('iris-01.jpg'), pos: 'centre' },
  { name: 'home-selection-05', profile: 'wide', src: R('wed-party-02.jpg') },
  { name: 'home-selection-06', profile: 'tall', src: R('por-studio-04.jpg') },
  { name: 'home-selection-07', profile: 'tall', src: R('wed-prep-05.jpg') },
  { name: 'home-selection-08', profile: 'wide', src: R('wed-ceremony-03.jpg') },
  { name: 'home-selection-09', profile: 'tall', src: R('por-couple-03.jpg') },
  { name: 'home-selection-10', profile: 'wide', src: R('wed-couple-01.jpg') },
  { name: 'home-selection-11', profile: 'tall', src: R('irisy-01.jpg') },
  { name: 'home-selection-12', profile: 'wide', src: R('dark3-01.jpg'), pos: 'centre' },

  // ————————————————————————————————— Mariage
  { name: 'mariage-hero-wide', profile: 'heroWide', src: R('wed-couple-01.jpg') },
  { name: 'mariage-hero-tall', profile: 'heroTall', src: R('wed-couple-p-08.jpg') },
  { name: 'mariage-approche', profile: 'tall', src: R('wed-couple-10.jpg') },
  { name: 'mariage-silence', profile: 'heroWide', src: R('wed-ceremony-03.jpg') },

  { name: 'mariage-jour-01', profile: 'tall', src: R('wed-prep-05.jpg') },
  { name: 'mariage-jour-02', profile: 'tall', src: R('wed-ceremony-08.jpg') },
  { name: 'mariage-jour-03', profile: 'tall', src: R('wed-couple-p-03.jpg') },
  { name: 'mariage-jour-04', profile: 'tall', src: R('wed-couple-05.jpg') },
  { name: 'mariage-jour-05', profile: 'tall', src: R('wed-guests-02.jpg') },
  { name: 'mariage-jour-06', profile: 'tall', src: R('wed-guests-01.jpg') },
  { name: 'mariage-jour-07', profile: 'tall', src: R('wed-party-02.jpg') },

  { name: 'mariage-galerie-01', profile: 'wide', src: R('wed-couple-07.jpg') },
  { name: 'mariage-galerie-02', profile: 'tall', src: R('wed-couple-p-01.jpg') },
  { name: 'mariage-galerie-03', profile: 'square', src: R('wed-detail-02.jpg') },
  { name: 'mariage-galerie-04', profile: 'wide', src: R('wed-couple-06.jpg') },
  { name: 'mariage-galerie-05', profile: 'tall', src: R('wed-prep-01.jpg') },
  { name: 'mariage-galerie-06', profile: 'wide', src: R('wed-couple-03.jpg') },
  { name: 'mariage-galerie-07', profile: 'square', src: R('wed-detail-01.jpg') },
  { name: 'mariage-galerie-08', profile: 'tall', src: R('wed-couple-p-04.jpg') },
  { name: 'mariage-galerie-09', profile: 'wide', src: R('wed-guests-05.jpg') },
  { name: 'mariage-galerie-10', profile: 'tall', src: R('wed-prep-02.jpg') },
  { name: 'mariage-galerie-11', profile: 'wide', src: R('wed-prep-06.jpg') },
  { name: 'mariage-galerie-12', profile: 'square', src: R('wed-detail-05.jpg') },

  // ————————————————————————————————— Portrait
  { name: 'portrait-hero-wide', profile: 'heroWide', src: R('por-studio-05.jpg'), pos: 'centre' },
  { name: 'portrait-hero-tall', profile: 'heroTall', src: R('por-studio-04.jpg') },
  { name: 'portrait-silence', profile: 'heroWide', src: R('dark-01.jpg'), pos: 'centre' },
  { name: 'portrait-methode-01', profile: 'tall', src: R('por-studio-02.jpg') },
  { name: 'portrait-methode-02', profile: 'tall', src: R('por-outdoor-02.jpg') },
  { name: 'portrait-methode-03', profile: 'tall', src: R('por-couple-04.jpg') },
  { name: 'portrait-tirage', profile: 'wide', src: R('print-02.jpg') },

  { name: 'portrait-galerie-01', profile: 'tall', src: R('corp-portrait-04.jpg') },
  { name: 'portrait-galerie-02', profile: 'tall', src: R('por-bw-03.jpg') },
  { name: 'portrait-galerie-03', profile: 'tall', src: R('por-couple-03.jpg') },
  { name: 'portrait-galerie-04', profile: 'wide', src: R('dark4-05.jpg') },
  { name: 'portrait-galerie-05', profile: 'tall', src: R('por-outdoor-03.jpg') },
  { name: 'portrait-galerie-06', profile: 'tall', src: R('dark5-07.jpg') },
  { name: 'portrait-galerie-07', profile: 'tall', src: R('dark4-01.jpg') },
  { name: 'portrait-galerie-08', profile: 'wide', src: R('por-family-03.jpg') },
  { name: 'portrait-galerie-09', profile: 'tall', src: R('dark5-08.jpg') },
  { name: 'portrait-galerie-10', profile: 'tall', src: R('dark2-06.jpg') },

  // ————————————————————————————————— Studio de l'Iris
  { name: 'iris-hero-wide', profile: 'heroWide', src: R('irisx-01.jpg'), pos: 'centre' },
  { name: 'iris-hero-tall', profile: 'heroTall', src: R('irisx-01.jpg'), pos: 'centre' },
  { name: 'iris-oeuvre', profile: 'square', src: R('irisx-01.jpg'), pos: 'centre' },
  { name: 'iris-detail-01', profile: 'square', src: R('iris-01.jpg'), pos: 'centre' },
  { name: 'iris-detail-02', profile: 'square', src: R('iris-04.jpg'), pos: 'centre' },
  { name: 'iris-detail-03', profile: 'square', src: R('irisw-05.jpg'), pos: 'centre' },
  { name: 'iris-detail-04', profile: 'square', src: R('irisy-01.jpg') },
  { name: 'iris-detail-05', profile: 'square', src: R('iris-08.jpg') },
  { name: 'iris-detail-06', profile: 'square', src: R('irisw-01.jpg') },
  { name: 'iris-duo', profile: 'wide', src: R('iris-close-03.jpg'), pos: 'centre' },
  { name: 'iris-animal-01', profile: 'square', src: R('iris-animal-04.jpg'), pos: 'centre' },
  { name: 'iris-animal-02', profile: 'square', src: R('iris-07.jpg'), pos: 'centre' },
  { name: 'iris-support-tableau', profile: 'wide', src: R('print-01.jpg') },
  // Aucune photographie de bijou disponible — emplacement laissé vide, voir assets.md.
  { name: 'iris-support-bijou', profile: 'square', src: null },

  // ————————————————————————————————— À propos
  { name: 'apropos-portrait', profile: 'portraitBook', src: A('kevin-portrait.png'), pos: 'centre' },
  { name: 'apropos-travail', profile: 'wide', src: R('photographer-01.jpg') },
  { name: 'apropos-silence', profile: 'heroWide', src: R('wed-party-02.jpg') },

  // ————————————————————————————————— Contact
  { name: 'contact-studio', profile: 'wide', src: R('studio-01.jpg'), pos: 'centre' },
];

/** Images Open Graph : format fixe 1200 × 630, JPEG seul. */
const OG = [
  { name: 'og-default', src: R('wed-guests-05.jpg') },
  { name: 'og-mariage', src: R('wed-couple-01.jpg') },
  { name: 'og-portrait', src: R('por-studio-04.jpg') },
  { name: 'og-iris', src: R('irisx-01.jpg') },
  { name: 'og-apropos', src: A('kevin-portrait.png') },
  { name: 'og-contact', src: R('studio-01.jpg') },
];

const QUALITY = { avif: 52, webp: 74, jpeg: 78 };

async function emit(slot) {
  const { ratio, widths } = PROFILES[slot.profile];
  const position = slot.pos === 'centre' ? sharp.gravity.centre : sharp.strategy.attention;

  if (!slot.src || !existsSync(slot.src)) {
    return { name: slot.name, ratio, missing: true, widths: [], base: null };
  }

  for (const w of widths) {
    const h = Math.round(w / ratio);
    const pipe = () => sharp(slot.src).rotate().resize(w, h, { fit: 'cover', position });
    await Promise.all([
      pipe().avif({ quality: QUALITY.avif, effort: 4 }).toFile(path.join(OUT, `${slot.name}-${w}.avif`)),
      pipe().webp({ quality: QUALITY.webp }).toFile(path.join(OUT, `${slot.name}-${w}.webp`)),
      pipe()
        .jpeg({ quality: QUALITY.jpeg, progressive: true, mozjpeg: true })
        .toFile(path.join(OUT, `${slot.name}-${w}.jpg`)),
    ]);
  }
  return { name: slot.name, ratio, missing: false, widths, base: `/img/${slot.name}` };
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const manifest = {};
let done = 0;
for (const slot of SLOTS) {
  const rec = await emit(slot);
  manifest[rec.name] = rec;
  done++;
  if (done % 10 === 0) console.log(`  ${done}/${SLOTS.length}`);
}

for (const og of OG) {
  if (!existsSync(og.src)) {
    console.warn(`  ! ${og.name} : source absente`);
    continue;
  }
  await sharp(og.src)
    .rotate()
    .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(path.join(OUT, `${og.name}.jpg`));
}

const missing = Object.values(manifest).filter((m) => m.missing);

const ts = `// Généré par scripts/build-images.mjs — ne pas modifier à la main.
export type ImageRecord = {
  readonly name: string;
  readonly ratio: number;
  readonly missing: boolean;
  readonly widths: readonly number[];
  readonly base: string | null;
};

export const IMAGES = ${JSON.stringify(manifest, null, 2)} as const satisfies Record<string, ImageRecord>;

export type ImageName = keyof typeof IMAGES;
`;
await mkdir(path.join(ROOT, 'lib'), { recursive: true });
await writeFile(path.join(ROOT, 'lib', 'images.generated.ts'), ts);

console.log(`\n${SLOTS.length} emplacements — ${missing.length} sans source :`);
for (const m of missing) console.log(`  · ${m.name}`);
