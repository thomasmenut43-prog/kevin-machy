'use client';

import { useActionState, useState, useTransition } from 'react';
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
};

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer les réglages'}
    </button>
  );
}

export function ReglagesEmail({ reglages }: { reglages: Affichable }) {
  const [etat, action] = useActionState(actionEnregistrerSmtp, VIDE);
  const [destination, setDestination] = useState(reglages.destinataire || reglages.expediteurEmail);
  const [test, setTest] = useState<EtatReglages>({});
  const [enCours, demarrer] = useTransition();

  return (
    <>
      <form className="bo-form bo-encadre" action={action}>
        <h2 className={r.titre}>Serveur d’envoi</h2>
        <p className="bo-aide">
          Ces valeurs viennent de votre hébergeur d’e-mails. Elles figurent dans la fiche de
          configuration de votre boîte, à la rubrique « SMTP » ou « envoi ».
        </p>

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
          <p className="bo-erreur" role="alert" style={{ marginTop: 14 }}>
            {test.erreur}
          </p>
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
