/**
 * Applique les migrations SQL de `migrations/`, dans l'ordre de leur nom.
 *
 * Chaque fichier est joué une fois et une seule. Le nom du fichier sert de clé
 * — renommer un fichier déjà appliqué le ferait rejouer, donc on ne renomme
 * pas, et son empreinte est vérifiée à chaque passage.
 *
 * **MySQL ne sait pas annuler une création de table.** PostgreSQL enveloppait
 * chaque migration dans une transaction ; ici, toute commande de structure
 * valide d'office ce qui précède. Une migration qui échoue à mi-parcours laisse
 * donc la base à moitié modifiée, et il faut la reprendre à la main. C'est le
 * prix du moteur, pas un oubli : mieux vaut le savoir que le découvrir.
 *
 *   npm run migrer
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');

// Charge .env sans dépendance : une ligne CLÉ=valeur, les # sont des commentaires.
function chargerEnv() {
  try {
    const brut = readFileSync(path.resolve(dossier, '../.env'), 'utf8');
    for (const ligne of brut.split('\n')) {
      const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    // Pas de .env : les variables viennent peut-être de l'environnement.
  }
}

chargerEnv();

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI est absent. Copier .env.exemple en .env.');
  process.exit(1);
}

// `multipleStatements` : un fichier de migration en contient plusieurs, et le
// pilote les refuse par défaut — une protection contre l'injection qui n'a pas
// de sens ici, où le SQL vient du dépôt et de nulle part ailleurs.
const connexion = await mysql.createConnection({
  uri: process.env.DATABASE_URI,
  multipleStatements: true,
  timezone: 'Z',
});

await connexion.query(`
  CREATE TABLE IF NOT EXISTS migrations (
    nom         VARCHAR(191) NOT NULL PRIMARY KEY,
    empreinte   VARCHAR(64)  NOT NULL,
    applique_le DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4
`);

const [deja] = await connexion.query('SELECT nom, empreinte FROM migrations');
const appliquees = new Map(deja.map((r) => [r.nom, r.empreinte]));

const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort();
let jouees = 0;

for (const nom of fichiers) {
  const sql = readFileSync(path.join(dossier, nom), 'utf8');
  const empreinte = createHash('sha256').update(sql).digest('hex').slice(0, 16);

  if (appliquees.has(nom)) {
    // Une migration déjà jouée puis modifiée ne sera pas rejouée : la base et le
    // dépôt diraient alors deux choses différentes. Mieux vaut le signaler fort.
    if (appliquees.get(nom) !== empreinte) {
      console.error(`\n  ${nom} a été modifiée après avoir été appliquée.`);
      console.error('  Créer une nouvelle migration plutôt que de retoucher celle-ci.\n');
      process.exitCode = 1;
    }
    continue;
  }

  try {
    await connexion.query(sql);
    await connexion.query('INSERT INTO migrations (nom, empreinte) VALUES (?, ?)', [
      nom,
      empreinte,
    ]);
    console.log(`  appliquée  ${nom}`);
    jouees++;
  } catch (erreur) {
    console.error(`  ÉCHEC      ${nom}`);
    console.error(`  ${erreur.message}`);
    console.error('\n  MySQL ne rejoue pas en arrière une migration de structure :');
    console.error('  vérifier dans quel état la base est restée avant de relancer.\n');
    await connexion.end();
    process.exit(1);
  }
}

console.log(jouees ? `\n${jouees} migration(s) appliquée(s).` : '\nBase déjà à jour.');
await connexion.end();
