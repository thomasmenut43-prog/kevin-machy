'use client';

import { useMemo, useState, useTransition } from 'react';
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

/**
 * La boîte de réception, en deux panneaux.
 *
 * C'était un accordéon : une liste où chaque ligne se dépliait sur place. Ça
 * tient tant qu'il y a trois messages ; au-delà, lire le quatrième fait
 * disparaître le troisième, et comparer deux demandes oblige à les ouvrir
 * l'une après l'autre. Une vraie boîte mail met la liste à gauche et le
 * message à droite, et c'est ce que Kevin connaît déjà de son propre courrier.
 *
 * Sur un téléphone, les deux panneaux ne tiennent pas côte à côte : on montre
 * la liste, puis le message, avec un retour. D'où `data-vue`, que le CSS lit —
 * plutôt que deux arbres de composants à maintenir en parallèle.
 */
export function BoiteMessages({
  messages,
  nonLus,
  administrateur,
}: {
  messages: Message[];
  nonLus: number;
  administrateur: boolean;
}) {
  const [filtre, setFiltre] = useState<'tous' | 'nonlus'>('tous');
  const [vue, setVue] = useState<'liste' | 'message'>('liste');
  // À l'ouverture, le premier non lu : c'est celui qu'on vient voir.
  const [choisi, setChoisi] = useState<number | null>(
    messages.find((m) => !m.lu)?.id ?? messages[0]?.id ?? null,
  );
  const [enCours, demarrer] = useTransition();

  const visibles = useMemo(
    () => (filtre === 'nonlus' ? messages.filter((m) => !m.lu) : messages),
    [messages, filtre],
  );
  const actif = messages.find((m) => m.id === choisi) ?? null;
  const echecs = messages.filter((m) => m.envoi === 'echec').length;

  if (!messages.length) {
    return (
      <div className={b.vide}>
        <p className={b.videTitre}>Aucun message pour l’instant.</p>
        <p className="bo-aide">
          Ils arriveront ici dès qu’un visiteur remplira le formulaire de contact.
        </p>
      </div>
    );
  }

  const ouvrir = (m: Message) => {
    setChoisi(m.id);
    setVue('message');
    if (!m.lu) demarrer(() => actionMarquerLu(m.id, true));
  };

  return (
    <>
      {echecs > 0 ? (
        <p className={b.alerte}>
          <strong>
            {echecs} notification{echecs > 1 ? 's' : ''} n’{echecs > 1 ? 'ont' : 'a'} pas pu partir
            par e-mail.
          </strong>{' '}
          Les demandes sont là, mais rien n’est arrivé dans votre boîte. Vérifiez Paramètres →
          E-mails.
        </p>
      ) : null}

      <div className={b.boite} data-vue={vue}>
        <div className={b.colonne}>
          <div className={b.barre}>
            <div className={b.filtres} role="group" aria-label="Filtrer les messages">
              <button
                type="button"
                className={b.filtre}
                data-actif={filtre === 'tous' ? '' : undefined}
                onClick={() => setFiltre('tous')}
              >
                Tous <span className={b.compte}>{messages.length}</span>
              </button>
              <button
                type="button"
                className={b.filtre}
                data-actif={filtre === 'nonlus' ? '' : undefined}
                onClick={() => setFiltre('nonlus')}
              >
                Non lus <span className={b.compte}>{nonLus}</span>
              </button>
            </div>
          </div>

          <ul className={b.liste}>
            {visibles.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={b.entree}
                  data-choisi={m.id === choisi ? '' : undefined}
                  data-nonlu={!m.lu ? '' : undefined}
                  aria-current={m.id === choisi ? 'true' : undefined}
                  onClick={() => ouvrir(m)}
                >
                  <span className={b.pastille} aria-hidden="true" />
                  <span className={b.entreeTexte}>
                    <span className={b.entreeTete}>
                      <strong className={b.expediteur}>{m.nom}</strong>
                      <time className={b.quand} dateTime={m.creeLe}>
                        {dateCourte(m.creeLe)}
                      </time>
                    </span>
                    <span className={b.apercu}>{m.message}</span>
                    <span className={b.entreePied}>
                      {m.projet ? <span className={b.etiquette}>{m.projet}</span> : null}
                      {m.envoi === 'echec' ? (
                        <span className={b.echec}>e-mail non parti</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!visibles.length ? (
              <li className={b.listeVide}>Aucun message non lu.</li>
            ) : null}
          </ul>
        </div>

        <div className={b.lecture}>
          {actif ? (
            <article className={b.lu} key={actif.id}>
              <button type="button" className={b.retour} onClick={() => setVue('liste')}>
                ← Tous les messages
              </button>

              <header className={b.enTete}>
                <h2 className={b.sujet}>
                  {actif.projet ? `Demande — ${actif.projet}` : 'Demande de contact'}
                </h2>
                <div className={b.de}>
                  <span className={b.avatar} aria-hidden="true">
                    {initiales(actif.nom)}
                  </span>
                  <span>
                    <strong>{actif.nom}</strong>
                    <a className={b.adresse} href={`mailto:${actif.email}`}>
                      {actif.email}
                    </a>
                  </span>
                  <time className={b.quandLong} dateTime={actif.creeLe}>
                    {dateLongue(actif.creeLe)}
                  </time>
                </div>
              </header>

              {actif.telephone || actif.dateProjet ? (
                <dl className={b.infos}>
                  {actif.telephone ? (
                    <div>
                      <dt>Téléphone</dt>
                      <dd>
                        <a href={`tel:${actif.telephone.replace(/\s/g, '')}`}>{actif.telephone}</a>
                      </dd>
                    </div>
                  ) : null}
                  {actif.dateProjet ? (
                    <div>
                      <dt>Date envisagée</dt>
                      <dd>{actif.dateProjet}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}

              <p className={b.texte}>{actif.message}</p>

              {actif.envoi === 'echec' && actif.envoiDetail ? (
                <p className={b.alerte}>
                  <strong>La notification n’est pas partie.</strong> {actif.envoiDetail}
                </p>
              ) : null}

              <div className={b.actions}>
                <a
                  className="bo-bouton"
                  href={`mailto:${actif.email}?subject=${encodeURIComponent(
                    `Votre demande — ${actif.nom}`,
                  )}`}
                >
                  Répondre
                </a>
                <button
                  type="button"
                  className="bo-bouton bo-bouton-discret"
                  disabled={enCours}
                  onClick={() => demarrer(() => actionMarquerLu(actif.id, !actif.lu))}
                >
                  {actif.lu ? 'Marquer non lu' : 'Marquer lu'}
                </button>
                {administrateur ? (
                  <button
                    type="button"
                    className={b.danger}
                    disabled={enCours}
                    onClick={() => {
                      // Le message disparaît : on bascule la sélection avant,
                      // sinon le panneau de lecture reste sur un vide.
                      const suivant = messages.find((x) => x.id !== actif.id)?.id ?? null;
                      setChoisi(suivant);
                      setVue('liste');
                      demarrer(() => actionSupprimerMessage(actif.id));
                    }}
                  >
                    Supprimer
                  </button>
                ) : null}
              </div>
            </article>
          ) : (
            <p className={b.rienChoisi}>Choisissez un message pour le lire.</p>
          )}
        </div>
      </div>
    </>
  );
}

const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? '')
    .join('');

/** Dans la liste : l'heure si c'est aujourd'hui, la date sinon. */
function dateCourte(iso: string) {
  const d = new Date(iso);
  const memeJour = d.toDateString() === new Date().toDateString();
  return d.toLocaleString('fr-FR', memeJour
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short' });
}

function dateLongue(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
