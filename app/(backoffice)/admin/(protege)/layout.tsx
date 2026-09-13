import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { lireEntreprise } from '@/lib/entreprise';
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

  // Le nom en tête de menu est celui de l'entreprise, pas une constante : le
  // changer dans Paramètres doit se voir ici aussi, sans quoi le BackOffice
  // continuerait d'appeler Kevin par un nom qu'il vient d'abandonner.
  const { nom, liens } = await lireEntreprise();

  // Les pages légales du site, à portée de clic depuis le BackOffice : c'est
  // ici que Kevin les modifie, et il doit pouvoir vérifier ce qu'elles
  // affichent sans aller les chercher dans le pied de page du site.
  const legaux = [
    { href: liens.mentions, libelle: 'Mentions légales' },
    { href: liens.cookies, libelle: 'Confidentialité' },
    { href: liens.cgv, libelle: 'Conditions de vente' },
  ].filter((l) => l.href);

  return (
    <div className="bo bo-cadre">
      <MenuBackOffice utilisateur={utilisateur} nomEntreprise={nom} deconnexion={actionDeconnexion} />
      <main className="bo-contenu">
        {children}

        {legaux.length ? (
          <footer className="bo-pied-page">
            {legaux.map((l) => (
              <a
                key={l.libelle}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Ouvrir « ${l.libelle} » sur le site`}
              >
                {l.libelle}
              </a>
            ))}
          </footer>
        ) : null}
      </main>
    </div>
  );
}
