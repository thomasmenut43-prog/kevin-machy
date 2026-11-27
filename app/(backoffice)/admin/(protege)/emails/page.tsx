import Link from 'next/link';
import { notFound } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { echec, ouvrirBoite } from '@/lib/boite-mail';
import { lireSmtp } from '@/lib/courrier';
import { BoiteMail } from './BoiteMail';

export const metadata = { title: 'Boîte mail' };
export const dynamic = 'force-dynamic';

export default async function PageBoiteMail() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur?.role !== 'administrateur') notFound();

  const [reglages, ouverture] = await Promise.all([
    lireSmtp(),
    ouvrirBoite().then((r) => ({ ok: true as const, ...r }), echec),
  ]);
  const moi = reglages.identifiant || reglages.expediteurEmail;

  return (
    <>
      <div>
        <h1 className="bo-titre">Boîte mail</h1>
        <p className="bo-sous-titre">
          Votre boîte{moi ? ` ${moi}` : ''}, sans quitter le BackOffice. C’est la même que sur
          votre téléphone : ce que vous lisez ou envoyez ici s’y retrouve.
        </p>
      </div>

      {ouverture.ok ? (
        <BoiteMail
          dossiers={ouverture.dossiers}
          chemin={ouverture.chemin}
          emails={ouverture.emails}
          total={ouverture.total}
          moi={moi}
        />
      ) : (
        <div className="bo-encadre">
          <p className="bo-erreur" role="alert">
            {ouverture.message}
          </p>
          <p className="bo-aide" style={{ marginTop: 10 }}>
            Le serveur de réception se règle dans{' '}
            <Link href="/admin/reglages/">Réglages → E-mails</Link>, avec le même identifiant et le
            même mot de passe que l’envoi.
          </p>
        </div>
      )}
    </>
  );
}
