/**
 * Donne un nom stable aux sections que des boutons visent.
 *
 * Les boutons « Voir les collections » et « Ce que comprend la séance »
 * pointaient vers `#collections` et `#seance`. Rien ne portait ces noms : les
 * sections n'ont que l'identifiant que l'éditeur leur donne — `section-conv7ber0`
 * — qui ne veut rien dire et change si la section est recréée.
 *
 * Résultat : un bouton qui ne faisait rien. Pas d'erreur, pas de défilement.
 * C'est la pire sorte de panne, celle qu'on ne voit qu'en cliquant.
 *
 *   npm run ancres                 pose les ancres
 *   npm run ancres -- --verifier   dit ce qui manque, sans rien écrire
 *
 * Idempotent : relancé, il ne touche que ce qui n'est pas déjà en place.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

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

/** Ce que chaque bouton doit atteindre. */
const ANCRES = [
  { chemin: 'mariage', type: 'offres', ancre: 'collections' },
  { chemin: 'portrait', type: 'inclus', ancre: 'seance' },
];

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

let posees = 0;
const manquantes = [];

for (const { chemin, type, ancre } of ANCRES) {
  const [lignes] = await connexion.query('SELECT id, sections FROM pages WHERE chemin = ?', [chemin]);
  if (!lignes.length) {
    console.error(`  page /${chemin}/ introuvable`);
    process.exitCode = 1;
    continue;
  }

  const brut = lignes[0].sections;
  const sections = typeof brut === 'string' ? JSON.parse(brut) : brut;

  // La section est désignée par son **type**, pas par sa clé : les clés sont
  // engendrées et changeraient à la moindre recréation, ce qui rendrait ce
  // script faux sans prévenir.
  const cible = sections.find((s) => s.type === type);
  if (!cible) {
    console.error(`  /${chemin}/ : aucune section de type « ${type} »`);
    process.exitCode = 1;
    continue;
  }

  if (cible.valeurs?.reglages?.ancre === ancre) {
    console.log(`  déjà en place  /${chemin}/  ${type} → #${ancre}`);
    continue;
  }

  manquantes.push(`/${chemin}/ ${type} → #${ancre}`);
  if (verifier) continue;

  cible.valeurs = cible.valeurs ?? {};
  cible.valeurs.reglages = { ...(cible.valeurs.reglages ?? {}), ancre };
  await connexion.query('UPDATE pages SET sections = ?, modifie_le = now() WHERE id = ?', [
    JSON.stringify(sections),
    lignes[0].id,
  ]);
  console.log(`  posée          /${chemin}/  ${type} → #${ancre}`);
  posees += 1;
}

await connexion.end();

if (verifier) {
  if (manquantes.length) {
    console.error(`\n  ${manquantes.length} ancre(s) à poser :`);
    for (const m of manquantes) console.error(`    ${m}`);
    console.error('\n  Pour les poser : npm run ancres\n');
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log('\nToutes les ancres sont en place.');
  }
} else {
  console.log(posees ? `\n${posees} ancre(s) posée(s).` : '\nRien à faire.');
}
