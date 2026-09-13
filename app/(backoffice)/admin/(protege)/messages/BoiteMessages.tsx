'use client';

import { useState, useTransition } from 'react';
import { actionMarquerLu, actionSupprimerMessage } from './actions';
import b from './messages.module.css';

type Message = {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  projet: string | null;
  dateProjet: string | null;
  message: string;
  lu: boolean;
  envoi: 'en_attente' | 'envoye' | 'echec';
  envoiDetail: string | null;
  creeLe: string;
};

export function BoiteMessages({
  messages,
  nonLus,
  administrateur,
}: {
  messages: Message[];
  nonLus: number;
  administrateur: boolean;
}) {
  const [ouvert, setOuvert] = useState<number | null>(messages.find((m) => !m.lu)?.id ?? null);
  const [enCours, demarrer] = useTransition();

  if (!messages.length) {
    return (
      <p className="bo-aide">
        Aucun message pour l’instant. Ils arriveront ici dès qu’un visiteur remplira le formulaire
        de contact.
      </p>
    );
  }

  const echecs = messages.filter((m) => m.envoi === 'echec').length;

  return (
    <>
      <p className={b.compteur}>
        {nonLus > 0 ? `${nonLus} non lu${nonLus > 1 ? 's' : ''} sur ${messages.length}.` : `${messages.length} message${messages.length > 1 ? 's' : ''}, tous lus.`}
      </p>

      {echecs > 0 ? (
        <p className={b.alerte}>
          {echecs} notification{echecs > 1 ? 's' : ''} n’{echecs > 1 ? 'ont' : 'a'} pas pu partir
          par e-mail. Les demandes sont là, mais vous n’avez rien reçu dans votre boîte. Vérifiez
          Réglages → E-mails.
        </p>
      ) : null}

      <ul className={b.liste}>
        {messages.map((m) => {
          const deplie = ouvert === m.id;

          return (
            <li key={m.id} className={b.item} data-nonlu={!m.lu ? '' : undefined}>
              <button
                type="button"
                className={b.tete}
                onClick={() => {
                  setOuvert(deplie ? null : m.id);
                  if (!m.lu) demarrer(() => actionMarquerLu(m.id, true));
                }}
                aria-expanded={deplie}
              >
                <span className={b.identite}>
                  <strong>{m.nom}</strong>
                  <span>{m.email}</span>
                </span>
                <span className={b.meta}>
                  {m.projet ? <span className={b.etiquette}>{m.projet}</span> : null}
                  {m.envoi === 'echec' ? <span className={b.echec}>e-mail non parti</span> : null}
                  <time dateTime={m.creeLe}>{dateLisible(m.creeLe)}</time>
                </span>
              </button>

              {deplie ? (
                <div className={b.corps}>
                  <dl className={b.infos}>
                    {m.telephone ? (
                      <div>
                        <dt>Téléphone</dt>
                        <dd>
                          <a href={`tel:${m.telephone.replace(/\s/g, '')}`}>{m.telephone}</a>
                        </dd>
                      </div>
                    ) : null}
                    {m.dateProjet ? (
                      <div>
                        <dt>Date envisagée</dt>
                        <dd>{m.dateProjet}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <p className={b.texte}>{m.message}</p>

                  {m.envoi === 'echec' && m.envoiDetail ? (
                    <p className={b.alerte}>Échec de l’envoi : {m.envoiDetail}</p>
                  ) : null}

                  <div className={b.actions}>
                    <a className="bo-bouton" href={`mailto:${m.email}?subject=${encodeURIComponent(`Votre demande — ${m.nom}`)}`}>
                      Répondre
                    </a>
                    <button
                      type="button"
                      className="bo-bouton bo-bouton-discret"
                      disabled={enCours}
                      onClick={() => demarrer(() => actionMarquerLu(m.id, !m.lu))}
                    >
                      {m.lu ? 'Marquer non lu' : 'Marquer lu'}
                    </button>
                    {administrateur ? (
                      <button
                        type="button"
                        className={b.danger}
                        disabled={enCours}
                        onClick={() => demarrer(() => actionSupprimerMessage(m.id))}
                      >
                        Supprimer
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function dateLisible(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
