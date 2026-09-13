import { redirect } from 'next/navigation';
import { aucunCompte, utilisateurConnecte } from '@/lib/auth';
import { FormulaireConnexion } from '../Formulaires';

export const metadata = { title: 'Connexion' };
export const dynamic = 'force-dynamic';

export default async function PageConnexion() {
  // Tant qu'aucun compte n'existe, il n'y a rien à quoi se connecter.
  if (await aucunCompte()) redirect('/admin/premier-compte/');
  if (await utilisateurConnecte()) redirect('/admin/');

  return (
    <main className="bo bo-accueil">
      <div className="bo-carte">
        <div className="bo-marque">
          <strong>Kevin Machy</strong>
          <span>BackOffice</span>
        </div>
        <FormulaireConnexion />
      </div>
    </main>
  );
}
