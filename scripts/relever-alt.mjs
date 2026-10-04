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

/**
 * Les emplacements dont la page vit en base, et pas dans le code.
 *
 * Ce script relève les textes alternatifs écrits dans les pages JSX. Les
 * prestations reprises de l'ancien site en octobre 2026 n'en ont pas : elles
 * sont nées directement dans l'éditeur, il n'y a aucun fichier à lire. Leurs
 * descriptions sont donc écrites ici.
 *
 * Elles s'inspirent de celles de l'ancien site, nettoyées : il y décrivait ses
 * images en empilant « photographe corporate Haute-Loire » dans la phrase. Un
 * texte alternatif sert d'abord à quelqu'un qui ne voit pas l'image ; bourré de
 * mots-clés, il ne sert plus personne.
 */
const SUPPLEMENTS = {
  'prestations-entreprise': 'Portrait d’une professionnelle réalisé en studio.',
  'prestations-drone': 'Vue aérienne d’un chantier prise au drone.',
  'prestations-photobooth': 'Des invités posant dans le photobooth pendant une soirée.',
  'prestations-formation': 'Participants photographiant en extérieur pendant un stage.',
  'prestations-tirages': 'Un voilier toutes voiles dehors, tirage d’art en série limitée.',

  'ent-hero-wide': 'Une vendeuse conseillant une cliente au rayon literie d’un magasin.',
  'ent-hero-tall': 'Une collaboratrice accueillant une cliente derrière son comptoir.',
  'ent-nb': 'Portrait d’entreprise en noir et blanc : une professionnelle assise, carnet ouvert.',
  'ent-equipe': 'Une équipe de six personnes photographiée ensemble dans ses locaux.',
  'ent-metier': 'Un audioprothésiste procédant à un réglage sur une patiente.',
  'ent-portrait': 'Portrait d’une professionnelle réalisé en studio au Puy-en-Velay.',
  'ent-magasin': 'Un vendeur bondissant au-dessus d’un matelas, bras écartés, dans son magasin.',
  'ent-accueil': 'Un collaborateur recevant une cliente à son poste de travail.',

  'drone-hero-wide': 'Vue aérienne d’un site photographié au drone pour inspection.',
  'drone-chantier-01': 'Vue aérienne d’un chantier en cours de travaux.',
  'drone-chantier-02': 'Vue aérienne des accès d’un chantier.',

  'photobooth-hero-wide': 'Quatre invités posant dans le photobooth devant un rideau doré.',
  'photobooth-invites': 'Un groupe d’invités posant ensemble dans le photobooth.',
  'photobooth-tirage': 'Une photographie imprimée sur place par le photobooth.',

  'formation-hero-wide': 'Les participants d’un stage de photographie en extérieur.',
  'formation-pratique': 'Un participant règle son appareil pendant un exercice pratique.',

  // Deux emplacements du Studio de l'Iris, comblés par la livraison d'octobre.
  'iris-animal-02': 'L’iris d’un chien, rond et cuivré, à côté de celui de sa maîtresse.',
  'iris-hero-wide': 'Un iris bleu photographié en très haute définition, sur fond noir.',

  // Les neuf galeries ouvertes par le second versement de la livraison du
  // 3 octobre. Elles naissent dans l'éditeur comme les prestations : aucun
  // fichier à relever, les descriptions sont écrites ici.
  'mariage-galerie-13': 'Les mariés debout devant l’assemblée pendant la cérémonie, en noir et blanc.',
  'mariage-galerie-14': 'La mariée de dos devant une fenêtre, le dos de sa robe ouvert sur de la dentelle.',
  'mariage-galerie-15': 'Le marié baisse les yeux vers sa boutonnière, en noir et blanc.',
  'mariage-galerie-16': 'Les mariés et leurs invités assis dans un pré, l’un d’eux saute bras levés.',
  'mariage-galerie-17': 'Les mariés assis dans un escalier, dans une lumière dure, en noir et blanc.',
  'mariage-galerie-18': 'Une enfant cache son visage dans ses mains pendant la cérémonie, en noir et blanc.',
  'portrait-galerie-11': 'Portrait de face, les deux mains encadrant le visage, sur fond sombre.',
  'portrait-galerie-12': 'Une femme assise de trois quarts, veste noire et pantalon blanc, sur fond gris.',
  'portrait-galerie-13': 'Un couple enlacé devant une grande porte de bois peinte en bleu.',

  'tirage-lac-bleu': 'Le lac Bleu en Haute-Loire vu du ciel, entouré de forêts d’automne.',
  'tirage-ocean': 'Vue aérienne d’une plage du Portugal, océan turquoise et sable doré.',
  'tirage-coucher': 'Un coucher de soleil d’été.',
  'tirage-voiles': 'Un voilier toutes voiles dehors.',
  'tirage-pont-amours': 'Le pont des Amours vu du ciel.',
  'tirage-pont-face': 'Un pont photographié depuis la rive opposée.',
};

const alt = { ...SUPPLEMENTS };

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
