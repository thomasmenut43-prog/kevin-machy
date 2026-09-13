'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ReglagesEmail } from './(protege)/reglages/ReglagesEmail';
import { Comptes, MonMotDePasse } from './(protege)/utilisateurs/Comptes';
import { Integrations } from './Integrations';
import { actionFermerAutresSessions } from './(protege)/utilisateurs/actions';
import { actionParametres, type Parametres } from './(protege)/reglages/actions';

/**
 * Les paramètres, en fenêtre plutôt qu'en page.
 *
 * Ce sont des réglages que l'on ouvre, que l'on ajuste et que l'on referme :
 * les envoyer sur un écran à part ferait perdre à Kevin l'endroit où il était.
 * La fenêtre garde le contexte derrière elle, et les onglets rangent les
 * réglages par sujet plutôt qu'en une longue colonne.
 *
 * Les données ne sont lues qu'à l'ouverture : tant que la fenêtre reste
 * fermée, elle ne coûte pas une requête.
 */

type Onglet = 'compte' | 'utilisateurs' | 'emails' | 'integrations';

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: 'compte', libelle: 'Mon compte' },
  { id: 'utilisateurs', libelle: 'Utilisateurs' },
  { id: 'emails', libelle: 'E-mails' },
  { id: 'integrations', libelle: 'Intégrations' },
];

export function ModaleParametres({ onFermer }: { onFermer: () => void }) {
  const [onglet, setOnglet] = useState<Onglet>('compte');
  const [donnees, setDonnees] = useState<Parametres | null>(null);
  const [enCours, demarrer] = useTransition();
  const panneau = useRef<HTMLDivElement>(null);

  useEffect(() => {
    actionParametres().then(setDonnees).catch(() => setDonnees(null));
  }, []);

  // Échap referme, et le premier onglet prend le clavier : une fenêtre qui
  // s'ouvre sans donner le focus laisse la tabulation derrière elle.
  useEffect(() => {
    const touche = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', touche);
    panneau.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', touche);
  }, [onFermer]);

  return (
    <div
      className="bo-modale-fond"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onFermer();
      }}
    >
      <div
        className="bo-modale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-parametres"
        ref={panneau}
      >
        <div className="bo-modale-tete">
          <div>
            <h2 id="titre-parametres">Paramètres</h2>
            <p>Les réglages qui valent pour tout le site.</p>
          </div>
          <button type="button" className="bo-modale-fermer" onClick={onFermer} title="Fermer">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
            <span className="visuellement-cache">Fermer les paramètres</span>
          </button>
        </div>

        <div className="bo-modale-onglets" role="tablist" aria-label="Sujets de réglages">
          {/* La liste des comptes ne regarde que les administrateurs : un
              éditeur n'a rien à y faire, et l'onglet ne s'affiche pas. */}
          {ONGLETS.filter((o) => o.id !== 'utilisateurs' || donnees?.administrateur).map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              onClick={() => setOnglet(o.id)}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <div className="bo-modale-corps">
          {!donnees ? (
            <p className="bo-aide">Chargement…</p>
          ) : onglet === 'utilisateurs' ? (
            <Comptes
              comptes={donnees.comptes}
              moiId={donnees.moiId}
              administrateur={donnees.administrateur}
              monCompte={false}
            />
          ) : onglet === 'integrations' ? (
            donnees.administrateur ? (
              <Integrations />
            ) : (
              <p className="bo-aide">
                Les services extérieurs touchent tout le site. Seul un administrateur peut les
                brancher.
              </p>
            )
          ) : onglet === 'emails' ? (
            donnees.administrateur && donnees.smtp ? (
              <ReglagesEmail reglages={donnees.smtp} />
            ) : (
              <p className="bo-aide">
                Ces réglages touchent tout le site. Seul un administrateur peut les modifier.
              </p>
            )
          ) : (
            <MonMotDePasse
              sessions={donnees.sessions}
              enCours={enCours}
              onFermerAutres={() =>
                demarrer(async () => {
                  await actionFermerAutresSessions();
                })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
