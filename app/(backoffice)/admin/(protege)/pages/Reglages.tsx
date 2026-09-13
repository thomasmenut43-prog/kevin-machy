'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Page, Section } from '@/lib/modeles';
import {
  actionDepublier,
  actionListerVersions,
  actionReglagesPage,
  actionRestaurerVersion,
  actionSupprimerPage,
  type EtatPage,
} from './actions';
import e from './editeur.module.css';

const VIDE: EtatPage = {};

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer les réglages'}
    </button>
  );
}

/**
 * Le nom, l'adresse et le référencement d'une page.
 *
 * Séparé du contenu, et pour une bonne raison : changer une adresse casse les
 * liens qui pointaient vers elle, alors que changer un titre ne casse rien. Les
 * deux n'ont pas à se faire du même geste.
 */
export function Reglages({ page, administrateur }: { page: Page; administrateur: boolean }) {
  const [etat, action] = useActionState(actionReglagesPage, VIDE);
  const [confirme, setConfirme] = useState(false);
  const [enCours, demarrer] = useTransition();
  const routeur = useRouter();

  // Le nom et l'adresse apparaissent dans l'en-tête de l'éditeur : il doit
  // suivre sans que Kevin ait à recharger.
  useEffect(() => {
    if (!etat.erreur && etat.saisi === undefined) routeur.refresh();
  }, [etat, routeur]);

  return (
    <div className={e.reglages}>
      <form className="bo-form" action={action}>
        <input type="hidden" name="id" value={page.id} />

        {etat.erreur ? (
          <p className="bo-erreur" role="alert">
            {etat.erreur}
          </p>
        ) : null}

        <div className="bo-champ">
          <label htmlFor="r-titre">Nom de la page</label>
          <input
            id="r-titre"
            name="titre"
            type="text"
            defaultValue={etat.saisi?.titre ?? page.titre}
            required
          />
          <p className={e.aide}>Pour s’y retrouver ici. N’apparaît pas sur le site.</p>
        </div>

        <div className="bo-champ">
          <label htmlFor="r-chemin">Adresse</label>
          <input
            id="r-chemin"
            name="chemin"
            type="text"
            defaultValue={etat.saisi?.chemin ?? page.chemin}
            readOnly={page.systeme}
            required
          />
          <p className={e.aide}>
            {page.systeme
              ? 'Cette page est une page légale : son adresse est fixe, parce que le pied de page et les redirections pointent dessus. Son contenu, lui, se modifie librement.'
              : 'La changer casse les liens qui pointaient vers l’ancienne, et Google met des semaines à suivre. À ne faire qu’avant la mise en ligne, ou en sachant pourquoi.'}
          </p>
        </div>

        <fieldset className={e.groupe}>
          <legend>Référencement</legend>

          <div className="bo-champ">
            <label htmlFor="r-metaTitre">Titre dans Google</label>
            <input
              id="r-metaTitre"
              name="metaTitre"
              type="text"
              defaultValue={page.metaTitre ?? ''}
              maxLength={70}
            />
            <p className={e.aide}>Une soixantaine de caractères. À défaut, le nom de la page sert.</p>
          </div>

          <div className="bo-champ">
            <label htmlFor="r-metaDescription">Description dans Google</label>
            <textarea
              id="r-metaDescription"
              name="metaDescription"
              defaultValue={page.metaDescription ?? ''}
              maxLength={200}
            />
            <p className={e.aide}>
              Entre cent vingt et cent cinquante-cinq caractères. À défaut, le premier texte de la
              page est repris.
            </p>
          </div>

          <div className="bo-champ">
            <label htmlFor="r-metaImage">Image de partage</label>
            <input
              id="r-metaImage"
              name="metaImage"
              type="text"
              defaultValue={page.metaImage ?? ''}
              placeholder="/img/og-mariage.jpg"
            />
            <p className={e.aide}>
              L’image qui s’affiche quand le lien de la page est collé dans un message ou sur un
              réseau. Format conseillé : 1200 × 630 pixels.
            </p>
          </div>

          <label className={e.bascule}>
            <input type="checkbox" name="horsIndexation" defaultChecked={page.horsIndexation} />
            <div>
              <span>Demander à Google de ne pas référencer cette page</span>
              <p className={e.aide}>Pour une page de remerciement, ou une page en préparation.</p>
            </div>
          </label>
        </fieldset>

        <BoutonEnregistrer />
      </form>

      <div className={e.zoneRisque}>
        <h3>État de la page</h3>

        {page.statut === 'publie' ? (
          <>
            <p className={e.aide}>
              La page est visible de tout le monde à l’adresse <code>/{page.chemin}/</code>.
            </p>
            <button
              type="button"
              className="bo-bouton bo-bouton-discret"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  await actionDepublier(page.id);
                  routeur.refresh();
                })
              }
            >
              Retirer du site
            </button>
          </>
        ) : (
          <p className={e.aide}>
            La page n’est visible que d’ici. Le bouton Enregistrer du bas la met en ligne.
          </p>
        )}

        {administrateur ? (
          <>
            <h3>Supprimer</h3>
            {confirme ? (
              <>
                <p className={e.aide}>
                  Définitif. La page, son historique et son adresse disparaissent.
                </p>
                <button
                  type="button"
                  className={e.danger}
                  disabled={enCours}
                  onClick={() => demarrer(() => actionSupprimerPage(page.id))}
                >
                  Confirmer la suppression
                </button>
              </>
            ) : (
              <button
                type="button"
                className="bo-bouton bo-bouton-discret"
                onClick={() => setConfirme(true)}
              >
                Supprimer cette page
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

type Version = { id: number; titre: string; auteur: string | null; date: string };

/**
 * L'historique des publications.
 *
 * Chaque ligne est l'état du site **avant** une publication. Restaurer ne
 * remet rien en ligne : cela ramène l'ancienne version dans le brouillon, où
 * Kevin la regarde avant de décider.
 */
export function Versions({
  pageId,
  onRestaurer,
}: {
  pageId: number;
  onRestaurer: (sections: Section[]) => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    actionListerVersions(pageId).then(setVersions).catch(() => setVersions([]));
  }, [pageId]);

  if (versions === null) return <p className={e.aide}>Chargement…</p>;

  if (!versions.length) {
    return (
      <p className={e.aide}>
        Aucune version pour l’instant. L’historique se remplit à chaque publication : il garde
        l’état du site juste avant, pour permettre d’y revenir.
      </p>
    );
  }

  return (
    <>
      <p className={e.aide}>
        Chaque ligne est l’état du site avant une publication. Restaurer la ramène dans le
        brouillon sans rien remettre en ligne.
      </p>

      <ol className={e.versions}>
        {versions.map((v) => (
          <li key={v.id}>
            <div>
              <strong>{dateLisible(v.date)}</strong>
              <span>{v.auteur ?? 'Auteur supprimé'}</span>
            </div>
            <button
              type="button"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const r = await actionRestaurerVersion(pageId, v.id);
                  onRestaurer(r.sections as Section[]);
                })
              }
            >
              Restaurer
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

function dateLisible(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
