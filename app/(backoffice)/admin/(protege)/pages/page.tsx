import { redirect } from 'next/navigation';
import { pageDEntree } from '@/lib/pages';
import { FormulaireNouvellePage } from './Formulaires';

export const metadata = { title: 'Éditeur de site' };
export const dynamic = 'force-dynamic';

/**
 * L'éditeur s'ouvre sur une page, pas sur une liste.
 *
 * Kevin vient ici pour modifier son site, pas pour choisir dans un inventaire :
 * on le pose directement sur l'accueil, et le sélecteur du rail lui permet
 * d'en changer sans quitter l'écran.
 */
export default async function EntreeEditeur() {
  const derniere = await pageDEntree();
  if (derniere) redirect(`/admin/pages/${derniere.id}/`);

  return (
    <>
      <div>
        <h1 className="bo-titre">Éditeur de site</h1>
        <p className="bo-sous-titre">
          Aucune page pour l’instant. Créez la première : l’éditeur s’ouvrira dessus.
        </p>
      </div>
      <FormulaireNouvellePage />
    </>
  );
}
