import 'server-only';
import type { Coffre, FichierLu } from './coffre';

/**
 * Les fichiers chez Hostinger, écrits par un guichet.
 *
 * L'application tourne sur Cloudflare, qui n'a pas de disque. Les
 * photographies restent pourtant ici : l'abonnement de Kevin offre cent
 * gigaoctets déjà payés, contre dix chez Cloudflare — et il faudrait y poser
 * une carte bancaire, même pour la part offerte.
 *
 * L'avantage ne s'arrête pas là. **Les images ne passent plus par le Worker
 * du tout.** Elles sont servies par Apache, à leur propre sous-domaine, ce qui
 * les rend plus vite et n'entame pas les cent mille requêtes quotidiennes de
 * Cloudflare — une page de vingt photos en vaudrait vingt-et-une.
 *
 * L'écriture, elle, passe par `hostinger/guichet-medias.php`, qui n'accepte
 * que trois gestes et exige un jeton partagé.
 */

const GUICHET = (process.env.GUICHET_MEDIAS ?? '').replace(/\/+$/, '');
const JETON = process.env.JETON_MEDIAS ?? '';
const PUBLIC = (process.env.NEXT_PUBLIC_BASE_MEDIAS ?? '').replace(/\/+$/, '');

function exiger(valeur: string, nom: string) {
  if (!valeur) {
    // Mieux vaut s'arrêter net que d'écrire dans le vide : sans ces réglages,
    // chaque image envoyée disparaîtrait sans que personne ne s'en aperçoive
    // avant de vouloir l'afficher.
    throw new Error(`${nom} est absent. Voir docs/cloudflare.md.`);
  }
  return valeur;
}

/** Appelle le guichet et lève si celui-ci refuse. */
async function appeler(parametres: Record<string, string>, corps?: BodyInit) {
  const url = new URL(exiger(GUICHET, 'GUICHET_MEDIAS'));
  for (const [cle, valeur] of Object.entries(parametres)) {
    url.searchParams.set(cle, valeur);
  }

  const reponse = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Jeton': exiger(JETON, 'JETON_MEDIAS'),
      'Content-Type': 'application/octet-stream',
    },
    body: corps ?? null,
  });

  if (!reponse.ok) {
    // Le message du guichet est court et sans détail exploitable : on peut le
    // remonter tel quel, il aide à comprendre sans rien révéler.
    const dit = await reponse.text().catch(() => '');
    throw new Error(`Guichet des médias : ${reponse.status} ${dit.slice(0, 200)}`);
  }
}

export function coffreHostinger(): Coffre {
  return {
    async ecrire(nom, octets) {
      // `octets` est une vue sur un tampon qui peut être plus grand : on
      // n'envoie que la portion utile, sans quoi l'image arriverait suivie
      // d'un fond de mémoire.
      const corps = octets.buffer.slice(
        octets.byteOffset,
        octets.byteOffset + octets.byteLength,
      ) as ArrayBuffer;
      await appeler({ action: 'poser', nom }, corps);
    },

    /**
     * La lecture ne passe pas par le guichet : les images sont publiques, et
     * Apache les sert déjà. Le guichet reste donc en écriture seule — autant
     * de surface exposée en moins.
     */
    async lire(nom): Promise<FichierLu | null> {
      const reponse = await fetch(`${exiger(PUBLIC, 'NEXT_PUBLIC_BASE_MEDIAS')}/${nom}`);
      if (!reponse.ok || !reponse.body) return null;
      return {
        corps: reponse.body as ReadableStream<Uint8Array>,
        octets: Number(reponse.headers.get('content-length') ?? 0),
      };
    },

    async effacer(nom) {
      await appeler({ action: 'effacer', nom });
    },

    async copier(de, vers) {
      await appeler({ action: 'copier', de, vers });
    },
  };
}
