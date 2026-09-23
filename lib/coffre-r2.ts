import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Coffre, FichierLu } from './coffre';

/**
 * Les fichiers dans R2, le stockage d'objets de Cloudflare.
 *
 * Un Worker n'a pas de disque : c'est la seule façon d'y garder ce que Kevin
 * envoie. Dix gigaoctets sont offerts, et la sortie n'est pas facturée — ce
 * qui compte pour des photographies qu'on sert à chaque visite.
 *
 * Ce module n'est chargé que si `COFFRE=r2`. Ailleurs il n'existe pas, et
 * l'application ne traîne pas de client R2 dont elle n'a que faire.
 */

declare global {
  interface CloudflareEnv {
    /** Le seau des médias, déclaré dans `wrangler.jsonc`. */
    MEDIAS?: R2Bucket;
  }
}

function seau(): R2Bucket {
  const { env } = getCloudflareContext();
  if (!env.MEDIAS) {
    // Mieux vaut s'arrêter net que d'écrire dans le vide : sans cette liaison,
    // chaque image envoyée disparaîtrait sans que personne ne s'en aperçoive
    // avant de vouloir l'afficher.
    throw new Error('La liaison R2 « MEDIAS » est absente de wrangler.jsonc.');
  }
  return env.MEDIAS;
}

export function coffreR2(): Coffre {
  return {
    async ecrire(nom, octets) {
      await seau().put(nom, octets, {
        httpMetadata: { contentType: 'image/webp' },
      });
    },

    async lire(nom): Promise<FichierLu | null> {
      const objet = await seau().get(nom);
      if (!objet) return null;
      return { corps: objet.body as ReadableStream<Uint8Array>, octets: objet.size };
    },

    async effacer(nom) {
      await seau().delete(nom);
    },

    async copier(de, vers) {
      // R2 ne sait pas copier côté serveur depuis un Worker : on relit et on
      // réécrit. Les flux passent sans jamais tout charger en mémoire.
      const objet = await seau().get(de);
      if (!objet) return;
      await seau().put(vers, objet.body, {
        httpMetadata: { contentType: 'image/webp' },
      });
    },
  };
}
