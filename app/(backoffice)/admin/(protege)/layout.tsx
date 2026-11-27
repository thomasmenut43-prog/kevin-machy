import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { lireEntreprise } from '@/lib/entreprise';
import { compterNonLus } from '@/lib/messages';
import { MenuBackOffice } from '../Menu';
import { actionDeconnexion } from '../actions';
import { SynchroOnglets } from './SynchroOnglets';

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

  // Le nom en tête de menu est celui de l'entreprise, pas une constante : le
  // changer dans Paramètres doit se voir ici aussi, sans quoi le BackOffice
  // continuerait d'appeler Kevin par un nom qu'il vient d'abandonner.
  // Les non-lus se comptent ici, au-dessus de tous les écrans : la pastille de
  // l'onglet Messages doit se voir depuis n'importe où, pas seulement une fois
  // qu'on y est. Une panne de comptage ne doit pas fermer le BackOffice.
  const [{ nom }, nonLus] = await Promise.all([
    lireEntreprise(),
    compterNonLus().catch(() => 0),
  ]);

  return (
    <div className="bo bo-cadre">
      <SynchroOnglets />
      <MenuBackOffice
        utilisateur={utilisateur}
        nomEntreprise={nom}
        nonLus={nonLus}
        deconnexion={actionDeconnexion}
      />
      <main className="bo-contenu">{children}</main>
    </div>
  );
}
