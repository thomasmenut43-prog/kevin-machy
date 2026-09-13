'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Entreprise as Infos } from '@/lib/entreprise';
import {
  actionEnregistrerEntreprise,
  actionEntreprise,
  type EtatReglages,
} from './(protege)/reglages/actions';
import r from './(protege)/reglages/reglages.module.css';

/**
 * Mon entreprise.
 *
 * Tout ce que le site affirme de Kevin au visiteur : son nom, où il reçoit,
 * comment on le joint, quand le studio est ouvert, et les pages qui
 * l'engagent. C'était écrit dans le code ; c'est maintenant à lui.
 *
 * Les champs sont rangés par usage — se présenter, être joint, être trouvé —
 * et non par table : Kevin cherche « mon numéro de téléphone », pas « le
 * champ telephone de l'entreprise ».
 */

const VIDE: EtatReglages = {};

const LIENS: { cle: keyof Infos['liens']; libelle: string; aide?: string }[] = [
  { cle: 'reservation', libelle: 'Prise de rendez-vous', aide: 'Votre page SumUp.' },
  { cle: 'accesClients', libelle: 'Accès clients', aide: 'Votre galerie pic-time.' },
  { cle: 'instagram', libelle: 'Instagram' },
  { cle: 'facebook', libelle: 'Facebook' },
  { cle: 'linkedin', libelle: 'LinkedIn' },
  { cle: 'youtube', libelle: 'YouTube' },
  { cle: 'avis', libelle: 'Page d’avis' },
  { cle: 'mentions', libelle: 'Mentions légales' },
  { cle: 'cgv', libelle: 'Conditions de vente' },
  { cle: 'cookies', libelle: 'Politique de cookies' },
];

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button className="bo-bouton" type="submit" disabled={pending}>
      {pending ? 'Enregistrement…' : 'Enregistrer'}
    </button>
  );
}

export function Entreprise() {
  const [infos, setInfos] = useState<Infos | null>(null);
  const [etat, envoyer] = useActionState(actionEnregistrerEntreprise, VIDE);

  useEffect(() => {
    actionEntreprise().then(setInfos).catch(() => setInfos(null));
  }, []);

  if (!infos) return <p className="bo-aide">Chargement…</p>;

  return (
    <form className="bo-form bo-encadre" action={envoyer}>
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

      <h2 className={r.titre}>Se présenter</h2>

      <div className="bo-champ">
        <label htmlFor="e-nom">Nom</label>
        <input id="e-nom" name="nom" type="text" defaultValue={infos.nom} required />
        <p className="bo-aide">Le nom sous lequel vous exercez, celui que lisent vos clients.</p>
      </div>

      <div className="bo-champ">
        <label htmlFor="e-role">Métier</label>
        <input id="e-role" name="role" type="text" defaultValue={infos.role} />
      </div>

      <div className="bo-champ">
        <label htmlFor="e-raison">Dénomination légale</label>
        <input
          id="e-raison"
          name="raisonSociale"
          type="text"
          defaultValue={infos.raisonSociale}
          placeholder="Par exemple Kevin Machy EI"
        />
      </div>

      <div className="bo-champ">
        <label htmlFor="e-siret">SIRET</label>
        <input id="e-siret" name="siret" type="text" defaultValue={infos.siret} inputMode="numeric" />
        <p className="bo-aide">
          Il n’apparaît pas sur les pages du site : il sert aux mentions légales et aux factures.
        </p>
      </div>

      <h2 className={r.titre}>Être joint</h2>

      <div className="bo-champ">
        <label htmlFor="e-telephone">Téléphone</label>
        <input id="e-telephone" name="telephone" type="tel" defaultValue={infos.telephone} />
        <p className="bo-aide">
          Écrivez-le comme vous le dictez : le lien d’appel est fabriqué à partir de lui.
        </p>
      </div>

      <div className="bo-champ">
        <label htmlFor="e-email">Adresse e-mail publique</label>
        <input id="e-email" name="email" type="email" defaultValue={infos.email} />
        <p className="bo-aide">
          Celle que voient vos visiteurs. Elle n’a rien à voir avec celle qui vous connecte au
          BackOffice, ni avec le serveur d’envoi réglé dans l’onglet E-mails.
        </p>
      </div>

      <h2 className={r.titre}>Être trouvé</h2>

      <div className="bo-champ">
        <label htmlFor="e-adresse">Adresse du studio</label>
        <input id="e-adresse" name="adresse" type="text" defaultValue={infos.adresse} />
      </div>

      <div className={r.paire}>
        <div className="bo-champ">
          <label htmlFor="e-cp">Code postal</label>
          <input id="e-cp" name="codePostal" type="text" defaultValue={infos.codePostal} />
        </div>
        <div className="bo-champ">
          <label htmlFor="e-ville">Ville</label>
          <input id="e-ville" name="ville" type="text" defaultValue={infos.ville} />
        </div>
      </div>

      <div className="bo-champ">
        <label htmlFor="e-region">Département ou région</label>
        <input id="e-region" name="region" type="text" defaultValue={infos.region} />
      </div>

      <div className="bo-champ">
        <label htmlFor="e-zone">Zone d’intervention</label>
        <textarea id="e-zone" name="zone" rows={2} defaultValue={infos.zone} />
        <p className="bo-aide">La phrase du pied de page : les villes où vous vous déplacez.</p>
      </div>

      <div className="bo-champ">
        <label htmlFor="e-url">Adresse du site</label>
        <input id="e-url" name="url" type="url" defaultValue={infos.url} />
        <p className="bo-aide">
          Le domaine complet, https compris. Il sert aux liens que Google affiche et au partage
          sur les réseaux.
        </p>
      </div>

      <h2 className={r.titre}>Horaires du studio</h2>
      <p className="bo-aide">
        Laissez vide un jour de fermeture. Exemple d’horaire : <code>09:45 – 20:30</code>.
      </p>

      {infos.horaires.map((h, i) => (
        <div className="bo-champ" key={h.jour}>
          <label htmlFor={`e-h-${i}`}>{h.jour}</label>
          <input type="hidden" name="jour" value={h.jour} />
          <input
            id={`e-h-${i}`}
            name={`horaire_${i}`}
            type="text"
            defaultValue={h.ouverture ?? ''}
            placeholder="Fermé"
          />
        </div>
      ))}

      <h2 className={r.titre}>Liens</h2>

      {LIENS.map((l) => (
        <div className="bo-champ" key={l.cle}>
          <label htmlFor={`e-l-${l.cle}`}>{l.libelle}</label>
          <input
            id={`e-l-${l.cle}`}
            name={`lien_${l.cle}`}
            type="url"
            defaultValue={infos.liens[l.cle]}
            placeholder="https://"
          />
          {l.aide ? <p className="bo-aide">{l.aide}</p> : null}
        </div>
      ))}

      <Bouton />
    </form>
  );
}
