'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Tenir les onglets du BackOffice d'accord entre eux.
 *
 * Un changement fait dans un onglet ne traversait pas vers les autres :
 * `revalidatePath` rafraîchit le cache du serveur et l'onglet qui a agi, pas
 * ceux déjà ouverts ailleurs. Mesuré : deux onglets sur la boîte de réception,
 * l'un ouvre un message, l'autre affiche encore « 1 non lu » tant qu'on ne le
 * recharge pas.
 *
 * Deux déclencheurs, et aucun n'essaie d'être malin.
 *
 * **Le retour sur l'onglet.** C'est le cas courant, et de loin : on ne tape que
 * dans un onglet à la fois, puis on revient dans l'autre. Le rafraîchir à ce
 * moment-là suffit, et ne coûte rien quand rien n'a bougé.
 *
 * **Un battement pendant qu'il est visible.** Pour les écrans posés côte à
 * côte, où personne ne reprend le focus. Trente secondes : assez pour que deux
 * personnes ne se marchent pas dessus, assez peu pour ne rien peser. Les pages
 * du BackOffice sont `force-dynamic`, donc ce battement n'écrit pas dans le
 * cache de Cloudflare — il ne consomme que la base, et rien du forfait KV.
 *
 * ———
 *
 * **Ce qui a été essayé et jeté.** Annoncer chaque écriture aux autres onglets
 * par un `BroadcastChannel`, en reconnaissant les actions serveur à leur
 * en-tête `Next-Action` depuis une enveloppe autour de `window.fetch`.
 *
 * Ça ne marche pas : Next 16 ne fait pas passer ses actions par `window.fetch`.
 * Il en garde sa propre référence, prise au chargement du module, qu'aucune
 * enveloppe posée ensuite n'atteint. Vérifié en comptant les requêtes vues par
 * l'enveloppe pendant une action : zéro.
 *
 * Un battement régulier fait le même travail sans rien détourner.
 */
const BATTEMENT = 30_000;

export function SynchroOnglets() {
  const router = useRouter();

  useEffect(() => {
    let minuteur: ReturnType<typeof setInterval> | null = null;

    const battre = () => {
      if (minuteur) return;
      minuteur = setInterval(() => router.refresh(), BATTEMENT);
    };
    const cesser = () => {
      if (!minuteur) return;
      clearInterval(minuteur);
      minuteur = null;
    };

    const auChangement = () => {
      if (document.visibilityState === 'visible') {
        // Au retour, on ne fait pas attendre le prochain battement.
        router.refresh();
        battre();
      } else {
        cesser();
      }
    };

    auChangement();
    document.addEventListener('visibilitychange', auChangement);
    return () => {
      document.removeEventListener('visibilitychange', auChangement);
      cesser();
    };
  }, [router]);

  return null;
}
