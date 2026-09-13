'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { actionCreerPage, type EtatPage } from './actions';

const VIDE: EtatPage = {};

function Bouton({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Création…' : libelle}
    </button>
  );
}

/** Propose une adresse à partir du nom, tant que Kevin n'en a pas choisi une. */
function enAdresse(titre: string) {
  return titre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function FormulaireNouvellePage() {
  const [etat, action] = useActionState(actionCreerPage, VIDE);
  const [titre, setTitre] = useState(etat.saisi?.titre ?? '');
  const [chemin, setChemin] = useState(etat.saisi?.chemin ?? '');
  const [cheminTouche, setCheminTouche] = useState(false);

  return (
    <form className="bo-form bo-encadre" action={action}>
      <h2 className="bo-sous-titre" style={{ color: 'var(--bo-texte)' }}>
        Nouvelle page
      </h2>

      {etat.erreur ? (
        <p className="bo-erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}

      <div className="bo-champ">
        <label htmlFor="titre">Nom de la page</label>
        <input
          id="titre"
          name="titre"
          type="text"
          value={titre}
          onChange={(ev) => {
            setTitre(ev.target.value);
            if (!cheminTouche) setChemin(enAdresse(ev.target.value));
          }}
          required
        />
        <p className="bo-aide">Pour s’y retrouver ici. N’apparaît pas sur le site.</p>
      </div>

      <div className="bo-champ">
        <label htmlFor="chemin">Adresse</label>
        <input
          id="chemin"
          name="chemin"
          type="text"
          value={chemin}
          onChange={(ev) => {
            setChemin(ev.target.value);
            setCheminTouche(true);
          }}
          required
        />
        <p className="bo-aide">
          Ce qui suit le nom de domaine. Par exemple <code>portrait/studio</code> donnera
          <code> /portrait/studio/</code>.
        </p>
      </div>

      <Bouton libelle="Créer la page" />
    </form>
  );
}
