import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RenduSections } from '@/components/sections/RenduSections';
import { mediasParIds } from '@/lib/medias';
import { idsImages, pagePublieeParChemin } from '@/lib/pages';
import { enTexteNu } from '@/lib/texteRiche';
import { lireEntreprise } from '@/lib/entreprise';
import { METADONNEES_INDISPONIBLE, SiteIndisponible } from '@/components/SiteIndisponible';

/**
 * Les pages sont pré-rendues, puis revérifiées toutes les heures.
 *
 * C'est ce qui permet à une construction faite sans base — un environnement
 * monté avant elle — de se rattraper toute seule : la page d'attente qu'elle
 * aura produite cède la place au vrai contenu dès que la base répond, sans
 * qu'il faille reconstruire. Une publication depuis l'éditeur, elle, n'attend
 * pas ce délai : `revalidatePath` rafraîchit la page sur-le-champ.
 *
 * ———
 *
 * **Pourquoi une journée.** Chaque revérification écrit dans
 * Workers KV, et le forfait gratuit en autorise mille par jour. Quinze pages
 * revérifiées toutes les cinq minutes, c'est jusqu'à quatre mille trois cents
 * écritures — le plafond pouvait tomber sur le seul trafic du site, sans
 * qu'on déploie quoi que ce soit.
 *
 * Il est tombé le 3 octobre 2026, à force d'interroger les pages pour vérifier
 * des correctifs. Les déploiements n'y étaient pour presque rien : ils coûtent
 * quinze écritures chacun.
 *
 * À l'heure, le pire des cas tombait à trois cent soixante. Ça n'a pas suffi :
 * le 7 octobre 2026 le plafond est retombé, et cette fois les conséquences se
 * sont vues depuis l'extérieur. Un cache qui ne peut plus s'écrire est un cache
 * qui ne se renouvelle jamais : chaque visite tente alors de reconstruire la
 * page, et un Worker gratuit n'a que dix millisecondes de calcul pour le faire.
 * D'où des erreurs 1102 sur un site qui marchait la veille.
 *
 * La raison du dépassement est qu'une page ne coûte pas une écriture mais
 * plusieurs — l'en-tête `Vary` du site annonce quatre variantes. Vingt pages
 * toutes les heures, et on dépasse le millier sans rien faire.
 *
 * À la journée, le pire des cas tombe sous la centaine. Et rien n'est perdu :
 * le contenu ne bouge que quand Kevin publie, ce qui invalide immédiatement.
 * Ce délai ne rattrape qu'une écriture faite directement en base — ce que seuls
 * les scripts de correction font, et ils redéploient derrière.
 */
export const revalidate = 86400;

/**
 * La page d'accueil, servie depuis la base.
 *
 * Elle était écrite en JSX ; elle est désormais une pile de sections que Kevin
 * modifie depuis l'éditeur. Le rendu passe par les mêmes composants qu'avant,
 * si bien que rien ne change à l'écran.
 *
 * Son adresse est la chaîne vide : c'est la seule page dont le chemin ne
 * s'écrit pas, et l'attrape-tout des autres pages ne peut pas la servir.
 */
export async function generateMetadata(): Promise<Metadata> {
  const page = await pagePublieeParChemin('').catch(() => null);
  if (!page) return METADONNEES_INDISPONIBLE;

  const description = page.metaDescription ?? premierChapo(page) ?? undefined;

  const entreprise = await lireEntreprise();

  return {
    title: page.metaTitre ?? page.titre,
    description,
    alternates: { canonical: '/' },
    robots: page.horsIndexation ? { index: false, follow: true } : undefined,
    openGraph: {
      title: page.metaTitre ?? page.titre,
      description,
      url: entreprise.url,
      images: [
        {
          url: page.metaImage ?? '/img/og-accueil.jpg',
          width: 1200,
          height: 630,
          alt: 'Photographie de Kevin Machy',
        },
      ],
    },
  };
}

export default async function Accueil() {
  // Base injoignable et page absente ne sont pas la même chose : la première
  // affiche un cadre d'attente, la seconde n'existe pas — mais l'accueil, lui,
  // existe toujours. Les deux mènent donc ici au même écran.
  const page = await pagePublieeParChemin('').catch(() => null);
  if (!page) return <SiteIndisponible />;

  const [medias, entreprise] = await Promise.all([
    mediasParIds(idsImages(page.sections)),
    lireEntreprise(),
  ]);
  return <RenduSections sections={page.sections} medias={medias} entreprise={entreprise} />;
}

function premierChapo(page: { sections: { valeurs: Record<string, unknown> }[] }) {
  for (const section of page.sections) {
    const v = section.valeurs as Record<string, any>;
    const nu = enTexteNu(v?.chapo?.contenu ?? v?.entete?.chapo ?? v?.texte?.contenu, 155);
    if (nu) return nu;
  }
  return null;
}
