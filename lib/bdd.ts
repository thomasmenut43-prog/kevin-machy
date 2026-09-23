import 'server-only';
import mysql, {
  type Connection,
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
} from 'mysql2/promise';

/**
 * Accès à la base.
 *
 * Elle était PostgreSQL. Elle est passée à MariaDB pour une raison qui n'a
 * rien de technique : l'hébergement du client est un mutualisé Hostinger, qui
 * ne propose que cela. Le choix est celui de l'hébergeur, et le code s'y plie
 * — voir `docs/mysql.md` pour ce que cela a changé.
 *
 * Le pilote s'appelle `mysql2` et le dialecte reste celui de MySQL : MariaDB
 * en est née, et les requêtes écrites ici valent pour les deux. C'est délibéré
 * — rien n'oblige l'hébergeur à ne jamais changer d'avis.
 *
 * Sur un serveur, une seule réserve de connexions pour toute l'application. En
 * développement, Next recharge les modules à chaque modification : sans la
 * garder sur `globalThis`, on ouvrirait une réserve de plus à chaque
 * sauvegarde jusqu'à saturer la base.
 *
 * Dans un Worker, c'est l'inverse — et ce n'est pas un réglage mais une règle
 * de la plateforme. Voir `avec()` plus bas.
 */
const global_ = globalThis as unknown as { reserveBdd?: Promise<Pool> };

/**
 * Où joindre la base.
 *
 * `DATABASE_URI` partout, sauf dans un Cloudflare Worker : là, l'adresse vient
 * d'Hyperdrive, qui tient des connexions déjà ouvertes près de la base. Le
 * reste du module ne voit pas la différence — c'est une adresse dans les deux
 * cas.
 *
 * Le choix est explicite plutôt que deviné, comme pour le coffre des fichiers.
 *
 * **Lu à l'appel, jamais au chargement du module.** Cloudflare ne peuple
 * l'environnement qu'à la première requête : lu trop tôt, `BASE` est vide, le
 * code se croit sur un serveur classique et repart sur la réserve partagée —
 * qu'un Worker refuse. La panne est alors incompréhensible, puisque la
 * configuration, elle, est juste.
 */
const surWorker = () => process.env.BASE === 'hyperdrive';

async function adresse(): Promise<string> {
  if (surWorker()) {
    const { adresseHyperdrive } = await import('./bdd-hyperdrive');
    return adresseHyperdrive();
  }

  const url = process.env.DATABASE_URI;
  if (!url) throw new Error('DATABASE_URI est absent. Voir .env.exemple.');
  return url;
}

const commun = () => ({
  // Tout est écrit et relu en temps universel. Sans cette ligne, le pilote
  // interprète les dates dans le fuseau de la machine : la même session
  // expirerait à deux moments différents selon l'endroit où tourne le site.
  timezone: 'Z',
  // `mysql2` fabrique à la volée le code qui lit les lignes, par `eval`. Un
  // Worker l'interdit : sans cette option, **aucune requête ne passerait** une
  // fois là-bas. Elle coûte un lecteur un peu plus lent, on ne l'impose donc
  // pas au serveur Node, qui n'en a pas besoin.
  disableEval: surWorker(),
});

/**
 * La promesse est gardée, pas la réserve.
 *
 * Deux requêtes arrivant en même temps sur un serveur qui démarre verraient
 * toutes deux une réserve absente, et en ouvriraient chacune une. Garder la
 * promesse fait que la seconde attend la première.
 */
function reserve(): Promise<Pool> {
  if (!global_.reserveBdd) {
    global_.reserveBdd = adresse().then((uri) =>
      mysql.createPool({
        uri,
        ...commun(),
        connectionLimit: 10,
        waitForConnections: true,
        // Un mutualisé coupe les connexions oisives. Mieux vaut qu'elles
        // meurent de notre côté d'abord, plutôt que de découvrir la coupure en
        // pleine requête.
        idleTimeout: 30_000,
        enableKeepAlive: true,
      }),
    );
  }
  return global_.reserveBdd;
}

/**
 * De quoi exécuter une requête, puis ranger.
 *
 * Deux régimes, et la différence n'est pas un détail de performance.
 *
 * Sur un serveur, la réserve est partagée et survit aux requêtes : c'est tout
 * l'intérêt d'une réserve.
 *
 * **Dans un Worker, c'est interdit.** Un objet d'entrée-sortie créé pendant une
 * requête ne peut pas servir à la suivante — la plateforme le refuse
 * explicitement : « Cannot perform I/O on behalf of a different request ».
 * Garder la réserve sur `globalThis` faisait donc échouer toute page servie
 * après la première. On ouvre une connexion par opération, et on la ferme.
 *
 * C'est précisément ce pour quoi Hyperdrive existe : il garde les connexions
 * ouvertes de son côté, à nous de ne rien garder du nôtre.
 */
async function avec<T>(travail: (c: Pool | Connection) => Promise<T>): Promise<T> {
  if (!surWorker()) return travail(await reserve());

  const connexion = await mysql.createConnection({ uri: await adresse(), ...commun() });
  try {
    return await travail(connexion);
  } finally {
    await connexion.end();
  }
}

/**
 * Exécute une requête et renvoie ses lignes.
 *
 * **Les valeurs passent toujours par `valeurs`, jamais dans le texte de la
 * requête.** C'est ce qui rend l'injection SQL impossible : le pilote échappe
 * chaque valeur avant de l'insérer, et une apostrophe dans un nom reste une
 * apostrophe dans un nom.
 *
 * ---
 *
 * **`query` et non `execute`, et ce n'est pas un détail de style.**
 *
 * `mysql2` sait parler à la base de deux façons. `execute` prépare la requête
 * côté serveur — un aller-retour de plus, puis les valeurs envoyées à part.
 * `query` assemble la requête complète et l'envoie d'un bloc, après avoir
 * échappé les valeurs lui-même.
 *
 * Hyperdrive ne relaie pas la première : « Hyperdrive does not currently
 * support MySQL COM_STMT_PREPARE messages ». Toute page qui lit la base
 * répondait 500, et le message ne sortait que des journaux du Worker.
 *
 * On aurait pu ne changer que le chemin Cloudflare. C'eût été pire : la même
 * requête aurait suivi deux protocoles selon l'endroit, `execute` étant le plus
 * strict des deux. Une requête refusée en ligne aurait continué de passer en
 * développement. Un seul chemin, donc — ce qui marche ici marche là-bas.
 *
 * La protection contre l'injection est intacte : c'est `mysql2` qui échappe,
 * pas nous, et il le fait pour le dialecte qu'il a en face.
 */
export async function requete<T extends object>(
  sql: string,
  valeurs: unknown[] = [],
): Promise<T[]> {
  return avec(async (c) => {
    const [lignes] = await c.query<RowDataPacket[]>(sql, valeurs as unknown[] as never);
    return lignes as unknown as T[];
  });
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
  return avec(async (c) => {
    // `query` et non `execute` : voir `requete()`.
    const [resultat] = await c.query<ResultSetHeader>(sql, valeurs as unknown[] as never);
    return { insertId: resultat.insertId, touchees: resultat.affectedRows };
  });
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
  // Une transaction tient sur **une seule** connexion, par définition. Sur un
  // serveur on en emprunte une à la réserve et on la rend ; dans un Worker on
  // en ouvre une et on la ferme.
  const connexion: Connection | PoolConnection = surWorker()
    ? await mysql.createConnection({ uri: await adresse(), ...commun() })
    : await (await reserve()).getConnection();

  try {
    await connexion.beginTransaction();

    // `query` et non `execute` : voir `requete()`.
    const lire = async <R extends object>(sql: string, valeurs: unknown[] = []) => {
      const [lignes] = await connexion.query<RowDataPacket[]>(sql, valeurs as unknown[] as never);
      return lignes as unknown as R[];
    };
    const poser = async (sql: string, valeurs: unknown[] = []) => {
      const [r] = await connexion.query<ResultSetHeader>(sql, valeurs as unknown[] as never);
      return { insertId: r.insertId, touchees: r.affectedRows };
    };

    const resultat = await travail(lire as typeof requete, poser as typeof ecrire);
    await connexion.commit();
    return resultat;
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  } finally {
    if (surWorker()) await (connexion as Connection).end();
    else (connexion as PoolConnection).release();
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
