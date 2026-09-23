import 'server-only';

/**
 * Où vivent les fichiers de la médiathèque.
 *
 * Ils vivaient sur le disque, à côté de l'application. C'était juste tant que
 * l'application tournait sur une machine à nous — mais un Cloudflare Worker
 * n'a pas de disque, et `node:fs` y compile sans jamais pouvoir écrire.
 *
 * D'où ce coffre : une poignée d'opérations, deux mises en œuvre. Le disque
 * reste le choix par défaut, et sert au développement comme à tout hébergement
 * qui soit un vrai serveur. R2 prend le relais dans un Worker.
 *
 * Chacune est chargée à la demande. Sans ça, la version Workers embarquerait
 * `node:fs` et la version Node embarquerait le client R2, chacune traînant ce
 * dont elle n'a que faire.
 */

/** Un fichier qu'on rend au navigateur : de quoi le servir sans le charger en mémoire. */
export type FichierLu = {
  corps: ReadableStream<Uint8Array>;
  octets: number;
};

export type Coffre = {
  ecrire(nom: string, octets: Uint8Array): Promise<void>;
  lire(nom: string): Promise<FichierLu | null>;
  /** Effacer ce qui n'existe pas n'est pas une erreur. */
  effacer(nom: string): Promise<void>;
  /** Utilisé quand on duplique un dossier : les images sont recopiées, pas partagées. */
  copier(de: string, vers: string): Promise<void>;
};

/**
 * `COFFRE` désigne le rangement. Absent, on écrit sur le disque.
 *
 * | valeur | où |
 * |---|---|
 * | absent | le disque, à côté de l'application |
 * | `hostinger` | chez Hostinger, par un guichet PHP |
 *
 * R2 avait été écrit puis retiré : il exige une carte bancaire sur le compte,
 * même pour sa part offerte, et Hostinger offre dix fois plus d'espace déjà
 * payé. L'implémentation est dans l'historique si le vent tourne.
 *
 * Le choix est explicite plutôt que deviné. Renifler l'environnement marche
 * jusqu'au jour où il se trompe, et ce jour-là on écrit des fichiers là où
 * personne n'ira les chercher.
 */
let choisi: Promise<Coffre> | null = null;

export function coffre(): Promise<Coffre> {
  if (!choisi) {
    choisi =
      process.env.COFFRE === 'hostinger'
        ? import('./coffre-hostinger').then((m) => m.coffreHostinger())
        : import('./coffre-disque').then((m) => m.coffreDisque());
  }
  return choisi;
}
