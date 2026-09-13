import { notFound } from 'next/navigation';
import { listerDossiers, listerMedias } from '@/lib/medias';
import { utilisateurConnecte } from '@/lib/auth';
import { listerPages, pageParId } from '@/lib/pages';
import { lireNavigation } from '@/lib/navigation';
import { Editeur } from '../Editeur';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const page = await pageParId(Number((await params).id));
  return { title: page ? page.titre : 'Page' };
}

export default async function PageEditeur({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [page, pages, medias, utilisateur, navigation, dossiers] = await Promise.all([
    pageParId(id),
    listerPages(),
    listerMedias(),
    utilisateurConnecte(),
    lireNavigation(),
    listerDossiers(),
  ]);
  if (!page) notFound();

  return <Editeur
      page={page}
      pages={pages.map((p) => ({ id: p.id, titre: p.titre, chemin: p.chemin, statut: p.statut }))}
      medias={medias}
      administrateur={utilisateur?.role === 'administrateur'}
      navigation={navigation}
      dossiers={dossiers}
    />;
}
