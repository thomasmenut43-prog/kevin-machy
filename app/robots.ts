import type { MetadataRoute } from 'next';
import { lireEntreprise } from '@/lib/entreprise';

export const dynamic = 'force-static';

/**
 * Ce que les moteurs de recherche ont le droit de lire.
 *
 * **Tant que `INDEXATION` ne vaut pas `ouverte`, tout est refusé.** Le nouveau
 * site vit à `kevinmachy.fr` pendant que l'ancien répond encore à
 * `dronezvous.com` : laisser les deux s'indexer donnerait à Google deux sites du
 * même photographe, traitant des mêmes sujets, et il répartirait entre eux ce
 * qui devrait aller à un seul.
 *
 * L'interrupteur se lève le jour de la mise en ligne, dans
 * `.github/workflows/deploiement.yml` — en même temps que `dronezvous.com`
 * basculera en redirection. Les deux gestes vont ensemble : ouvrir
 * l'indexation avant que l'ancien site ne redirige recrée exactement le
 * problème qu'on évite.
 *
 * Un `Disallow` n'est pas une serrure : il demande aux moteurs honnêtes de
 * s'abstenir, il n'empêche personne d'ouvrir la page. C'est suffisant ici —
 * ce qu'on protège, c'est un classement, pas un secret.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { url } = await lireEntreprise();

  if (process.env.INDEXATION !== 'ouverte') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${url}/sitemap.xml`,
  };
}
