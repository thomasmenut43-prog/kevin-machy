/**
 * Efface l'audience antérieure à une date.
 *
 * Le tableau de bord de Kevin compte des visites et des événements. Les
 * premiers mois n'en sont pas : ce sont les allers-retours du chantier, les
 * pages rechargées cent fois pour vérifier un espacement, les captures
 * d'écran automatisées. Laissés là, ils gonflent ses chiffres d'une audience
 * qui n'a jamais existé, et faussent toute comparaison avec le mois suivant.
 *
 * D'où ce script, et d'où sa forme : **il compte avant de supprimer, et il ne
 * supprime que si on le lui demande deux fois.** Une ligne d'audience effacée
 * ne se retrouve pas — il n'y a pas de corbeille, et aucune sauvegarde de
 * cette base n'est tenue aujourd'hui.
 *
 *   npm run audience -- --avant 2026-09-28               compte, n'écrit rien
 *   npm run audience -- --avant 2026-09-28 --appliquer   efface
 *
 * Il vise la base de `DATABASE_URI`. Pour celle en ligne, passer par le
 * workflow « Audience » : le mot de passe de la base n'existe en clair nulle
 * part ailleurs.
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

const args = process.argv.slice(2);
const avant = args[args.indexOf('--avant') + 1];
const appliquer = args.includes('--appliquer');

if (!avant || !/^\d{4}-\d{2}-\d{2}$/.test(avant)) {
  console.error('\n  Indiquez la date, au format AAAA-MM-JJ :');
  console.error('    npm run audience -- --avant 2026-09-28\n');
  process.exit(1);
}

// Une date qui n'existe pas (le 31 février) passerait le motif ci-dessus et
// serait acceptée par MySQL comme une chaîne. On la fait valider par le
// calendrier avant d'aller plus loin.
const jour = new Date(avant + 'T00:00:00Z');
if (Number.isNaN(jour.getTime()) || !jour.toISOString().startsWith(avant)) {
  console.error(`\n  Le ${avant} n'existe pas.\n`);
  process.exit(1);
}

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

const TABLES = ['visites', 'evenements'];
const releve = [];

for (const table of TABLES) {
  const [[avantLigne]] = await connexion.query(
    `SELECT count(*) AS n, min(jour) AS premier, max(jour) AS dernier FROM ${table} WHERE jour < ?`,
    [avant],
  );
  const [[reste]] = await connexion.query(
    `SELECT count(*) AS n FROM ${table} WHERE jour >= ?`,
    [avant],
  );
  releve.push({ table, ...avantLigne, reste: reste.n });
}

const dateCourte = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

console.log(`\nAudience antérieure au ${avant} :\n`);
for (const r of releve) {
  console.log(
    `  ${r.table.padEnd(12)}${String(r.n).padStart(7)} ligne(s) à effacer` +
      `   du ${dateCourte(r.premier)} au ${dateCourte(r.dernier)}` +
      `   —  ${r.reste} conservée(s)`,
  );
}

const total = releve.reduce((s, r) => s + Number(r.n), 0);

if (!total) {
  console.log('\n  Rien à effacer.\n');
  await connexion.end();
  process.exit(0);
}

if (!appliquer) {
  console.log(`\n  ${total} ligne(s) partiraient. Rien n'a été écrit.`);
  console.log('  Relancer avec --appliquer pour les effacer.\n');
  await connexion.end();
  process.exit(0);
}

let efface = 0;
for (const table of TABLES) {
  const [r] = await connexion.query(`DELETE FROM ${table} WHERE jour < ?`, [avant]);
  efface += r.affectedRows;
  console.log(`  ${table.padEnd(12)}${String(r.affectedRows).padStart(7)} ligne(s) effacée(s)`);
}

await connexion.end();
console.log(`\n  ${efface} ligne(s) effacée(s). C'est définitif.\n`);
