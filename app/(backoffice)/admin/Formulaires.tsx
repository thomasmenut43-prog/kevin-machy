'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { actionConnexion, actionPremierCompte, type EtatFormulaire } from './actions';

const VIDE: EtatFormulaire = {};

/** Le bouton se verrouille pendant l'envoi : pas de double soumission. */
function BoutonEnvoi({ libelle, enCours }: { libelle: string; enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? enCours : libelle}
    </button>
  );
}

function Erreur({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="bo-erreur" role="alert">
      {message}
    </p>
  );
}

export function FormulaireConnexion() {
  const [etat, action] = useActionState(actionConnexion, VIDE);

  return (
    <form className="bo-form" action={action} noValidate>
      <Erreur message={etat.erreur} />

      <div className="bo-champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={etat.saisi?.email ?? ''}
          required
          autoFocus
        />
      </div>

      <div className="bo-champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <BoutonEnvoi libelle="Se connecter" enCours="Connexion…" />
    </form>
  );
}

export function FormulairePremierCompte() {
  const [etat, action] = useActionState(actionPremierCompte, VIDE);

  return (
    <form className="bo-form" action={action} noValidate>
      <Erreur message={etat.erreur} />

      <div className="bo-champ">
        <label htmlFor="nom">Nom</label>
        <input
          id="nom"
          name="nom"
          type="text"
          autoComplete="name"
          defaultValue={etat.saisi?.nom ?? ''}
          required
          autoFocus
        />
      </div>

      <div className="bo-champ">
        <label htmlFor="email">Adresse e-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={etat.saisi?.email ?? ''}
          required
        />
      </div>

      <div className="bo-champ">
        <label htmlFor="motDePasse">Mot de passe</label>
        <input
          id="motDePasse"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="bo-aide">
          Douze caractères au minimum. Une phrase dont vous vous souvenez vaut mieux qu’un mot
          compliqué que vous noterez quelque part.
        </p>
      </div>

      <div className="bo-champ">
        <label htmlFor="confirmation">Confirmer le mot de passe</label>
        <input
          id="confirmation"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <BoutonEnvoi libelle="Créer le compte" enCours="Création…" />
    </form>
  );
}
