'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { IRIS_GRILLE, grilleIrisRenseignee, tarifIris } from '@/lib/site';
import s from './SimulateurIris.module.css';

type Props = {
  /** Tarif affiché tant que la grille n'est pas renseignée. */
  repli: string;
  repliNote: string | null;
  /** Où envoyer quand la combinaison sort de la grille. */
  hrefDevis: string;
};

/** Espace fine insécable entre les milliers, comme en typographie française. */
function euros(montant: number) {
  return `${String(montant).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} €`;
}

function accord(nombre: number, singulier: string, pluriel: string) {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
}

function Compteur({
  etiquette,
  valeur,
  min,
  max,
  onChange,
  singulier,
  pluriel,
}: {
  etiquette: string;
  valeur: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  singulier: string;
  pluriel: string;
}) {
  const id = useId();
  return (
    <div className={s.compteur}>
      <span className={s.etiquette} id={id}>
        {etiquette}
      </span>
      <div className={s.reglage} role="group" aria-labelledby={id}>
        <button
          type="button"
          className={s.pas}
          onClick={() => onChange(valeur - 1)}
          disabled={valeur <= min}
          aria-label={`Retirer ${singulier}`}
        >
          <span aria-hidden="true">−</span>
        </button>
        <output className={s.valeur} aria-live="off">
          {String(valeur).padStart(2, '0')}
        </output>
        <button
          type="button"
          className={s.pas}
          onClick={() => onChange(valeur + 1)}
          disabled={valeur >= max}
          aria-label={`Ajouter ${singulier}`}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <span className="visuellement-cache">{accord(valeur, singulier, pluriel)}</span>
    </div>
  );
}

/**
 * Simulateur de la formule « Prise de vue » : le tarif dépend du nombre
 * d'humains et d'animaux photographiés, comme sur le site actuel.
 *
 * Les montants viennent exclusivement de `IRIS_GRILLE` (lib/site.ts).
 * Tant qu'elle est vide, le composant affiche le tarif « à partir de »
 * et ne simule rien : rien n'est interpolé ni deviné.
 */
export function SimulateurIris({ repli, repliNote, hrefDevis }: Props) {
  const [humains, setHumains] = useState(1);
  const [animaux, setAnimaux] = useState(0);

  if (!grilleIrisRenseignee) {
    return (
      <>
        <p className="prix" style={{ marginTop: '0.6rem' }}>
          {repli}
        </p>
        {repliNote ? <p className={s.mention}>{repliNote}</p> : null}
        {process.env.NODE_ENV === 'development' ? (
          <p className={s.attente}>
            Simulateur en attente de la grille de tarifs. Renseigner <code>IRIS_GRILLE.tarifs</code> dans{' '}
            <code>lib/site.ts</code> — il s’affiche dès la première entrée.
          </p>
        ) : null}
      </>
    );
  }

  const iris = humains + animaux;
  const palier = tarifIris(humains, animaux);

  // On ne descend jamais en dessous d'un sujet photographié.
  const minHumains = animaux > 0 ? 0 : 1;
  const minAnimaux = humains > 0 ? 0 : 1;

  const recap = [
    humains > 0 ? accord(humains, 'humain', 'humains') : null,
    animaux > 0 ? accord(animaux, 'animal', 'animaux') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={s.simulateur}>
      <div className={s.compteurs}>
        <Compteur
          etiquette="Nombre d’humains"
          valeur={humains}
          min={minHumains}
          max={IRIS_GRILLE.maxHumains}
          onChange={setHumains}
          singulier="un humain"
          pluriel="humains"
        />
        <Compteur
          etiquette="Nombre d’animaux"
          valeur={animaux}
          min={minAnimaux}
          max={IRIS_GRILLE.maxAnimaux}
          onChange={setAnimaux}
          singulier="un animal"
          pluriel="animaux"
        />
      </div>

      <p className={s.resultat} aria-live="polite">
        <span className={s.recap}>{recap}</span>
        <span className="visuellement-cache"> — </span>
        {palier === null ? (
          <span className={s.devis}>Sur devis</span>
        ) : (
          <span className={s.montant}>{euros(palier.prix)}</span>
        )}
      </p>

      {palier === null ? (
        <p className={s.mention}>
          Au-delà de cinq iris, la séance se construit sur mesure.{' '}
          <Link className="lien" href={hrefDevis} style={{ display: 'inline', border: 0, padding: 0 }}>
            Écrivez-moi
          </Link>{' '}
          et je vous réponds avec un tarif.
        </p>
      ) : (
        <p className={s.mention}>
          {accord(iris, 'iris photographié', 'iris photographiés')} · séance de {palier.duree}.
        </p>
      )}
    </div>
  );
}
