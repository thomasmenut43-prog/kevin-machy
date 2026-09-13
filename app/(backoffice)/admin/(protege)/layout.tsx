import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { MenuBackOffice } from '../Menu';
import { actionDeconnexion } from '../actions';

/**
 * Ossature des écrans protégés.
 *
 * Le contrôle d'accès est ici, au-dessus de toutes les pages du groupe : une
 * page ajoutée demain est protégée sans que personne ait à y penser. C'est
 * l'inverse d'un contrôle recopié dans chaque fichier, où l'oubli finit
 * toujours par arriver.
 */
export const dynamic = 'force-dynamic';

export default async function DispositionProtegee({ children }: { children: ReactNode }) {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect('/admin/connexion/');

  return (
    <div className="bo bo-cadre">
      <MenuBackOffice utilisateur={utilisateur} deconnexion={actionDeconnexion} />
      <main className="bo-contenu">{children}</main>
    </div>
  );
}
