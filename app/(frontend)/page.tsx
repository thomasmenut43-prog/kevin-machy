import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RenduSections } from '@/components/sections/RenduSections';
import { mediasParIds } from '@/lib/medias';
import { idsImages, pagePublieeParChemin } from '@/lib/pages';
import { enTexteNu } from '@/lib/texteRiche';
import { lireEntreprise } from '@/lib/entreprise';
import { METADONNEES_INDISPONIBLE, SiteIndisponible } from '@/components/SiteIndisponible';

/**
 * Les pages sont pré-rendues, puis revérifiées toutes les cinq minutes.
 *
 * C'est ce qui permet à une construction faite sans base — un environnement
 * monté avant elle — de se rattraper toute seule : la page d'attente qu'elle
 * aura produite cède la place au vrai contenu dès que la base répond, sans
 * qu'il faille reconstruire. Une publication depuis l'éditeur, elle, n'attend
 * pas ces cinq minutes : elle rafraîchit la page sur-le-champ.
 */
export const revalidate = 300;

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
