/**
 * Applique les migrations SQL de `migrations/`, dans l'ordre de leur nom.
 *
 * Chaque fichier est joué une fois et une seule, dans une transaction : une
 * migration qui échoue à mi-parcours ne laisse pas la base à moitié modifiée.
 * Le nom du fichier sert de clé — renommer un fichier déjà appliqué le ferait
 * rejouer, donc on ne renomme pas.
 *
 *   npm run migrer
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const client = new pg.Client({ connectionString: process.env.DATABASE_URI });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS migrations (
    nom        TEXT PRIMARY KEY,
    empreinte  TEXT NOT NULL,
    applique_le TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const { rows: deja } = await client.query('SELECT nom, empreinte FROM migrations');
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
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (nom, empreinte) VALUES ($1, $2)', [nom, empreinte]);
    await client.query('COMMIT');
    console.log(`  appliquée  ${nom}`);
    jouees++;
  } catch (erreur) {
    await client.query('ROLLBACK');
    console.error(`  ÉCHEC      ${nom}`);
    console.error(`  ${erreur.message}`);
    await client.end();
    process.exit(1);
  }
}

console.log(jouees ? `\n${jouees} migration(s) appliquée(s).` : '\nBase déjà à jour.');
await client.end();
