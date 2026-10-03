/**
 * Aligne l'adresse du site enregistrée en base sur celle du code.
 *
 *   npm run domaine                 aligne
 *   npm run domaine -- --verifier   dit ce qu'il y a, sans rien écrire
 *
 * `SITE.url` n'est qu'un repli : c'est `reglages.entreprise.url` qui fait foi
 * en ligne, et ce champ se saisit dans les Paramètres du BackOffice. Il
 * alimente l'URL canonique de chaque page, le plan du site, l'Open Graph et les
 * données structurées — tout ce qui dit à Google « voici mon adresse ».
 *
 * D'où ce script. Quand le domaine change, modifier `lib/site.ts` ne suffit
 * pas : si quelqu'un a enregistré le formulaire des Paramètres ne serait-ce
 * qu'une fois, l'ancienne valeur est en base et gagne. Le site se déploierait
 * sans erreur, et continuerait à se déclarer sous un domaine qu'il n'habite
 * plus. Une panne sans symptôme, celle qu'on ne voit que des semaines plus tard
 * dans la Search Console.
 *
 * **C'est le seul champ de l'entreprise qu'on écrase.** `poser-juridique.mjs`
 * comble les trous sans jamais remplacer ce qui a été saisi, et c'est la bonne
 * règle pour un numéro de téléphone. L'adresse du site n'est pas de cette
 * nature : elle décide où le site se déclare, elle se décide avec les
 * redirections et la Search Console, et elle n'a qu'une valeur juste à la fois.
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

// Lu à la source plutôt que recopié : deux endroits finiraient par diverger, et
// c'est exactement le genre de divergence que ce script existe pour corriger.
const { SITE } = await import('../lib/site.ts');
const attendu = SITE.url;

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

const [lignes] = await connexion.query('SELECT valeur FROM reglages WHERE cle = ?', ['entreprise']);
const brut = lignes[0]?.valeur;
const entreprise = (typeof brut === 'string' ? JSON.parse(brut) : brut) ?? {};
const actuel = entreprise.url;

if (actuel === attendu) {
  console.log(`  déjà en place  adresse du site : ${attendu}`);
} else if (!lignes.length) {
  // Rien en base : le site retombe sur `SITE.url`, qui est déjà la bonne
  // valeur. On n'écrit pas une ligne pour confirmer un défaut.
  console.log(`  rien en base   le site retombe sur ${attendu}, qui est la bonne valeur`);
} else {
  console.log(`  en base        ${actuel ? `« ${actuel} »` : '(vide)'}`);
  console.log(`  attendu        « ${attendu} »`);

  if (verifier) {
    console.error('\n  L’adresse enregistrée ne correspond pas au code.');
    console.error('  Pour l’aligner : npm run domaine\n');
    process.exitCode = 1;
  } else {
    await connexion.query(
      `INSERT INTO reglages (cle, valeur) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), modifie_le = now()`,
      ['entreprise', JSON.stringify({ ...entreprise, url: attendu })],
    );
    console.log(`\n  posée          adresse du site : ${attendu}`);
  }
}

await connexion.end();
