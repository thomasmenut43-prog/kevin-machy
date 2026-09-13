import { headers } from 'next/headers';
import {
  empreinteVisiteur,
  enregistrerEvenement,
  enregistrerVisite,
  estMobile,
  sourceDepuis,
} from '@/lib/audience';

/**
 * Point de collecte de la mesure d'audience.
 *
 * Public par nécessité : c'est le navigateur du visiteur qui appelle. Il
 * n'accepte donc que le strict nécessaire, et ne renvoie jamais rien
 * d'exploitable — pas même un accusé de réception détaillé.
 *
 * L'adresse IP sert uniquement à calculer l'empreinte du jour, en mémoire, et
 * n'est jamais écrite.
 */
export async function POST(requete: Request) {
  try {
    const corps = await requete.json();
    const chemin = String(corps?.chemin ?? '');

    // Un chemin absolu du site, rien d'autre. Pas d'adresse complète, pas de
    // chaîne de recherche : elles pourraient charrier des données personnelles.
    if (!/^\/[a-z0-9\-/._]*$/i.test(chemin) || chemin.length > 300) {
      return new Response(null, { status: 204 });
    }

    const entetes = await headers();
    const navigateur = entetes.get('user-agent') ?? '';
    const adresse = (entetes.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
    const visiteur = empreinteVisiteur(adresse, navigateur);

    if (corps?.evenement) {
      await enregistrerEvenement({ nom: String(corps.evenement), chemin, visiteur });
    } else {
      await enregistrerVisite({
        chemin,
        visiteur,
        source: sourceDepuis(corps?.referent ?? null, entetes.get('host')),
        mobile: estMobile(navigateur),
      });
    }
  } catch {
    // La mesure ne doit jamais rien casser ni rien révéler : on se tait.
  }

  return new Response(null, { status: 204 });
}
