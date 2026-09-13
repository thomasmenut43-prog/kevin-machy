import { listerDossiers, listerMedias } from '@/lib/medias';
import { Mediatheque } from './Mediatheque';

export const metadata = { title: 'Médiathèque' };
export const dynamic = 'force-dynamic';

export default async function PageMediatheque() {
  const [medias, dossiers] = await Promise.all([listerMedias(500), listerDossiers()]);

  return (
    <>
      <div>
        <h1 className="bo-titre">Médiathèque</h1>
        <p className="bo-sous-titre">
          Vos photographies. Chaque image envoyée est redimensionnée en quatre largeurs, et le
          navigateur choisit celle qu’il lui faut.
        </p>
      </div>

      <Mediatheque medias={medias} dossiers={dossiers} />
    </>
  );
}
