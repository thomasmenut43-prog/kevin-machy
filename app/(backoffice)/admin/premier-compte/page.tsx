import { redirect } from 'next/navigation';
import { aucunCompte } from '@/lib/auth';
import { FormulairePremierCompte } from '../Formulaires';

export const metadata = { title: 'Premier compte' };
export const dynamic = 'force-dynamic';

export default async function PagePremierCompte() {
  // Cet écran ne s'ouvre qu'une fois, sur une base vide.
  if (!(await aucunCompte())) redirect('/admin/connexion/');

  return (
    <main className="bo bo-accueil">
      <div className="bo-carte">
        <div className="bo-marque">
          <strong>Kevin Machy</strong>
          <span>Premier compte</span>
        </div>
        <p className="bo-aide">
          Personne n’est encore enregistré. Ce premier compte sera administrateur : lui seul
          pourra ensuite en créer d’autres.
        </p>
        <FormulairePremierCompte />
      </div>
    </main>
  );
}
