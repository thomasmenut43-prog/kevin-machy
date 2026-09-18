import 'server-only';
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';

/**
 * Accès à MySQL.
 *
 * La base était PostgreSQL. Elle est passée à MySQL pour une raison qui n'a
 * rien de technique : l'hébergement du client est un mutualisé Hostinger, qui
 * ne propose que MySQL. Le choix est donc celui de l'hébergeur, et le code s'y
 * plie — voir `docs/mysql.md` pour ce que cela a changé.
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

    global_.reserveBdd = mysql.createPool({
      uri: url,
      connectionLimit: 10,
      waitForConnections: true,
      // Tout est écrit et relu en temps universel. Sans cette ligne, le pilote
      // interprète les dates dans le fuseau de la machine : la même session
      // expirerait à deux moments différents selon l'endroit où tourne le site.
      timezone: 'Z',
      // Un mutualisé coupe les connexions oisives. Mieux vaut qu'elles meurent
      // de notre côté d'abord, plutôt que de découvrir la coupure en pleine
      // requête.
      idleTimeout: 30_000,
      enableKeepAlive: true,
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
export async function requete<T extends object>(
  sql: string,
  valeurs: unknown[] = [],
): Promise<T[]> {
  const [lignes] = await reserve().execute<RowDataPacket[]>(sql, valeurs as unknown[] as never);
  return lignes as unknown as T[];
}

/** La première ligne, ou `null`. Pour les requêtes qui visent un seul enregistrement. */
export async function ligne<T extends object>(
  sql: string,
  valeurs: unknown[] = [],
): Promise<T | null> {
  const lignes = await requete<T>(sql, valeurs);
  return lignes[0] ?? null;
}

/**
 * Exécute une écriture et renvoie ce que MySQL en dit.
 *
 * PostgreSQL rendait la ligne créée d'un `RETURNING`. MySQL ne sait pas faire :
 * il ne donne que l'identifiant attribué et le nombre de lignes touchées. Les
 * appelants qui veulent la ligne entière la relisent ensuite — c'est une
 * requête de plus, et c'est le prix du déménagement.
 */
export async function ecrire(
  sql: string,
  valeurs: unknown[] = [],
): Promise<{ insertId: number; touchees: number }> {
  const [resultat] = await reserve().execute<ResultSetHeader>(sql, valeurs as unknown[] as never);
  return { insertId: resultat.insertId, touchees: resultat.affectedRows };
}

/**
 * Enchaîne plusieurs écritures dans une transaction : soit tout passe, soit
 * rien. Indispensable dès qu'une modification touche plusieurs tables, comme
 * l'enregistrement d'une page et de ses sections.
 *
 * Le travail reçoit `q` pour lire et `e` pour écrire, tous deux liés à la même
 * connexion : une requête qui passerait par la réserve sortirait de la
 * transaction sans le dire.
 */
export async function transaction<T>(
  travail: (q: typeof requete, e: typeof ecrire) => Promise<T>,
): Promise<T> {
  const connexion = await reserve().getConnection();
  try {
    await connexion.beginTransaction();

    const lire = async <R extends object>(sql: string, valeurs: unknown[] = []) => {
      const [lignes] = await connexion.execute<RowDataPacket[]>(sql, valeurs as unknown[] as never);
      return lignes as unknown as R[];
    };
    const poser = async (sql: string, valeurs: unknown[] = []) => {
      const [r] = await connexion.execute<ResultSetHeader>(sql, valeurs as unknown[] as never);
      return { insertId: r.insertId, touchees: r.affectedRows };
    };

    const resultat = await travail(lire as typeof requete, poser as typeof ecrire);
    await connexion.commit();
    return resultat;
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    connexion.release();
  }
}

/**
 * Pose un réglage, qu'il existe déjà ou non.
 *
 * Les quatre familles de réglages — barre, pied, entreprise, intégrations —
 * écrivaient la même requête chacune de leur côté. Une seule ici : le jour où
 * la table change, il n'y a qu'un endroit à suivre.
 *
 * La valeur est passée deux fois, une fois pour l'insertion et une fois pour la
 * mise à jour. MySQL sait l'éviter avec `VALUES(valeur)`, mais cette forme est
 * dépréciée, et celle qui la remplace n'existe pas chez MariaDB — que
 * l'hébergeur peut servir à la place. Deux paramètres, et ça marche partout.
 */
export async function poserReglage(cle: string, valeur: unknown) {
  const json = typeof valeur === 'string' ? valeur : JSON.stringify(valeur);
  await ecrire(
    `INSERT INTO reglages (cle, valeur) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE valeur = ?, modifie_le = CURRENT_TIMESTAMP(3)`,
    [cle, json, json],
  );
}

/**
 * Le code d'erreur d'un doublon, à un seul endroit.
 *
 * PostgreSQL disait `23505`, MySQL dit `ER_DUP_ENTRY`. Les appelants
 * s'appuyaient sur le premier ; ils demandent maintenant à cette fonction,
 * pour que le prochain déménagement ne se cherche pas dans dix fichiers.
 */
export function estDoublon(erreur: unknown) {
  return (erreur as { code?: string })?.code === 'ER_DUP_ENTRY';
}
