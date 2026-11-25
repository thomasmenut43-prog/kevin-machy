import { utilisateurConnecte } from '@/lib/auth';
import { boiteDeKevin, listerMessages } from '@/lib/messages';
import { BoiteMessages } from './BoiteMessages';

export const metadata = { title: 'Messages' };
export const dynamic = 'force-dynamic';

export default async function PageMessages() {
  const [messages, utilisateur, boite] = await Promise.all([
    listerMessages(),
    utilisateurConnecte(),
    boiteDeKevin(),
  ]);
  const nonLus = messages.filter((m) => !m.lu).length;

  return (
    <>
      <div>
        <h1 className="bo-titre">Messages</h1>
        <p className="bo-sous-titre">
          Les demandes reçues par le formulaire de contact. Elles sont enregistrées ici avant
          d’être envoyées par e-mail : une panne du serveur d’envoi n’en fait perdre aucune.
        </p>
      </div>

      <BoiteMessages
        messages={messages.map((m) => ({ ...m, creeLe: m.creeLe.toISOString() }))}
        nonLus={nonLus}
        administrateur={utilisateur?.role === 'administrateur'}
        boite={boite}
      />
    </>
  );
}
