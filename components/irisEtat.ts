'use client';

import { useSyncExternalStore } from 'react';

/** Identifiant du simulateur en place dans la page. Sert d'ancre et de cible d'observation. */
export const ANCRE_SIMULATEUR = 'simulateur-iris';

export type EtatIris = { humains: number; animaux: number };

/**
 * État partagé entre le simulateur posé dans la page et la barre qui le rappelle
 * en bas d'écran : ce que le visiteur règle dans l'un se lit dans l'autre.
 *
 * Un store de module suffit — il n'y a qu'un simulateur par page, et la valeur
 * initiale est une constante, donc le rendu serveur et la première passe client
 * disent la même chose.
 */
let etat: EtatIris = { humains: 1, animaux: 0 };
const abonnes = new Set<() => void>();

function lire() {
  return etat;
}

function abonner(rappel: () => void) {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

export function reglerIris(suivant: EtatIris) {
  etat = suivant;
  for (const rappel of abonnes) rappel();
}

export function useEtatIris() {
  return useSyncExternalStore(abonner, lire, lire);
}
