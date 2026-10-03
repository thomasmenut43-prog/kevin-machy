/**
 * Corrige les adresses périmées écrites dans le contenu des pages.
 *
 *   npm run liens                 corrige
 *   npm run liens -- --verifier   dit ce qui reste, sans rien écrire
 *
 * Les liens d'un site vivent à deux endroits. Ceux du pied de page et des
 * réseaux sociaux sont dans les **Paramètres**, et se corrigent là-bas en une
 * fois. Ceux qu'un bouton porte à l'intérieur d'une page sont dans la page,
 * un par un — et c'est là qu'une adresse périmée survit, parce que rien ne la
 * signale.
 *
 * C'est arrivé : le bouton « Voir mon Instagram » de la page À propos pointait
 * encore vers `kevinphotographe43`, le compte que Kevin n'utilise plus, alors
 * que le pied de page du même écran menait au bon. Six mois plus tard, personne
 * ne l'aurait trouvé sans chercher.
 *
 * Idempotent : relancé, il ne touche que ce qui n'est pas déjà corrigé.
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
  // Pas de .env : les variables viennent de l'environnement.
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI est absent. Voir .env.exemple.');
  process.exit(1);
}

const verifier = process.argv.includes('--verifier');

/**
 * Chaque correction, avec sa raison.
 *
 * `de` est cherché tel quel dans le JSON des sections — donc dans les liens de
 * boutons comme dans le texte. `vers` le remplace partout.
 */
const CORRECTIONS = [
  {
    de: 'https://www.instagram.com/kevinphotographe43/',
    vers: 'https://www.instagram.com/kevinmachy.photographe/',
    pourquoi: 'ancien compte Instagram, abandonné au profit de kevinmachy.photographe',
  },
];

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

const [pages] = await connexion.query('SELECT id, chemin, sections, brouillon FROM pages');

const aFaire = [];
let corrigees = 0;

for (const page of pages) {
  const brut = page.sections;
  let json = typeof brut === 'string' ? brut : JSON.stringify(brut);
  const trouvees = CORRECTIONS.filter((c) => json.includes(c.de));
  if (!trouvees.length) continue;

  for (const c of trouvees) {
    const combien = json.split(c.de).length - 1;
    aFaire.push(`/${page.chemin}/ — ${combien} fois « ${c.de} »`);
  }

  if (verifier) continue;

  if (page.brouillon) {
    console.error(
      `  ! /${page.chemin}/ a un brouillon en cours : laissée telle quelle.\n` +
        '    Publier ou abandonner le brouillon, puis relancer.',
    );
    process.exitCode = 1;
    continue;
  }

  for (const c of trouvees) json = json.split(c.de).join(c.vers);

  await connexion.query('UPDATE pages SET sections = ?, modifie_le = now() WHERE id = ?', [
    json,
    page.id,
  ]);
  for (const c of trouvees) {
    console.log(`  corrigé        /${page.chemin}/  ${c.de}\n                 → ${c.vers}`);
  }
  corrigees += 1;
}

await connexion.end();

if (verifier) {
  if (aFaire.length) {
    console.error(`\n  ${aFaire.length} lien(s) périmé(s) :`);
    for (const m of aFaire) console.error(`    ${m}`);
    console.error('\n  Pour les corriger : npm run liens\n');
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log('  déjà en place  aucun lien périmé dans les pages');
  }
} else {
  console.log(corrigees ? `\n${corrigees} page(s) corrigée(s).` : '  déjà en place  aucun lien périmé');
}
