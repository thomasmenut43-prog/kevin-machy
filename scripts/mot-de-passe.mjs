/**
 * Redonne l'accès au BackOffice quand le mot de passe est perdu.
 *
 * Il n'y a pas de « mot de passe oublié » dans l'application, et c'est
 * délibéré : un tel formulaire suppose une boîte mail joignable, donc une
 * dépendance de plus, et il ouvre une porte de secours que personne ne
 * surveille. Le BackOffice compte deux ou trois comptes, tenus par des gens
 * qu'on a au téléphone.
 *
 * Mais alors, un mot de passe perdu enferme dehors : les empreintes scrypt ne
 * se remontent pas, et on ne change le sien qu'une fois entré. D'où ce script,
 * qui écrit directement en base — le seul endroit où l'on puisse encore agir.
 *
 *   npm run mot-de-passe                      liste les comptes
 *   npm run mot-de-passe -- kevin@machy.fr    en redéfinit un
 *
 * Il vise la base de `DATABASE_URI`. En développement c'est celle du
 * docker-compose ; pour la base en ligne, poser la variable le temps de la
 * commande — voir docs/cloudflare.md.
 */
import { readFileSync } from 'node:fs';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const scryptAsync = promisify(scrypt);
const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Même chargement que `migrer.mjs` : une ligne CLÉ=valeur, les # en commentaire.
try {
  for (const ligne of readFileSync(path.join(racine, '.env'), 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // Pas de .env : les variables viennent peut-être de l'environnement.
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI est absent. Copier .env.exemple en .env.');
  process.exit(1);
}

const connexion = await mysql.createConnection({
  uri: process.env.DATABASE_URI,
  timezone: 'Z',
  // Hyperdrive ne relaie pas les requêtes préparées ; ce script ne passe pas
  // par lui, mais autant parler le même protocole que `lib/bdd.ts` partout.
  disableEval: false,
});

const [comptes] = await connexion.query(
  'SELECT email, prenom, nom, role, bloque_jusqua FROM utilisateurs ORDER BY email',
);

if (!comptes.length) {
  console.log('\nAucun compte. Le BackOffice proposera « premier compte » de lui-même.\n');
  await connexion.end();
  process.exit(0);
}

const vise = process.argv[2]?.trim().toLowerCase();

if (!vise) {
  console.log('\nComptes du BackOffice :\n');
  for (const c of comptes) {
    const bloque = c.bloque_jusqua && c.bloque_jusqua > new Date() ? '  (bloqué)' : '';
    console.log(`  ${c.email}`.padEnd(42) + `${c.prenom} ${c.nom} — ${c.role}${bloque}`);
  }
  console.log('\nPour en redéfinir un :\n  npm run mot-de-passe -- <adresse>\n');
  await connexion.end();
  process.exit(0);
}

const compte = comptes.find((c) => c.email.toLowerCase() === vise);
if (!compte) {
  console.error(`\n  Aucun compte à l'adresse ${vise}.`);
  console.error('  Lancer la commande sans adresse pour voir la liste.\n');
  await connexion.end();
  process.exit(1);
}

const clavier = createInterface({ input: process.stdin, output: process.stdout });
console.log(`\nNouveau mot de passe pour ${compte.email} (${compte.prenom} ${compte.nom}).`);
// Il s'affiche pendant la saisie : masquer le retour d'un terminal demande une
// API privée de Node, qui se comporte mal sous Windows. Le dire vaut mieux que
// de promettre un masque qui sauterait au mauvais moment.
console.log('Il restera visible à l\'écran — il n\'est enregistré nulle part ailleurs.\n');
const motDePasse = (await clavier.question('  > ')).trim();
clavier.close();

// Même règle que `motDePasseAcceptable` dans lib/auth.ts : la longueur protège
// mieux que les caractères exotiques. Dupliquée ici parce que ce script ne
// charge pas l'application — un module `server-only` ne s'importe pas de Node.
if (motDePasse.length < 12) {
  console.error('\n  Douze caractères au minimum.\n');
  await connexion.end();
  process.exit(1);
}

const sel = randomBytes(16).toString('hex');
const empreinte = (await scryptAsync(motDePasse.normalize('NFKC'), sel, 64)).toString('hex');

await connexion.query(
  `UPDATE utilisateurs
      SET empreinte = ?, sel = ?, essais_rates = 0, bloque_jusqua = NULL,
          modifie_le = CURRENT_TIMESTAMP(3)
    WHERE email = ?`,
  [empreinte, sel, compte.email],
);

// Les sessions ouvertes sont coupées. Un mot de passe qu'on redéfinit parce
// qu'on l'a perdu peut aussi l'avoir été parce qu'il a fuité : laisser vivre
// les sessions existantes reviendrait à ne rien changer pour qui les détient.
const [sessions] = await connexion.query(
  'DELETE FROM sessions WHERE utilisateur_id = (SELECT id FROM utilisateurs WHERE email = ?)',
  [compte.email],
);

await connexion.end();

console.log(`\n  Mot de passe redéfini pour ${compte.email}.`);
if (sessions.affectedRows) console.log(`  ${sessions.affectedRows} session(s) ouverte(s) fermée(s).`);
console.log('  Le compte n\'est plus bloqué, les essais ratés sont remis à zéro.\n');
