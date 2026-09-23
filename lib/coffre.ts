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
 * `COFFRE=r2` bascule sur R2. Absent, on écrit sur le disque.
 *
 * Le choix est explicite plutôt que deviné. Renifler l'environnement marche
 * jusqu'au jour où il se trompe, et ce jour-là on écrit des fichiers là où
 * personne n'ira les chercher.
 */
const SUR_R2 = process.env.COFFRE === 'r2';

let choisi: Promise<Coffre> | null = null;

export function coffre(): Promise<Coffre> {
  if (!choisi) {
    choisi = SUR_R2
      ? import('./coffre-r2').then((m) => m.coffreR2())
      : import('./coffre-disque').then((m) => m.coffreDisque());
  }
  return choisi;
}
