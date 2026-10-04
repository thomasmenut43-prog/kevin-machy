/**
 * Ajoute à une galerie les photographies arrivées après sa création.
 *
 * Les galeries vivent en base : une section `galerie` porte une liste
 * d'identifiants de médiathèque. Encoder une image et l'inscrire en
 * médiathèque ne suffit donc pas à la faire apparaître — il faut encore
 * l'ajouter à la page, et une page de production ne se modifie pas à la main.
 *
 * Ce script le fait, et seulement ça : il **ajoute à la fin**, sans jamais
 * retirer ni réordonner. Une image que Kevin aurait enlevée depuis l'éditeur
 * serait réinsérée au passage suivant — c'est le prix de l'idempotence, et
 * c'est pour ça que la table ci-dessous ne décrit que des ajouts ponctuels,
 * datés, et qu'on ne l'allonge pas sans raison.
 *
 *   npm run galeries              applique
 *   npm run galeries -- --verifier  dit ce qui manque, sans rien écrire
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  for (const ligne of readFileSync(path.join(racine, '.env'), 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // Pas de .env : les variables viennent peut-être de l'environnement.
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI est absent. Voir .env.exemple.');
  process.exit(1);
}

const verifier = process.argv.includes('--verifier');

/**
 * Les emplacements à ajouter, page par page, dans l'ordre d'affichage voulu.
 *
 * Second versement de la livraison du 3 octobre 2026. Six mariages et trois
 * portraits : ce que les galeries n'avaient pas — une cérémonie, un groupe,
 * un détail, un enfant, et côté portrait un couple et deux visages nouveaux.
 */
const AJOUTS = [
  {
    chemin: 'mariage',
    emplacements: [
      'mariage-galerie-13',
      'mariage-galerie-14',
      'mariage-galerie-15',
      'mariage-galerie-16',
      'mariage-galerie-17',
      'mariage-galerie-18',
    ],
  },
  {
    chemin: 'portrait',
    emplacements: ['portrait-galerie-11', 'portrait-galerie-12', 'portrait-galerie-13'],
  },
];

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

/**
 * L'identifiant de médiathèque d'un emplacement.
 *
 * On cherche par emplacement et non par nom de fichier : le fichier principal
 * est `<emplacement>-<plus grande largeur>.webp`, et cette largeur bouge dès
 * qu'une source plus grande arrive. C'est la leçon déjà apprise par
 * `importer-images.mjs`, qui avait créé quarante-quatre doublons en l'ignorant.
 */
async function idMedia(nom) {
  const [lignes] = await connexion.query(
    "SELECT id FROM medias WHERE fichier REGEXP CONCAT('^/img/', ?, '-[0-9]+\\\\.webp$') LIMIT 1",
    [nom],
  );
  return lignes[0]?.id ?? null;
}

let ajoutees = 0;
let presentes = 0;
const manquantes = [];

for (const { chemin, emplacements } of AJOUTS) {
  const [pages] = await connexion.query('SELECT id, sections FROM pages WHERE chemin = ? LIMIT 1', [
    chemin,
  ]);
  if (!pages.length) {
    manquantes.push(`page /${chemin} introuvable`);
    continue;
  }

  const page = pages[0];
  const sections =
    typeof page.sections === 'string' ? JSON.parse(page.sections) : structuredClone(page.sections);

  const galerie = sections.find((s) => s.type === 'galerie');
  if (!galerie) {
    manquantes.push(`/${chemin} n'a pas de section galerie`);
    continue;
  }

  galerie.valeurs ??= {};
  galerie.valeurs.images ??= [];
  const deja = new Set(galerie.valeurs.images.map((i) => i.image));

  let touchee = false;
  for (const nom of emplacements) {
    const id = await idMedia(nom);
    if (!id) {
      manquantes.push(`${nom} : absent de la médiathèque — lancer d'abord importer-images`);
      continue;
    }
    if (deja.has(id)) {
      presentes++;
      continue;
    }
    galerie.valeurs.images.push({ image: id });
    deja.add(id);
    touchee = true;
    ajoutees++;
    console.log(`  ajoutée   ${nom} → /${chemin} (média ${id})`);
  }

  if (touchee && !verifier) {
    await connexion.query('UPDATE pages SET sections = ? WHERE id = ?', [
      JSON.stringify(sections),
      page.id,
    ]);
    console.log(`  /${chemin} : ${galerie.valeurs.images.length} images au total`);
  }
}

await connexion.end();

if (manquantes.length) {
  console.log('\nÀ régler :');
  for (const m of manquantes) console.log(`  · ${m}`);
}

console.log(
  `\n${verifier ? '[vérification] ' : ''}${ajoutees} ajout(s), ${presentes} déjà en place.` +
    (verifier && ajoutees ? ' Rien n’a été écrit.' : ''),
);

if (manquantes.length) process.exitCode = 1;
