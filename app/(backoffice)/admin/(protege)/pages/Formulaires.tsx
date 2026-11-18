'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { actionCreerPage, actionDupliquerPage, type EtatPage } from './actions';

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

/** La page à dupliquer, telle que Kevin la voit dans l'éditeur. */
export type SourceCopie = { id: number; titre: string; chemin: string; sections: unknown[] };

/**
 * Créer une page, vide ou copiée d'une autre.
 *
 * Un seul formulaire pour les deux gestes : ils demandent la même chose — un
 * nom et une adresse libre — et doivent refuser les mêmes erreurs.
 */
export function FormulaireNouvellePage({ source }: { source?: SourceCopie } = {}) {
  const [etat, action] = useActionState(source ? actionDupliquerPage : actionCreerPage, VIDE);
  const [titre, setTitre] = useState(
    etat.saisi?.titre ?? (source ? `${source.titre} (copie)` : ''),
  );
  const [chemin, setChemin] = useState(
    etat.saisi?.chemin ?? (source ? `${source.chemin || 'accueil'}-copie` : ''),
  );
  // Une copie arrive avec une adresse proposée : la réécrire au fil du nom
  // effacerait celle-ci dès la première lettre.
  const [cheminTouche, setCheminTouche] = useState(Boolean(source));

  return (
    <form className="bo-form bo-encadre" action={action}>
      <h2 className="bo-sous-titre" style={{ color: 'var(--bo-texte)' }}>
        {source ? `Dupliquer « ${source.titre} »` : 'Nouvelle page'}
      </h2>

      {source ? (
        <>
          <input type="hidden" name="source" value={source.id} />
          <input type="hidden" name="sections" value={JSON.stringify(source.sections)} />
          <p className="bo-aide">
            La copie reprend toutes les sections, telles qu’elles sont dans l’éditeur. Elle n’est
            pas en ligne : elle le sera au premier « Enregistrer ». Le titre et la description
            pour Google ne sont pas repris — à écrire dans ses réglages.
          </p>
        </>
      ) : null}

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

      <Bouton libelle={source ? 'Créer la copie' : 'Créer la page'} />
    </form>
  );
}
