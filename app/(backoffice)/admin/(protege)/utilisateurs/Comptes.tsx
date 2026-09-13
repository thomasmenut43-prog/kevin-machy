'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import {
  actionChangerMonMotDePasse,
  actionChangerRole,
  actionCreerCompte,
  actionFermerAutresSessions,
  actionReinitialiserMotDePasse,
  actionSupprimerCompte,
  type EtatCompte,
} from './actions';
import u from './utilisateurs.module.css';

const VIDE: EtatCompte = {};

type Compte = {
  id: number;
  nom: string;
  email: string;
  role: 'administrateur' | 'editeur';
  creeLe: string;
  derniereConnexion: string | null;
  sessions: number;
};

function Bouton({ libelle, enCours }: { libelle: string; enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? enCours : libelle}
    </button>
  );
}

export function Comptes({
  comptes,
  moiId,
  administrateur,
  monCompte = true,
}: {
  comptes: Compte[];
  moiId: number;
  administrateur: boolean;
  /** Le changement de mot de passe a son propre onglet dans la fenêtre. */
  monCompte?: boolean;
}) {
  const [message, setMessage] = useState<{ ton: 'erreur' | 'succes'; texte: string } | null>(null);
  const [enCours, demarrer] = useTransition();

  const agir = (action: () => Promise<{ erreur?: string; succes?: string }>) =>
    demarrer(async () => {
      const r = await action();
      if (r.erreur) setMessage({ ton: 'erreur', texte: r.erreur });
      else if (r.succes) setMessage({ ton: 'succes', texte: r.succes });
      else setMessage(null);
    });

  return (
    <>
      {message ? (
        <p className={message.ton === 'erreur' ? 'bo-erreur' : u.succes} role="alert">
          {message.texte}
        </p>
      ) : null}

      <ul className={u.liste}>
        {comptes.map((c) => (
          <Ligne
            key={c.id}
            compte={c}
            moi={c.id === moiId}
            administrateur={administrateur}
            enCours={enCours}
            agir={agir}
          />
        ))}
      </ul>

      {administrateur ? <FormulaireCreation /> : null}

      {monCompte ? (
        <MonMotDePasse
          sessions={comptes.find((c) => c.id === moiId)?.sessions ?? 1}
          onFermerAutres={() => demarrer(async () => { await actionFermerAutresSessions(); })}
          enCours={enCours}
        />
      ) : null}
    </>
  );
}

function Ligne({
  compte,
  moi,
  administrateur,
  enCours,
  agir,
}: {
  compte: Compte;
  moi: boolean;
  administrateur: boolean;
  enCours: boolean;
  agir: (a: () => Promise<{ erreur?: string; succes?: string }>) => void;
}) {
  const [confirme, setConfirme] = useState(false);
  const [reinit, setReinit] = useState('');

  return (
    <li className={u.item}>
      <div className={u.identite}>
        <strong>
          {compte.nom}
          {moi ? <span className={u.vous}>vous</span> : null}
        </strong>
        <span>{compte.email}</span>
        <span className={u.detail}>
          {compte.derniereConnexion
            ? `Dernière connexion le ${dateLisible(compte.derniereConnexion)}`
            : 'Jamais connecté'}
          {compte.sessions > 0 ? ` · ${compte.sessions} session${compte.sessions > 1 ? 's' : ''} ouverte${compte.sessions > 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <div className={u.reglages}>
        {administrateur ? (
          <label className={u.role}>
            <span className="visuellement-cache">Rôle de {compte.nom}</span>
            <select
              value={compte.role}
              disabled={enCours}
              onChange={(ev) =>
                agir(() => actionChangerRole(compte.id, ev.target.value as 'administrateur' | 'editeur'))
              }
            >
              <option value="administrateur">Administrateur</option>
              <option value="editeur">Éditeur</option>
            </select>
          </label>
        ) : (
          <span className={u.etiquette}>
            {compte.role === 'administrateur' ? 'Administrateur' : 'Éditeur'}
          </span>
        )}

        {administrateur && !moi ? (
          <>
            <details className={u.repli}>
              <summary>Réinitialiser</summary>
              <div className={u.repliCorps}>
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                  value={reinit}
                  onChange={(ev) => setReinit(ev.target.value)}
                />
                <p className={u.aide}>
                  Douze caractères au minimum. Les appareils connectés à ce compte seront
                  déconnectés, et il faudra transmettre le mot de passe de vive voix.
                </p>
                <button
                  type="button"
                  className="bo-bouton bo-bouton-discret"
                  disabled={enCours || reinit.length < 12}
                  onClick={() =>
                    agir(async () => {
                      const r = await actionReinitialiserMotDePasse(compte.id, reinit);
                      setReinit('');
                      return r;
                    })
                  }
                >
                  Remplacer le mot de passe
                </button>
              </div>
            </details>

            {confirme ? (
              <button
                type="button"
                className={u.danger}
                disabled={enCours}
                onClick={() => agir(() => actionSupprimerCompte(compte.id))}
              >
                Confirmer
              </button>
            ) : (
              <button
                type="button"
                className="bo-bouton bo-bouton-discret"
                onClick={() => setConfirme(true)}
              >
                Supprimer
              </button>
            )}
          </>
        ) : null}
      </div>
    </li>
  );
}

function FormulaireCreation() {
  const [etat, action] = useActionState(actionCreerCompte, VIDE);

  return (
    <form className="bo-form bo-encadre" action={action}>
      <h2 className={u.titre}>Nouveau compte</h2>

      {etat.erreur ? (
        <p className="bo-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      {etat.succes ? (
        <p className={u.succes} role="status">
          {etat.succes}
        </p>
      ) : null}

      <div className="bo-champ">
        <label htmlFor="c-nom">Nom</label>
        <input id="c-nom" name="nom" type="text" defaultValue={etat.saisi?.nom ?? ''} required />
      </div>

      <div className="bo-champ">
        <label htmlFor="c-email">Adresse e-mail</label>
        <input
          id="c-email"
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={etat.saisi?.email ?? ''}
          required
        />
        <p className="bo-aide">C’est avec elle qu’il se connectera.</p>
      </div>

      <div className="bo-champ">
        <label htmlFor="c-role">Rôle</label>
        <select id="c-role" name="role" defaultValue={etat.saisi?.role ?? 'editeur'}>
          <option value="editeur">Éditeur — modifie le contenu du site</option>
          <option value="administrateur">Administrateur — gère en plus comptes et réglages</option>
        </select>
      </div>

      <div className="bo-champ">
        <label htmlFor="c-motDePasse">Mot de passe provisoire</label>
        <input id="c-motDePasse" name="motDePasse" type="password" autoComplete="new-password" required />
        <p className="bo-aide">
          Douze caractères au minimum. À transmettre de vive voix, jamais par e-mail : il y
          resterait lisible pour toujours.
        </p>
      </div>

      <Bouton libelle="Créer le compte" enCours="Création…" />
    </form>
  );
}

export function MonMotDePasse({
  sessions,
  onFermerAutres,
  enCours,
}: {
  sessions: number;
  onFermerAutres: () => void;
  enCours: boolean;
}) {
  const [etat, action] = useActionState(actionChangerMonMotDePasse, VIDE);

  return (
    <form className="bo-form bo-encadre" action={action}>
      <h2 className={u.titre}>Mon mot de passe</h2>

      {etat.erreur ? (
        <p className="bo-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      {etat.succes ? (
        <p className={u.succes} role="status">
          {etat.succes}
        </p>
      ) : null}

      <div className="bo-champ">
        <label htmlFor="m-actuel">Mot de passe actuel</label>
        <input id="m-actuel" name="actuel" type="password" autoComplete="current-password" required />
      </div>

      <div className="bo-champ">
        <label htmlFor="m-nouveau">Nouveau mot de passe</label>
        <input id="m-nouveau" name="nouveau" type="password" autoComplete="new-password" required />
        <p className="bo-aide">
          Douze caractères au minimum. Une phrase dont vous vous souvenez vaut mieux qu’un mot
          compliqué que vous noterez quelque part.
        </p>
      </div>

      <div className="bo-champ">
        <label htmlFor="m-confirmation">Confirmer</label>
        <input
          id="m-confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <Bouton libelle="Changer mon mot de passe" enCours="Changement…" />

      {sessions > 1 ? (
        <div className={u.sessions}>
          <p className={u.aide}>
            {sessions} appareils sont connectés à votre compte. Si l’un d’eux ne devrait pas
            l’être, fermez-les tous sauf celui-ci.
          </p>
          <button
            type="button"
            className="bo-bouton bo-bouton-discret"
            disabled={enCours}
            onClick={onFermerAutres}
          >
            Déconnecter les autres appareils
          </button>
        </div>
      ) : null}
    </form>
  );
}

function dateLisible(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
