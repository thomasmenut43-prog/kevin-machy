/**
 * Adaptation de Next.js pour Cloudflare Workers.
 *
 * Sans ces réglages, chaque visite recalculerait la page : le Worker
 * interrogerait la base, rendrait le HTML, et recommencerait au visiteur
 * suivant. Le site est déjà écrit pour éviter ça — ses pages portent
 * `revalidate = 300` — mais encore faut-il dire à Cloudflare **où** garder ce
 * qui a été calculé.
 *
 * Trois pièces, et chacune répond à un besoin précis.
 */
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache';
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache';

export default defineCloudflareConfig({
  /**
   * Où sont gardées les pages déjà calculées.
   *
   * KV plutôt que R2, pour une raison qui n'est pas technique : R2 exige
   * qu'une carte bancaire soit enregistrée sur le compte, même pour sa part
   * gratuite. KV n'en demande pas, et son gigaoctet offert dépasse de loin ce
   * que pèsent les pages d'un site vitrine.
   */
  incrementalCache: kvIncrementalCache,

  /**
   * Ce qui fait que « Publier » met le site à jour.
   *
   * Quand Kevin publie une page, l'éditeur appelle `revalidatePath`. Pour
   * savoir quelles pages en cache cela concerne, il faut avoir noté quelque
   * part ce que chacune contient : c'est le rôle de ce registre. Sans lui, le
   * bouton Publier n'aurait aucun effet visible avant cinq minutes.
   */
  tagCache: d1NextTagCache,

  /**
   * Comment une page périmée est refaite.
   *
   * `direct` la recalcule dans la foulée de la requête qui l'a trouvée
   * périmée. L'autre voie passe par des objets durables, utiles quand les
   * régénérations se bousculent — ce qui suppose un trafic que ce site n'aura
   * pas. Ici, la simplicité vaut mieux qu'une pièce de plus à entretenir.
   */
  queue: 'direct',
});
