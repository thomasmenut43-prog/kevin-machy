import { listerUtilisateurs, utilisateurConnecte } from '@/lib/auth';
import { Comptes } from './Comptes';

export const metadata = { title: 'Utilisateurs' };
export const dynamic = 'force-dynamic';

export default async function PageUtilisateurs() {
  const [comptes, moi] = await Promise.all([listerUtilisateurs(), utilisateurConnecte()]);

  return (
    <>
      <div>
        <h1 className="bo-titre">Utilisateurs</h1>
        <p className="bo-sous-titre">
          Qui peut entrer dans le BackOffice. L’éditeur modifie le contenu du site ;
          l’administrateur gère en plus les comptes et les réglages.
        </p>
      </div>

      <Comptes
        comptes={comptes.map((c) => ({
          ...c,
          creeLe: c.creeLe.toISOString(),
          derniereConnexion: c.derniereConnexion?.toISOString() ?? null,
        }))}
        moiId={moi?.id ?? 0}
        administrateur={moi?.role === 'administrateur'}
      />
    </>
  );
}
