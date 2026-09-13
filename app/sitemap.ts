import type { MetadataRoute } from 'next';
import { lireEntreprise } from '@/lib/entreprise';
import { cheminsPublies } from '@/lib/pages';

export const dynamic = 'force-static';

/**
 * Le plan du site, bâti sur les pages réellement publiées.
 *
 * La liste était écrite à la main : une page créée dans l'éditeur n'y entrait
 * pas, et une page dépubliée continuait d'y figurer. Le domaine, lui, vient
 * des informations de l'entreprise.
 *
 * Une page que son auteur a mise hors indexation n'y figure pas : l'annoncer
 * à Google tout en lui demandant de l'ignorer est contradictoire.
 *
 * L'accueil passe devant, les autres suivent : une page ajoutée par Kevin ne
 * vaut pas moins qu'une autre, d'où la même priorité pour toutes.
 *
 * Base injoignable — une construction lancée sans elle, par exemple — le plan
 * se réduit à l'accueil au lieu de faire échouer la construction entière. Un
 * plan du site incomplet se rattrape à la reconstruction suivante ; un
 * déploiement qui ne part pas, non.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ url }, chemins] = await Promise.all([
    lireEntreprise(),
    cheminsPublies({ indexablesSeulement: true }).catch(() => ['']),
  ]);
  const date = new Date();

  return chemins.map((chemin) => ({
    url: chemin ? `${url}/${chemin}/` : `${url}/`,
    lastModified: date,
    changeFrequency: 'monthly',
    priority: chemin ? 0.8 : 1,
  }));
}
