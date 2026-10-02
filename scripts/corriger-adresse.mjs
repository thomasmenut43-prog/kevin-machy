/**
 * Remplace l'ancienne adresse du studio dans le contenu des pages.
 *
 * `lib/site.ts` porte l'adresse de l'entreprise, et c'est elle que lisent les
 * données structurées et le pied de page. Mais le texte des pages, lui, vit en
 * base : la page de l'Iris et celle de Contact citaient « 14 avenue Foch » en
 * toutes lettres, écrit à la main par l'éditeur.
 *
 * Corriger l'un sans l'autre laisse un site qui se contredit.
 *
 *   npm run adresse                 remplace
 *   npm run adresse -- --verifier   dit ce qui reste, sans rien écrire
 *
 * **Correction ponctuelle.** Une fois passée sur la base en ligne, ce script
 * n'a plus de raison d'être et peut disparaître.
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

const ANCIENNE = /14\s*avenue\s+Foch/gi;
const NOUVELLE = '7 avenue Charles Dupuy';

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });
const [pages] = await connexion.query('SELECT id, chemin, sections FROM pages');

let touchees = 0;
const restantes = [];

for (const p of pages) {
  const brut = typeof p.sections === 'string' ? p.sections : JSON.stringify(p.sections);
  const n = (brut.match(ANCIENNE) || []).length;
  if (!n) continue;

  restantes.push(`/${p.chemin}/ — ${n} occurrence(s)`);
  if (verifier) continue;

  // Le remplacement porte sur le JSON sérialisé : l'adresse peut apparaître
  // dans n'importe quel champ de n'importe quelle section, et parcourir
  // l'arbre pour la chercher coûterait plus cher que ça ne rapporte.
  const corrige = brut.replace(ANCIENNE, NOUVELLE);
  await connexion.query('UPDATE pages SET sections = ?, modifie_le = now() WHERE id = ?', [
    corrige,
    p.id,
  ]);
  console.log(`  corrigée  /${p.chemin}/  — ${n} occurrence(s)`);
  touchees += 1;
}

await connexion.end();

if (verifier) {
  if (restantes.length) {
    console.error(`\n  ${restantes.length} page(s) citent encore l’ancienne adresse :`);
    for (const r of restantes) console.error(`    ${r}`);
    console.error('\n  Pour corriger : npm run adresse\n');
    process.exitCode = 1;
  } else {
    console.log('\nAucune page ne cite l’ancienne adresse.');
  }
} else {
  console.log(touchees ? `\n${touchees} page(s) corrigée(s).` : '\nRien à corriger.');
}
