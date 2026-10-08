'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  actionMarquerLu,
  actionRenvoyerNotification,
  actionSupprimerMessage,
} from './actions';
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
/**
 * Copier une adresse, sans dépendre des permissions du navigateur.
 *
 * `navigator.clipboard` exige un contexte sûr et une activation récente de la
 * page ; il refuse dans les cas limites, et il refuse en silence. Le vieux
 * `execCommand` ne demande rien à personne : il reste là en second rideau,
 * déprécié mais fonctionnel partout.
 *
 * Rend `false` si aucun des deux n'a abouti, pour que l'interface n'annonce
 * jamais une copie qui n'a pas eu lieu. L'adresse reste de toute façon lisible
 * et cliquable en tête du message.
 */
async function copierAdresse(adresse: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(adresse);
    return true;
  } catch {
    try {
      const zone = document.createElement('textarea');
      zone.value = adresse;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(zone);
      return ok;
    } catch {
      return false;
    }
  }
}

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

  /*
   * Le résultat du dernier renvoi, attaché au message concerné.
   *
   * Porter l'identifiant évite d'avoir à remettre l'état à zéro en changeant
   * de message : un résultat qui n'est pas celui du message affiché ne
   * s'affiche pas, et c'est tout.
   */
  const [renvoye, setRenvoye] = useState<{ id: number; ok: boolean } | null>(null);
  const [adresseCopiee, setAdresseCopiee] = useState<number | null>(null);
  const lecture = useRef<HTMLDivElement>(null);

  const visibles = useMemo(
    () => (filtre === 'nonlus' ? messages.filter((m) => !m.lu) : messages),
    [messages, filtre],
  );
  const actif = messages.find((m) => m.id === choisi) ?? null;
  const echecs = messages.filter((m) => m.envoi === 'echec').length;

  /*
   * Marquer lu ce qui est réellement sous les yeux.
   *
   * Le premier message non lu est choisi au chargement, sans passer par
   * `ouvrir` : il s'affichait donc en restant « non lu », et le compteur ne
   * bougeait pas tant qu'on ne cliquait pas dessus — alors qu'on venait de le
   * lire. C'est exactement l'inverse de ce qu'un compteur de non-lus doit
   * faire : il doit dire ce qui reste à voir, pas ce qui n'a pas été cliqué.
   *
   * La condition n'est pas « un message est choisi » mais « le panneau de
   * lecture est visible ». Sous 900 px les deux panneaux ne tiennent pas côte
   * à côte, la feuille de styles masque celui-ci par `display: none`, et la
   * liste occupe seule le cadre : `offsetParent` vaut alors `null`. Lire la
   * mise en page plutôt que redire le point de rupture en JavaScript évite de
   * les laisser diverger un jour.
   *
   * `vue` est dans les dépendances en plus de `actif` : sur téléphone, ouvrir
   * le message déjà choisi ne change que la vue, et sans cela rien ne se
   * déclencherait.
   */
  useEffect(() => {
    if (!actif || actif.lu) return;
    if (!lecture.current?.offsetParent) return;
    demarrer(() => actionMarquerLu(actif.id, true));
  }, [actif, vue, demarrer]);

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

        <div className={b.lecture} ref={lecture}>
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

              {actif.envoi === 'echec' ? (
                <div className={b.alerte}>
                  <strong>La notification n’est pas partie.</strong>{' '}
                  {actif.envoiDetail ?? 'Aucune raison n’a été enregistrée.'}

                  <div className={b.remede}>
                    <button
                      type="button"
                      className="bo-bouton bo-bouton-discret"
                      disabled={enCours}
                      onClick={() =>
                        demarrer(async () => {
                          setRenvoye(null);
                          const ok = await actionRenvoyerNotification(actif.id);
                          setRenvoye({ id: actif.id, ok });
                        })
                      }
                    >
                      {enCours ? 'Envoi…' : 'Renvoyer la notification'}
                    </button>

                    {renvoye?.id === actif.id && !renvoye.ok ? (
                      <span role="status">
                        Toujours pas. La raison vient d’être mise à jour ci-dessus.
                      </span>
                    ) : null}
                  </div>

                  {/* Dit avant de cliquer, pas après : quelqu'un pourrait
                      croire que le visiteur va recevoir un accusé, et s'abstenir
                      de lui répondre lui-même. */}
                  <p className={b.remedeNote}>
                    Ce bouton vous prévient, vous. Le visiteur ne reçoit rien : son accusé de
                    réception annonçait une réponse sous deux jours, et le lui envoyer maintenant
                    ferait repartir un délai déjà passé. C’est une vraie réponse qu’il attend.
                  </p>
                </div>
              ) : renvoye?.id === actif.id && renvoye.ok ? (
                /* Hors de l'encadré rouge, et c'est tout l'intérêt : quand le
                   renvoi réussit, cet encadré disparaît — la demande n'est plus
                   en échec. La confirmation serait partie avec lui, et le seul
                   retour aurait été la disparition d'un avertissement. */
                <p className={b.reussite} role="status">
                  Notification renvoyée. Vous devriez l’avoir reçue dans la boîte indiquée dans
                  Réglages → E-mails.
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
                {/* Le lien ci-dessus ouvre le logiciel de courrier de la
                    machine. Quand il n'y en a pas — et il n'y en a pas quand on
                    relève son courrier sur le web — cliquer ne fait
                    strictement rien, sans le moindre message. D'où ce second
                    bouton : il ne dépend d'aucun réglage du poste. */}
                <button
                  type="button"
                  className="bo-bouton bo-bouton-discret"
                  onClick={() => {
                    copierAdresse(actif.email).then((ok) =>
                      setAdresseCopiee(ok ? actif.id : null),
                    );
                  }}
                >
                  {adresseCopiee === actif.id ? 'Adresse copiée' : 'Copier l’adresse'}
                </button>
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
