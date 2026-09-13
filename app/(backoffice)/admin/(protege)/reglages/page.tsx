import { utilisateurConnecte } from '@/lib/auth';
import { lireSmtpAffichable } from '@/lib/courrier';
import { ReglagesEmail } from './ReglagesEmail';

export const metadata = { title: 'Réglages' };
export const dynamic = 'force-dynamic';

export default async function PageReglages() {
  const [reglages, utilisateur] = await Promise.all([lireSmtpAffichable(), utilisateurConnecte()]);

  return (
    <>
      <div>
        <h1 className="bo-titre">Réglages</h1>
        <p className="bo-sous-titre">
          L’envoi des e-mails du site : notifications de demande et accusés de réception.
        </p>
      </div>

      {utilisateur?.role === 'administrateur' ? (
        <ReglagesEmail reglages={reglages} />
      ) : (
        <p className="bo-aide">
          Ces réglages touchent tout le site. Seul un administrateur peut les modifier.
        </p>
      )}
    </>
  );
}
