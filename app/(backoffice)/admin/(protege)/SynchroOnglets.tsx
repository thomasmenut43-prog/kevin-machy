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
 * Un seul déclencheur, et il n’essaie pas d’être malin.
 *
 * **Le retour sur l'onglet.** C'est le cas courant, et de loin : on ne tape que
 * dans un onglet à la fois, puis on revient dans l'autre. Le rafraîchir à ce
 * moment-là suffit, et ne coûte rien quand rien n'a bougé.
 *
 * **Et c'est tout.** Il y avait un battement de trente secondes, pour les
 * écrans posés côte à côte. Il est retiré, et la raison vaut d'être écrite.
 *
 * J'avais vérifié qu'il n'écrivait pas dans le cache de Cloudflare — les pages
 * du BackOffice sont `force-dynamic` — et j'en avais conclu qu'il ne coûtait
 * rien. C'était regarder la mauvaise ressource. Un forfait Workers gratuit
 * accorde **dix millisecondes de calcul par requête**, et `force-dynamic` veut
 * précisément dire « reconstruire la page entière à chaque fois ». La
 * médiathèque, elle, crée plus de mille éléments.
 *
 * Le battement refaisait donc ce travail toutes les trente secondes, par
 * onglet ouvert, pendant des heures — deux cent quarante fois de quoi dépasser
 * la limite au lieu d'une. Kevin est tombé sur une erreur 1102 le lendemain.
 *
 * Le retour sur l'onglet suffit : il ne coûte rien tant que personne ne
 * revient, et c'est le seul moment où quelqu'un regarde l'écran.
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
 * Un battement régulier aurait fait le même travail sans rien détourner — c'est
 * ce qui avait été posé, puis retiré pour la raison dite plus haut.
 */
export function SynchroOnglets() {
  const router = useRouter();

  useEffect(() => {
    const auRetour = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    document.addEventListener('visibilitychange', auRetour);
    return () => document.removeEventListener('visibilitychange', auRetour);
  }, [router]);

  return null;
}
