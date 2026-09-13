import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RenduSections } from '@/components/sections/RenduSections';
import { mediasParIds } from '@/lib/medias';
import { cheminsPublies, idsImages, pagePublieeParChemin, type Section } from '@/lib/pages';
import { enTexteNu } from '@/lib/texteRiche';
import { SITE } from '@/lib/site';
import { DonneesStructurees, schemaFaq, schemaFilAriane } from '@/lib/schema';

/**
 * Les pages créées dans l'éditeur.
 *
 * Cette route n'attrape que ce que les six pages écrites en code laissent
 * passer : un segment fixe l'emporte toujours sur un attrape-tout.
 */

// Les pages publiées sont pré-rendues à la construction, comme le reste du
// site. Une page publiée après coup est rendue à la demande puis mise en cache.
export const dynamicParams = true;

export async function generateStaticParams() {
  const chemins = await cheminsPublies().catch(() => []);
  return chemins.map((chemin) => ({ chemin: chemin.split('/') }));
}

type Params = { params: Promise<{ chemin: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chemin } = await params;
  const page = await pagePublieeParChemin(chemin.join('/'));
  if (!page) return {};

  const description =
    page.metaDescription ?? premierChapo(page.sections) ?? undefined;

  return {
    title: page.metaTitre ?? page.titre,
    description,
    alternates: { canonical: `/${page.chemin}/` },
    robots: page.horsIndexation ? { index: false, follow: true } : undefined,
    openGraph: {
      title: page.metaTitre ?? page.titre,
      description,
      url: `${SITE.url}/${page.chemin}/`,
      images: page.metaImage
        ? [{ url: page.metaImage, width: 1200, height: 630, alt: page.titre }]
        : undefined,
    },
  };
}

export default async function PageEditee({ params }: Params) {
  const { chemin } = await params;
  const page = await pagePublieeParChemin(chemin.join('/'));
  if (!page) notFound();

  // Toutes les images de la page en une seule requête, plutôt qu'une par image.
  const medias = await mediasParIds(idsImages(page.sections));

  // Une page qui pose des questions fréquentes les déclare aussi à Google,
  // qui les affiche dépliées sous le résultat de recherche.
  const questions = questionsFrequentes(page.sections);

  return (
    <>
      <DonneesStructurees
        data={schemaFilAriane([
          { nom: 'Accueil', chemin: '/' },
          { nom: page.titre, chemin: `/${page.chemin}/` },
        ])}
      />
      {questions.length ? <DonneesStructurees data={schemaFaq(questions)} /> : null}
      <RenduSections sections={page.sections} medias={medias} />
    </>
  );
}


/** Les questions de la première section « Questions fréquentes » visible. */
function questionsFrequentes(sections: Section[]) {
  const section = sections.find(
    (s) => s.type === 'faq' && !(s.valeurs as Record<string, any>)?.reglages?.masquee,
  );
  const liste = ((section?.valeurs as Record<string, any>)?.questions ?? []) as Record<string, any>[];
  return liste
    .map((q) => ({ q: String(q.question ?? ''), r: String(q.reponse ?? '') }))
    .filter((q) => q.q && q.r);
}

/** À défaut de description saisie, le premier chapô ou texte de la page. */
function premierChapo(sections: Section[]) {
  for (const section of sections) {
    const v = section.valeurs as Record<string, any>;
    const doc = v?.chapo?.contenu ?? v?.texte?.contenu;
    const nu = enTexteNu(doc, 155);
    if (nu) return nu;
  }
  return null;
}
