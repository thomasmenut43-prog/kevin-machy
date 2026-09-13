/**
 * Relève les textes alternatifs écrits dans les six pages d'origine.
 *
 * Ils ont été rédigés un par un et décrivent ce qui se passe dans le cadre :
 * les perdre au passage dans l'éditeur serait une régression d'accessibilité et
 * de référencement. Ce script les extrait pour que l'import de la médiathèque
 * les reprenne tels quels.
 *
 *   node scripts/relever-alt.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Les pages, mais aussi lib/site.ts : le déroulé d'une journée de mariage y
// décrit ses images, et ces descriptions comptent autant que les autres.
const dossier = path.join(racine, 'app/(frontend)');

const MOTIFS = [
  // { name: 'x', alt: '…' } et { image: 'x', alt: '…' }
  /\b(?:name|image):\s*'([a-z0-9-]+)',\s*\n?\s*alt:\s*'((?:[^'\\]|\\.)*)'/g,
  // <Photo name="x" … alt="…" />, dans n'importe quel ordre
  /name="([a-z0-9-]+)"[\s\S]{0,240}?alt="([^"]+)"/g,
];

const alt = {};

const fichiers = [
  ...readdirSync(dossier, { recursive: true })
    .filter((n) => String(n).endsWith('.tsx'))
    .map((n) => path.join(dossier, String(n))),
  path.join(racine, 'lib/site.ts'),
];

for (const chemin of fichiers) {
  const texte = readFileSync(chemin, 'utf8');

  for (const motif of MOTIFS) {
    for (const m of texte.matchAll(motif)) alt[m[1]] = m[2];
  }

  // <Hero wide="x" tall="y" alt="…"> : les deux emplacements partagent la description.
  for (const m of texte.matchAll(/wide="([a-z0-9-]+)"\s*\n?\s*tall="([a-z0-9-]+)"\s*\n?\s*alt="([^"]+)"/g)) {
    alt[m[1]] = m[3];
    alt[m[2]] = m[3];
  }
}

const propre = Object.fromEntries(
  Object.entries(alt).map(([cle, valeur]) => [
    cle,
    valeur.replace(/\\'/g, "'").replace(/\s*\n\s*/g, ' ').trim(),
  ]),
);

writeFileSync(path.join(racine, 'scripts/alt-images.json'), `${JSON.stringify(propre, null, 2)}\n`);
console.log(`${Object.keys(propre).length} textes alternatifs relevés.`);
