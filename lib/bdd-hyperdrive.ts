import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';

/**
 * L'adresse de la base, vue depuis un Worker.
 *
 * Un Worker ne peut pas joindre une base MySQL directement : il est éphémère,
 * et rouvrirait une connexion à chaque invocation — poignée de main TCP, puis
 * TLS, puis authentification, soit plus de cent millisecondes avant la
 * première requête.
 *
 * Hyperdrive tient des connexions déjà ouvertes près de la base et les prête.
 * Il rend une adresse ordinaire, que `mysql2` sait utiliser telle quelle : de
 * là vient que rien d'autre ne change dans `lib/bdd.ts`.
 *
 * Ce module n'est chargé que si `BASE=hyperdrive`. Ailleurs il n'existe pas,
 * et l'application ne traîne pas de dépendance à Cloudflare.
 */

declare global {
  interface CloudflareEnv {
    /** La passerelle vers la base, déclarée dans `wrangler.jsonc`. */
    HYPERDRIVE?: Hyperdrive;
  }
}

export function adresseHyperdrive(): string {
  const { env } = getCloudflareContext();
  if (!env.HYPERDRIVE) {
    // Mieux vaut s'arrêter net : sans cette liaison, chaque page se replierait
    // sur « le site revient dans un instant » sans qu'on sache pourquoi.
    throw new Error('La liaison Hyperdrive « HYPERDRIVE » est absente de wrangler.jsonc.');
  }

  // Hyperdrive glisse un `ssl-mode` dans son adresse. `mysql2` ne connaît pas
  // ce nom : il s'en plaint aujourd'hui, et promet d'en faire une erreur dans
  // une version à venir. On le retire ici plutôt que de découvrir la panne le
  // jour d'une mise à jour — le chiffrement se règle entre Hyperdrive et la
  // base, pas entre le Worker et Hyperdrive.
  const url = new URL(env.HYPERDRIVE.connectionString);
  url.searchParams.delete('ssl-mode');
  return url.toString();
}
