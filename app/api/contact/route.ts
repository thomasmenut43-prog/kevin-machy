import { headers } from 'next/headers';
import { traiterDemande } from '@/lib/contact';

/**
 * Le guichet du formulaire de contact.
 *
 * Il ne fait que deux choses : retrouver l'adresse de l'appelant, et passer le
 * reste à `lib/contact`. Toute la défense contre les robots est là-bas, parce
 * qu'elle ne dépend pas du transport — le jour où un `contact.php` prendra le
 * relais sur un hébergement sans Node, il aura les mêmes règles à appliquer.
 *
 * Il vit sous `app/api/`, que l'export statique écarte : une vitrine figée n'a
 * pas de guichet à elle, elle s'adresse à celui d'à côté.
 */
export async function POST(requete: Request) {
  const brut = await requete.json().catch(() => null);
  if (!brut || typeof brut !== 'object') {
    return Response.json({ erreur: 'Demande illisible.' }, { status: 400 });
  }

  // L'adresse sert au comptage horaire, et à rien d'autre. Elle n'est jamais
  // écrite à côté du message.
  const entetes = await headers();
  const ip = (entetes.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';

  const { etat, code } = await traiterDemande(brut as Record<string, unknown>, ip);
  return Response.json(etat, { status: code });
}
