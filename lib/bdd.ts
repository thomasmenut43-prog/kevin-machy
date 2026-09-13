import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

/**
 * Accès à PostgreSQL.
 *
 * Une seule réserve de connexions pour toute l'application. En développement,
 * Next recharge les modules à chaque modification : sans la garder sur
 * `globalThis`, on ouvrirait une réserve de plus à chaque sauvegarde jusqu'à
 * saturer la base.
 */
const global_ = globalThis as unknown as { reserveBdd?: Pool };

function reserve() {
  if (!global_.reserveBdd) {
    const url = process.env.DATABASE_URI;
    if (!url) throw new Error('DATABASE_URI est absent. Voir .env.exemple.');

    global_.reserveBdd = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return global_.reserveBdd;
}

/**
 * Exécute une requête et renvoie ses lignes.
 *
 * **Les valeurs passent toujours par `valeurs`, jamais dans le texte de la
 * requête.** C'est ce qui rend l'injection SQL impossible : le pilote envoie
 * l'ordre et les données séparément, et une apostrophe dans un nom reste une
 * apostrophe dans un nom.
 */
export async function requete<T extends QueryResultRow>(
  sql: string,
  valeurs: unknown[] = [],
): Promise<T[]> {
  const resultat = await reserve().query<T>(sql, valeurs);
  return resultat.rows;
}

/** La première ligne, ou `null`. Pour les requêtes qui visent un seul enregistrement. */
export async function ligne<T extends QueryResultRow>(
  sql: string,
  valeurs: unknown[] = [],
): Promise<T | null> {
  const lignes = await requete<T>(sql, valeurs);
  return lignes[0] ?? null;
}

/**
 * Enchaîne plusieurs écritures dans une transaction : soit tout passe, soit
 * rien. Indispensable dès qu'une modification touche plusieurs tables, comme
 * l'enregistrement d'une page et de ses sections.
 */
export async function transaction<T>(
  travail: (q: typeof requete) => Promise<T>,
): Promise<T> {
  const client = await reserve().connect();
  try {
    await client.query('BEGIN');
    const dans = async <R extends QueryResultRow>(sql: string, valeurs: unknown[] = []) =>
      (await client.query<R>(sql, valeurs)).rows;
    const resultat = await travail(dans as typeof requete);
    await client.query('COMMIT');
    return resultat;
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}
