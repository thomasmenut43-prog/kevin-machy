import 'server-only';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Coffre, FichierLu } from './coffre';

/**
 * Les fichiers sur le disque, à côté de l'application.
 *
 * C'est la mise en œuvre d'origine, et elle reste celle du développement et de
 * tout hébergement qui soit un vrai serveur.
 *
 * Le dossier est hors de `public/`, pour deux raisons qui tiennent toujours :
 * `public/` est figé à la construction, et une image envoyée après coup n'y
 * serait pas servie de façon fiable ; et ces fichiers appartiennent au serveur
 * et à ses sauvegardes, pas au dépôt.
 */
export const DOSSIER = path.resolve(process.cwd(), 'medias');

/**
 * Le nom ne vient jamais de l'extérieur sans avoir été filtré en amont, mais
 * on ne s'en remet pas à ça : un nom qui sortirait du dossier est refusé ici
 * aussi. Deux verrous valent mieux qu'un sur un accès disque.
 */
function chemin(nom: string) {
  const complet = path.resolve(DOSSIER, nom);
  if (complet !== path.join(DOSSIER, path.basename(nom))) {
    throw new Error(`Nom de fichier refusé : ${nom}`);
  }
  return complet;
}

export function coffreDisque(): Coffre {
  return {
    async ecrire(nom, octets) {
      await mkdir(DOSSIER, { recursive: true });
      await writeFile(chemin(nom), octets);
    },

    async lire(nom): Promise<FichierLu | null> {
      try {
        const complet = chemin(nom);
        const info = await stat(complet);
        if (!info.isFile()) return null;
        return {
          corps: Readable.toWeb(createReadStream(complet)) as ReadableStream<Uint8Array>,
          octets: info.size,
        };
      } catch {
        return null;
      }
    },

    async effacer(nom) {
      await rm(chemin(nom), { force: true }).catch(() => {});
    },

    async copier(de, vers) {
      await mkdir(DOSSIER, { recursive: true });
      await copyFile(chemin(de), chemin(vers)).catch(() => {});
    },
  };
}
