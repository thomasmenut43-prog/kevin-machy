'use client';

import type React from 'react';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { encoderAvatar, ImageIllisible } from '@/lib/encoder-images';
import { COTES_AVATAR } from '@/lib/largeurs-medias';
import { urlAvatar } from '@/lib/modeles';
import {
  actionMaPhoto,
  actionMonEmail,
  actionMonProfil,
  actionRetirerMaPhoto,
  type EtatCompte,
} from './actions';
import type { MonProfil as Profil } from '../reglages/actions';
import u from './utilisateurs.module.css';

/**
 * Mon compte : la photo, l'identité, l'adresse de connexion.
 *
 * Trois formulaires plutôt qu'un seul. Changer son nom et changer l'adresse
 * avec laquelle on se connecte ne sont pas le même geste : le second redemande
 * le mot de passe, et les mêler obligerait à le redemander pour corriger une
 * faute de frappe sur un prénom.
 */

const VIDE: EtatCompte = {};

function Bouton({ libelle, enCours }: { libelle: string; enCours: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? enCours : libelle}
    </button>
  );
}

function Messages({ etat }: { etat: EtatCompte }) {
  return (
    <>
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
    </>
  );
}

export function MonProfil({ profil, onChange }: { profil: Profil; onChange: () => void }) {
  const [identite, envoyerIdentite] = useActionState(actionMonProfil, VIDE);
  const [courriel, envoyerCourriel] = useActionState(actionMonEmail, VIDE);
  const [photo, envoyerPhoto] = useActionState(actionMaPhoto, VIDE);
  const [enCours, demarrer] = useTransition();
  const formulairePhoto = useRef<HTMLFormElement>(null);
  // Le découpage a lieu dans le navigateur : ce temps-là doit se voir, et son
  // échec se dire, avant même que le serveur soit sollicité.
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);

  // Aperçu immédiat : l'image choisie s'affiche avant d'être envoyée, sinon on
  // ne sait pas ce qu'on est en train de téléverser.
  const [apercu, setApercu] = useState<string | null>(null);
  useEffect(() => () => {
    if (apercu) URL.revokeObjectURL(apercu);
  }, [apercu]);

  // La fenêtre a lu le profil à son ouverture : après un enregistrement, elle
  // le relit, sans quoi elle continuerait d'afficher l'ancien.
  const succes = identite.succes || courriel.succes || photo.succes;
  useEffect(() => {
    if (succes) onChange();
  }, [succes, onChange]);

  const initiales =
    [profil.prenom[0], profil.nom[0]].filter(Boolean).join('').toUpperCase() || '?';
  const image = apercu ?? (profil.avatar ? urlAvatar(profil.avatar) : null);

  /**
   * La photo est découpée ici, dans le navigateur.
   *
   * Le serveur ne redimensionne plus : `sharp` en est parti pour que
   * l'application puisse tourner ailleurs que sur un serveur Node. Il reçoit
   * donc les deux carrés déjà prêts, et se contente de les ranger.
   */
  async function soumettrePhoto(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (envoiPhoto) return;

    const fichier = (new FormData(evenement.currentTarget).get('photo') as File | null) ?? null;
    if (!fichier || fichier.size === 0) {
      setErreurPhoto('Choisissez une image.');
      return;
    }

    setErreurPhoto(null);
    setEnvoiPhoto(true);
    try {
      const carres = await encoderAvatar(fichier, COTES_AVATAR);
      const donnees = new FormData();
      for (const carre of carres) {
        donnees.set(`carre${carre.largeur}`, carre.blob, `${carre.largeur}.webp`);
      }
      envoyerPhoto(donnees);
    } catch (erreur) {
      setErreurPhoto(
        erreur instanceof ImageIllisible
          ? 'Cette image n’a pas pu être lue. JPEG, PNG, WebP ou AVIF.'
          : 'La préparation de l’image a échoué.',
      );
    } finally {
      setEnvoiPhoto(false);
    }
  }

  return (
    <>
      <form className="bo-form bo-encadre" onSubmit={soumettrePhoto} ref={formulairePhoto}>
        <h2 className={u.titre}>Ma photo</h2>
        {erreurPhoto ? (
          <p className="bo-erreur" role="alert">
            {erreurPhoto}
          </p>
        ) : (
          <Messages etat={photo} />
        )}

        <div className={u.photoLigne}>
          <span className={u.photoRond} aria-hidden="true">
            {image ? <img src={image} alt="" /> : <span>{initiales}</span>}
          </span>

          <div className={u.photoActions}>
            <label className="bo-bouton bo-bouton-discret" htmlFor="ma-photo">
              Choisir une image
            </label>
            <input
              id="ma-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="visuellement-cache"
              onChange={(ev) => {
                const fichier = ev.target.files?.[0];
                setApercu(fichier ? URL.createObjectURL(fichier) : null);
              }}
            />
            <button className="bo-bouton" type="submit" disabled={envoiPhoto}>
              {envoiPhoto ? 'Préparation…' : 'Enregistrer la photo'}
            </button>
            {profil.avatar ? (
              <button
                type="button"
                className="bo-bouton bo-bouton-discret"
                disabled={enCours}
                onClick={() =>
                  demarrer(async () => {
                    await actionRetirerMaPhoto();
                    setApercu(null);
                    formulairePhoto.current?.reset();
                    onChange();
                  })
                }
              >
                Retirer
              </button>
            ) : null}
            <p className={u.aide}>
              Elle n’apparaît que dans le BackOffice, jamais sur le site. Recadrée en carré.
            </p>
          </div>
        </div>
      </form>

      <form className="bo-form bo-encadre" action={envoyerIdentite}>
        <h2 className={u.titre}>Mon identité</h2>
        <Messages etat={identite} />

        <div className="bo-champ">
          <label htmlFor="p-prenom">Prénom</label>
          <input
            id="p-prenom"
            name="prenom"
            type="text"
            autoComplete="given-name"
            defaultValue={identite.saisi?.prenom ?? profil.prenom}
            required
          />
        </div>

        <div className="bo-champ">
          <label htmlFor="p-nom">Nom</label>
          <input
            id="p-nom"
            name="nom"
            type="text"
            autoComplete="family-name"
            defaultValue={identite.saisi?.nom ?? profil.nom}
          />
          <p className="bo-aide">
            Le BackOffice vous appelle par votre prénom ; les deux ensemble servent à vous
            reconnaître dans la liste des comptes.
          </p>
        </div>

        <Bouton libelle="Enregistrer" enCours="Enregistrement…" />
      </form>

      <form className="bo-form bo-encadre" action={envoyerCourriel}>
        <h2 className={u.titre}>Mon adresse de connexion</h2>
        <Messages etat={courriel} />

        <div className="bo-champ">
          <label htmlFor="p-email">Adresse e-mail</label>
          <input
            id="p-email"
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={courriel.saisi?.email ?? profil.email}
            required
          />
          <p className="bo-aide">
            C’est avec elle que vous vous connectez. Les demandes du formulaire de contact
            partent, elles, vers l’adresse réglée dans l’onglet E-mails.
          </p>
        </div>

        <div className="bo-champ">
          <label htmlFor="p-motdepasse">Votre mot de passe</label>
          <input
            id="p-motdepasse"
            name="motDePasse"
            type="password"
            autoComplete="current-password"
            required
          />
          <p className="bo-aide">
            Redemandé parce que cette adresse est votre identifiant : sans cela, un poste laissé
            ouvert suffirait à s’emparer du compte.
          </p>
        </div>

        <Bouton libelle="Changer mon adresse" enCours="Changement…" />
      </form>
    </>
  );
}
