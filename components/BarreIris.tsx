'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { grilleIrisRenseignee, tarifIris } from '@/lib/site';
import { ANCRE_SIMULATEUR, useEtatIris } from './irisEtat';
import { euros } from './SimulateurIris';
import s from './BarreIris.module.css';

type Props = {
  /** Réservation en ligne, pour les combinaisons couvertes par la grille. */
  hrefReservation: string;
  /** Où envoyer quand la combinaison sort de la grille. */
  hrefDevis: string;
};

/**
 * Rappel de tarif en bas d'écran, une fois le simulateur dépassé.
 *
 * Il ne duplique pas le simulateur : il en montre le résultat et propose
 * l'action. Le réglage reste à sa place dans la page, et un clic sur le
 * montant y ramène.
 */
export function BarreIris({ hrefReservation, hrefDevis }: Props) {
  const { humains, animaux } = useEtatIris();
  const [depasse, setDepasse] = useState(false);
  const [replie, setReplie] = useState(false);

  useEffect(() => {
    const simulateur = document.getElementById(ANCRE_SIMULATEUR);
    if (!simulateur) return;
    const pied = document.querySelector('footer');

    let passe = false;
    let auPied = false;
    const appliquer = () => setDepasse(passe && !auPied);

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.target === simulateur) {
            // Uniquement une fois le simulateur sorti par le haut. Tant qu'il
            // est à l'écran, ou encore plus bas, la barre n'a rien à dire.
            passe = !entree.isIntersecting && entree.boundingClientRect.bottom < 0;
          } else {
            // Arrivé au pied de page, la barre s'efface : l'appel à l'action y
            // est déjà, et elle recouvrirait les mentions.
            auPied = entree.isIntersecting;
          }
        }
        appliquer();
      },
      { threshold: 0 },
    );

    observateur.observe(simulateur);
    if (pied) observateur.observe(pied);
    return () => observateur.disconnect();
  }, []);

  // Revenir sur le simulateur remet la barre en service : le repli vaut pour
  // le passage en cours, pas pour la visite entière.
  useEffect(() => {
    if (!depasse) setReplie(false);
  }, [depasse]);

  if (!grilleIrisRenseignee) return null;

  const visible = depasse && !replie;
  const iris = humains + animaux;
  const palier = tarifIris(humains, animaux);

  return (
    <aside
      className={s.barre}
      data-visible={visible ? '' : undefined}
      inert={!visible}
      aria-label="Rappel du tarif simulé"
    >
      <div className={s.contenu}>
        <a className={s.rappel} href={`#${ANCRE_SIMULATEUR}`}>
          <span className={s.compte}>
            {iris} iris<span className={s.duree}>{palier ? ` · ${palier.duree}` : ''}</span>
          </span>
          {palier ? (
            <span className={s.montant}>{euros(palier.prix)}</span>
          ) : (
            <span className={s.devis}>Sur devis</span>
          )}
        </a>

        {palier ? (
          <a
            className={`bouton ${s.action}`}
            href={hrefReservation}
            target="_blank"
            rel="noopener noreferrer"
          >
            Réserver
          </a>
        ) : (
          <Link className={`bouton ${s.action}`} href={hrefDevis}>
            Écrivez-moi
          </Link>
        )}

        <button
          type="button"
          className={s.replier}
          onClick={() => setReplie(true)}
          aria-label="Masquer le rappel de tarif"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
    </aside>
  );
}
