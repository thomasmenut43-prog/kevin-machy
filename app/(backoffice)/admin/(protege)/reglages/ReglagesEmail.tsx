'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  actionEffacerMotDePasse,
  actionEnregistrerSmtp,
  actionTesterSmtp,
  type EtatReglages,
} from './actions';
import r from './reglages.module.css';

const VIDE: EtatReglages = {};

type Affichable = {
  serveur: string;
  port: number;
  chiffrement: 'tls' | 'starttls' | 'aucun';
  identifiant: string;
  motDePasseEnregistre: boolean;
  expediteurNom: string;
  expediteurEmail: string;
  reponseEmail: string;
  destinataire: string;
  accuseActif: boolean;
  accuseObjet: string;
  accuseTexte: string;
  /** Ce qui, dans ces réglages, empêche toute notification de partir. */
  problemes: string[];
};

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer les réglages'}
    </button>
  );
}

/**
 * Ce que le formulaire affiche réellement, en une chaîne.
 *
 * Sert de `key` : quand la fenêtre a relu la base et que ces valeurs ont
 * changé, le formulaire est remonté, et ses `defaultValue` reprennent. Sans
 * cela React garde les champs tels quels — c'est la moitié du bug corrigé ici.
 *
 * Le paramètre ne s'appelle pas `r` : dans ce fichier, `r` est la feuille de
 * styles. Chaque champ lu devenait donc, pour `verifier-styles.mjs`, une
 * classe CSS introuvable — et il avait raison de se plaindre : personne ne
 * doit avoir à deviner lequel des deux `r` il est en train de lire.
 */
function empreinteAffichee(v: Affichable) {
  return [
    v.serveur,
    v.port,
    v.chiffrement,
    v.identifiant,
    v.motDePasseEnregistre,
    v.expediteurNom,
    v.expediteurEmail,
    v.reponseEmail,
    v.destinataire,
    v.accuseActif,
    v.accuseObjet,
    v.accuseTexte,
  ].join('\u0000');
}

export function ReglagesEmail({
  reglages,
  onEnregistre,
}: {
  reglages: Affichable;
  /** Prévient la fenêtre qu'elle doit relire la base. */
  onEnregistre?: () => void;
}) {
  const [etat, action] = useActionState(actionEnregistrerSmtp, VIDE);
  const [destination, setDestination] = useState(reglages.destinataire || reglages.expediteurEmail);
  const [test, setTest] = useState<EtatReglages>({});
  const [enCours, demarrer] = useTransition();

  /*
   * Redemander à la base ce qu'elle a retenu.
   *
   * Sans cela, le formulaire mentait après chaque enregistrement. React remet
   * à zéro un formulaire soumis par une action : les champs retombent sur leur
   * `defaultValue`, c'est-à-dire sur ce qui avait été lu **à l'ouverture de la
   * fenêtre**. Thomas a donc enregistré `smtp.hostinger.com`, vu
   * « Réglages enregistrés. », puis relu `localhost` dans les champs — alors
   * que la base, elle, avait bien le bon serveur.
   *
   * C'est la même famille de panne que celle d'hier : une écriture qui marche
   * et un écran qui raconte autre chose. L'écran décide de ce que l'on croit.
   *
   * La dépendance porte sur `etat` et non sur `etat.succes` : deux
   * enregistrements de suite rendent le même texte, et la comparaison par
   * valeur ne verrait pas le second.
   */
  useEffect(() => {
    if (etat.succes) onEnregistre?.();
  }, [etat, onEnregistre]);

  // L'adresse d'essai suit la boîte enregistrée : tester ailleurs que là où
  // les demandes arrivent ne prouve rien.
  useEffect(() => {
    setDestination(reglages.destinataire || reglages.expediteurEmail);
  }, [reglages.destinataire, reglages.expediteurEmail]);

  return (
    <>
      <form key={empreinteAffichee(reglages)} className="bo-form bo-encadre" action={action}>
        <h2 className={r.titre}>Serveur d’envoi</h2>
        <p className="bo-aide">
          Ces valeurs viennent de votre hébergeur d’e-mails. Elles figurent dans la fiche de
          configuration de votre boîte, à la rubrique « SMTP » ou « envoi ».
        </p>

        {/* Ce qui est déjà en base et ne peut pas fonctionner. Affiché à
            l'ouverture, sans attendre un enregistrement : c'est précisément
            parce que personne n'enregistrait que la configuration de
            développement est restée en ligne sans que ça se voie.

            Et affiché **même après un enregistrement réussi** : il décrit la
            base, pas le dernier clic. Le masquer dès qu'un « Réglages
            enregistrés. » s'affichait rendait l'avertissement muet au seul
            moment où quelqu'un regardait l'écran. */}
        {!etat.erreur && reglages.problemes.length ? (
          <p className="bo-erreur" role="alert">
            Aucune notification ne peut partir avec ces réglages.{' '}
            {reglages.problemes.join(' ')}
          </p>
        ) : null}

        {etat.erreur ? (
          <p className="bo-erreur" role="alert">
            {etat.erreur}
          </p>
        ) : null}
        {etat.succes ? (
          <p className={r.succes} role="status">
            {etat.succes}
          </p>
        ) : null}

        <div className="bo-champ">
          <label htmlFor="serveur">Serveur SMTP</label>
          <input id="serveur" name="serveur" type="text" defaultValue={reglages.serveur} placeholder="smtp.exemple.fr" />
        </div>

        <div className={r.paire}>
          <div className="bo-champ">
            <label htmlFor="port">Port</label>
            <input id="port" name="port" type="number" defaultValue={reglages.port} min={1} max={65535} />
          </div>

          <div className="bo-champ">
            <label htmlFor="chiffrement">Chiffrement</label>
            <select id="chiffrement" name="chiffrement" defaultValue={reglages.chiffrement}>
              <option value="tls">TLS, en général port 465</option>
              <option value="starttls">STARTTLS, en général port 587</option>
              <option value="aucun">Aucun, déconseillé</option>
            </select>
          </div>
        </div>

        <div className="bo-champ">
          <label htmlFor="identifiant">Identifiant</label>
          <input
            id="identifiant"
            name="identifiant"
            type="text"
            autoComplete="off"
            defaultValue={reglages.identifiant}
          />
          <p className="bo-aide">Le plus souvent, l’adresse e-mail complète.</p>
        </div>

        <div className="bo-champ">
          <label htmlFor="motDePasse">Mot de passe</label>
          <input
            id="motDePasse"
            name="motDePasse"
            type="password"
            autoComplete="new-password"
            placeholder={reglages.motDePasseEnregistre ? '••••••••  enregistré' : ''}
          />
          <p className="bo-aide">
            {reglages.motDePasseEnregistre
              ? 'Un mot de passe est enregistré. Il ne peut pas être réaffiché, seulement remplacé : laissez vide pour le garder.'
              : 'Il est chiffré avant d’être enregistré, et ne sera jamais réaffiché.'}
          </p>
          {reglages.motDePasseEnregistre ? (
            <button
              type="button"
              className={r.lienDiscret}
              onClick={() => demarrer(() => actionEffacerMotDePasse())}
              disabled={enCours}
            >
              Effacer le mot de passe enregistré
            </button>
          ) : null}
        </div>

        <h2 className={r.titre}>Expéditeur</h2>

        <div className={r.paire}>
          <div className="bo-champ">
            <label htmlFor="expediteurNom">Nom affiché</label>
            <input
              id="expediteurNom"
              name="expediteurNom"
              type="text"
              defaultValue={reglages.expediteurNom}
            />
          </div>

          <div className="bo-champ">
            <label htmlFor="expediteurEmail">Adresse d’expédition</label>
            <input
              id="expediteurEmail"
              name="expediteurEmail"
              type="email"
              defaultValue={reglages.expediteurEmail}
            />
          </div>
        </div>

        <div className={r.paire}>
          <div className="bo-champ">
            <label htmlFor="reponseEmail">Adresse de réponse</label>
            <input
              id="reponseEmail"
              name="reponseEmail"
              type="email"
              defaultValue={reglages.reponseEmail}
            />
            <p className="bo-aide">Facultative, si différente de l’expédition.</p>
          </div>

          <div className="bo-champ">
            <label htmlFor="destinataire">Où recevoir les demandes</label>
            <input
              id="destinataire"
              name="destinataire"
              type="email"
              defaultValue={reglages.destinataire}
            />
            <p className="bo-aide">Votre boîte, celle que vous relevez.</p>
          </div>
        </div>

        <h2 className={r.titre}>Accusé de réception</h2>

        <label className={r.bascule}>
          <input type="checkbox" name="accuseActif" defaultChecked={reglages.accuseActif} />
          <span>Répondre automatiquement au visiteur</span>
        </label>

        <div className="bo-champ">
          <label htmlFor="accuseObjet">Objet</label>
          <input id="accuseObjet" name="accuseObjet" type="text" defaultValue={reglages.accuseObjet} />
        </div>

        <div className="bo-champ">
          <label htmlFor="accuseTexte">Message</label>
          <textarea
            id="accuseTexte"
            name="accuseTexte"
            rows={7}
            defaultValue={reglages.accuseTexte}
          />
          <p className="bo-aide">
            Écrit par vous, envoyé tel quel. Annoncer un délai de réponse vaut mieux que promettre
            une réponse rapide.
          </p>
        </div>

        <BoutonEnregistrer />
      </form>

      <div className="bo-encadre">
        <h2 className={r.titre}>Vérifier</h2>
        <p className="bo-aide">
          Une configuration e-mail ne se vérifie pas en la relisant. Envoyez-vous un message :
          c’est le seul essai qui compte.
        </p>

        {test.erreur ? (
          <>
            <p className="bo-erreur" role="alert" style={{ marginTop: 14 }}>
              {test.erreur}
            </p>
            {/* Ce que le serveur a répondu, mot pour mot. Illisible pour
                Kevin, et c'est assumé : il n'a pas à le lire, il a à pouvoir
                le recopier à qui saura. Une phrase rassurante en français
                n'aide personne quand la panne sort de l'ordinaire. */}
            {test.detail ? (
              <p
                style={{
                  marginTop: 8,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                  lineHeight: 1.5,
                  opacity: 0.75,
                  wordBreak: 'break-word',
                }}
              >
                {test.detail}
              </p>
            ) : null}
          </>
        ) : null}
        {test.succes ? (
          <p className={r.succes} role="status" style={{ marginTop: 14 }}>
            {test.succes}
          </p>
        ) : null}

        <div className="bo-champ" style={{ marginTop: 14 }}>
          <label htmlFor="destination">Adresse d’essai</label>
          <input
            id="destination"
            type="email"
            value={destination}
            onChange={(ev) => setDestination(ev.target.value)}
          />
        </div>

        <button
          type="button"
          className="bo-bouton bo-bouton-discret"
          style={{ marginTop: 12 }}
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              setTest({});
              setTest(await actionTesterSmtp(destination));
            })
          }
        >
          {enCours ? 'Envoi…' : 'Envoyer un e-mail de test'}
        </button>
      </div>
    </>
  );
}
