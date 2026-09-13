'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Compte les pages vues et les gestes qui comptent.
 *
 * Aucun cookie, aucun stockage dans le navigateur, rien à demander au visiteur.
 * Le signal part en arrière-plan et n'attend pas de réponse : il ne retarde
 * jamais l'affichage.
 *
 * Deux abstentions volontaires : le signal « Ne pas me pister » du navigateur
 * est respecté, et l'aperçu du BackOffice n'est pas compté — sinon Kevin
 * gonflerait ses propres chiffres en travaillant.
 */
export function Mesure() {
  const chemin = usePathname();

  useEffect(() => {
    if (navigator.doNotTrack === '1' || window.self !== window.top) return;

    const envoyer = (donnees: Record<string, unknown>) => {
      const corps = JSON.stringify({ chemin, ...donnees });
      // `sendBeacon` survit à la fermeture de l'onglet, là où `fetch` serait
      // annulé : un clic sortant serait sinon perdu une fois sur deux.
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/mesure', new Blob([corps], { type: 'application/json' }));
      } else {
        fetch('/api/mesure', { method: 'POST', body: corps, keepalive: true }).catch(() => {});
      }
    };

    envoyer({ referent: document.referrer || null });

    // Les gestes suivis sont ceux qui rapportent : réserver, appeler, écrire.
    const auClic = (ev: MouseEvent) => {
      const lien = (ev.target as HTMLElement | null)?.closest?.('a');
      if (!lien) return;
      const href = lien.getAttribute('href') ?? '';

      const nom = href.startsWith('tel:')
        ? 'appel'
        : href.includes('sumupbookings')
          ? 'reservation'
          : href.includes('pic-time')
            ? 'acces-clients'
            : null;

      if (nom) envoyer({ evenement: nom });
    };

    document.addEventListener('click', auClic, { capture: true });
    return () => document.removeEventListener('click', auClic, { capture: true });
  }, [chemin]);

  return null;
}
