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
  { name: 'home-hero-wide', profile: 'heroWide', src: R('km-wed-ceremonie-confettis.jpg') },
  { name: 'home-hero-tall', profile: 'heroTall', src: R('km-wed-engagement.jpg') },
  { name: 'home-collection-mariage', profile: 'tall', src: R('km-wed-mains-bouquet.jpg') },
  { name: 'home-collection-portrait', profile: 'tall', src: R('km-por-studio-bordeaux.jpg') },
  { name: 'home-collection-iris', profile: 'tall', src: R('km-iris-seul-bleu-or.jpg'), pos: 'centre' },
  { name: 'home-apropos', profile: 'tall', src: A('kevin-portrait.png'), pos: 'centre' },

  { name: 'home-selection-01', profile: 'wide', src: R('km-wed-couple-plage.jpg') },
  { name: 'home-selection-02', profile: 'tall', src: R('km-por-pois.jpg'), pos: 'centre' },
  { name: 'home-selection-03', profile: 'wide', src: R('km-wed-foret-dos.jpg') },
  { name: 'home-selection-04', profile: 'square', src: R('km-iris-duo-turquoise.jpg'), pos: 'centre' },
  { name: 'home-selection-05', profile: 'wide', src: R('km-wed-vin-honneur.jpg') },
  { name: 'home-selection-06', profile: 'tall', src: R('km-por-studio-nb.jpg') },
  { name: 'home-selection-07', profile: 'tall', src: R('km-wed-drone-escalier.jpg') },
  { name: 'home-selection-08', profile: 'wide', src: R('km-wed-chateau-jardin.jpg') },
  { name: 'home-selection-09', profile: 'tall', src: R('km-por-homme-chapeau.jpg') },
  { name: 'home-selection-10', profile: 'wide', src: R('km-wed-etincelles-nb.jpg') },
  { name: 'home-selection-11', profile: 'tall', src: R('km-por-duo-femmes.jpg') },
  { name: 'home-selection-12', profile: 'wide', src: R('km-iris-trio-bleu.jpg'), pos: 'centre' },

  // ————————————————————————————————— Mariage
  { name: 'mariage-hero-wide', profile: 'heroWide', src: R('km-wed-foret-dos.jpg') },
  { name: 'mariage-hero-tall', profile: 'heroTall', src: R('km-wed-mains-bouquet.jpg') },
  { name: 'mariage-approche', profile: 'tall', src: R('km-wed-engagement.jpg') },
  { name: 'mariage-silence', profile: 'heroWide', src: R('km-wed-ceremonie-confettis.jpg') },

  { name: 'mariage-jour-01', profile: 'tall', src: R('km-wed-famille-bouquet.webp') },
  { name: 'mariage-jour-02', profile: 'tall', src: R('km-wed-mariee-fauteuil.jpg') },
  { name: 'mariage-jour-03', profile: 'tall', src: R('km-wed-baiser-exterieur.jpg') },
  { name: 'mariage-jour-04', profile: 'tall', src: R('km-wed-decor-table.webp') },
  { name: 'mariage-jour-05', profile: 'tall', src: R('km-wed-vin-honneur.jpg') },
  { name: 'mariage-jour-06', profile: 'tall', src: R('km-wed-enfant-bouquet.webp') },
  { name: 'mariage-jour-07', profile: 'tall', src: R('km-wed-drone-escalier.jpg') },

  { name: 'mariage-galerie-01', profile: 'wide', src: R('km-wed-couple-plage.jpg') },
  { name: 'mariage-galerie-02', profile: 'tall', src: R('km-wed-mains-bouquet.jpg') },
  { name: 'mariage-galerie-03', profile: 'square', src: R('km-wed-fronts-fleurs.jpg') },
  { name: 'mariage-galerie-04', profile: 'wide', src: R('km-wed-porte-pierre.jpg') },
  { name: 'mariage-galerie-05', profile: 'tall', src: R('km-wed-engagement.jpg') },
  { name: 'mariage-galerie-06', profile: 'wide', src: R('km-wed-chateau-jardin.jpg') },
  { name: 'mariage-galerie-07', profile: 'square', src: R('km-wed-baiser-lunettes.jpg') },
  { name: 'mariage-galerie-08', profile: 'tall', src: R('km-wed-baiser-exterieur.jpg') },
  { name: 'mariage-galerie-09', profile: 'wide', src: R('km-wed-drone-coeur.jpg') },
  { name: 'mariage-galerie-10', profile: 'tall', src: R('km-wed-famille-bouquet.webp') },
  { name: 'mariage-galerie-11', profile: 'wide', src: R('km-wed-etincelles-nb.jpg') },
  { name: 'mariage-galerie-12', profile: 'square', src: R('km-wed-couple-plage-nb.jpg') },

  // ————————————————————————————————— Portrait
  { name: 'portrait-hero-wide', profile: 'heroWide', src: R('km-por-studio-rire.jpg'), pos: 'centre' },
  { name: 'portrait-hero-tall', profile: 'heroTall', src: R('km-por-studio-bordeaux.jpg') },
  { name: 'portrait-silence', profile: 'heroWide', src: R('km-por-studio-nb.jpg'), pos: 'centre' },
  { name: 'portrait-methode-01', profile: 'tall', src: R('km-por-studio-regard.jpg') },
  { name: 'portrait-methode-02', profile: 'tall', src: R('km-por-corpo-blanc.jpg') },
  { name: 'portrait-methode-03', profile: 'tall', src: R('km-por-duo-femmes.jpg') },
  { name: 'portrait-tirage', profile: 'wide', src: R('km-por-bebe.jpg'), pos: 'centre' },

  { name: 'portrait-galerie-01', profile: 'tall', src: R('km-por-corpo-rose.jpg') },
  { name: 'portrait-galerie-02', profile: 'tall', src: R('km-por-studio-nb.jpg') },
  { name: 'portrait-galerie-03', profile: 'tall', src: R('km-por-corpo-nb.jpg') },
  { name: 'portrait-galerie-04', profile: 'wide', src: R('km-por-studio-rire.jpg'), pos: 'centre' },
  { name: 'portrait-galerie-05', profile: 'tall', src: R('km-por-homme-nb.jpg') },
  { name: 'portrait-galerie-06', profile: 'tall', src: R('km-por-pois.jpg') },
  { name: 'portrait-galerie-07', profile: 'tall', src: R('km-por-homme-chapeau.jpg') },
  { name: 'portrait-galerie-08', profile: 'wide', src: R('km-por-bebe.jpg'), pos: 'centre' },
  { name: 'portrait-galerie-09', profile: 'tall', src: R('km-por-studio-yeux-baisses.jpg') },
  { name: 'portrait-galerie-10', profile: 'tall', src: R('km-por-fond-chaud.jpg') },

  // ————————————————————————————————— Studio de l'Iris
  { name: 'iris-hero-wide', profile: 'heroWide', src: R('km-iris-trio-bleu.jpg'), pos: 'centre' },
  { name: 'iris-hero-tall', profile: 'heroTall', src: R('km-iris-seul-bleu-or.jpg'), pos: 'centre' },
  { name: 'iris-oeuvre', profile: 'square', src: R('km-iris-seul-bleu-or.jpg'), pos: 'centre' },
  // L'iris au prénom incrusté illustre littéralement ce que promet la page :
  // « on peut y ajouter un prénom, un surnom, ou le nom de votre animal ».
  { name: 'iris-detail-01', profile: 'square', src: R('km-iris-orange-prenom.jpg'), pos: 'centre' },
  { name: 'iris-detail-02', profile: 'square', src: R('km-iris-duo-turquoise.jpg'), pos: 'centre' },
  { name: 'iris-detail-03', profile: 'square', src: R('km-iris-seul-bleu.png'), pos: 'centre' },
  { name: 'iris-detail-04', profile: 'square', src: R('km-iris-trio-bleu.jpg'), pos: 'centre' },
  { name: 'iris-detail-05', profile: 'square', src: R('km-iris-duo-splash.jpg'), pos: 'centre' },
  { name: 'iris-detail-06', profile: 'square', src: R('km-iris-duo-clair.jpg'), pos: 'centre' },
  { name: 'iris-duo', profile: 'wide', src: R('km-iris-duo-bleu-or.jpg'), pos: 'centre' },
  // Un iris humain et, à côté, un œil à pupille en fente horizontale — un
  // herbivore. C'est la seule photographie d'iris animal du lot, et elle montre
  // en plus l'appairage que la page vend : « seul, en couple, en famille — ou
  // avec votre animal ».
  { name: 'iris-animal-01', profile: 'square', src: R('km-iris-humain-et-animal.jpeg'), pos: 'centre' },
  // Il en faudrait une seconde. Plutôt qu'un iris humain présenté pour ce qu'il
  // n'est pas, l'emplacement reste un cadre nommé. Voir assets.md.
  { name: 'iris-animal-02', profile: 'square', src: null },
  // Les deux panoramiques sont précisément des tirages sur aluminium : ils
  // illustrent le support, pas l'iris.
  { name: 'iris-support-tableau', profile: 'wide', src: R('km-iris-quatuor-pano.jpg'), pos: 'centre' },
  // Aucune photographie de bijou disponible — emplacement laissé vide, voir assets.md.
  { name: 'iris-support-bijou', profile: 'square', src: null },

  // ————————————————————————————————— À propos
  { name: 'apropos-portrait', profile: 'portraitBook', src: A('kevin-portrait.png'), pos: 'centre' },
  { name: 'apropos-travail', profile: 'wide', src: R('km-kevin-appareil.jpeg'), pos: 'centre' },
  { name: 'apropos-silence', profile: 'heroWide', src: R('km-kevin-groupe.jpg') },

  // ————————————————————————————————— Contact
  // Aucune vue de l'atelier n'a été fournie — cadre nommé, voir assets.md.
  { name: 'contact-studio', profile: 'wide', src: null },
];

/** Images Open Graph : format fixe 1200 × 630, JPEG seul. */
const OG = [
  { name: 'og-default', src: R('km-wed-ceremonie-confettis.jpg') },
  { name: 'og-mariage', src: R('km-wed-foret-dos.jpg') },
  { name: 'og-portrait', src: R('km-por-studio-rire.jpg') },
  { name: 'og-iris', src: R('km-iris-trio-bleu.jpg') },
  { name: 'og-apropos', src: A('kevin-portrait.png') },
  { name: 'og-contact', src: R('km-wed-chateau-jardin.jpg') },
];

const QUALITY = { avif: 52, webp: 74, jpeg: 78 };

async function emit(slot) {
  const { ratio, widths } = PROFILES[slot.profile];
  const position = slot.pos === 'centre' ? sharp.gravity.centre : sharp.strategy.attention;

  if (!slot.src || !existsSync(slot.src)) {
    return { name: slot.name, ratio, missing: true, widths: [], base: null };
  }

  // Ne jamais fabriquer plus grand que la source.
  //
  // `sharp` agrandit sans rien dire : une image de 1600 px demandée en 2560
  // sort molle, et le site d'un photographe est le dernier endroit où se le
  // permettre. On calcule donc ce que la source peut honnêtement donner une
  // fois recadrée au ratio, et on s'arrête là.
  //
  // Le manifeste ne déclare alors que les largeurs réellement produites, donc
  // le `srcset` aussi : le navigateur choisit parmi ce qui existe, et la plus
  // grande reste nette. Une galerie un peu moins définie vaut mieux qu'une
  // galerie floue.
  const source = await sharp(slot.src).metadata();
  const plafond = Math.min(source.width, Math.round(source.height * ratio));
  const possibles = widths.filter((w) => w <= plafond);
  // Une source minuscule ne doit pas rendre l'emplacement vide : on garde la
  // plus petite largeur et on l'annonce.
  const retenues = possibles.length ? possibles : [widths[0]];
  if (retenues.length < widths.length) {
    const perdues = widths.filter((w) => !retenues.includes(w)).join(', ');
    console.warn(`  · ${slot.name} : source trop petite, largeurs écartées — ${perdues}`);
  }

  for (const w of retenues) {
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
  return { name: slot.name, ratio, missing: false, widths: retenues, base: `/img/${slot.name}` };
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
