'use client';

import { useEffect, useState } from 'react';
import { URL_CONTACT, type EtatContact } from '@/lib/guichets';
import { PROJETS } from '@/lib/site';
import s from './ContactForm.module.css';

/**
 * Les coordonnées sont données, pas lues ici : elles viennent de Paramètres →
 * Mon entreprise, et ce composant tourne dans le navigateur.
 */
type ContactProps = { email: string; telephone: string };

/**
 * Formulaire court : cinq champs, pas un de plus.
 *
 * L'envoi part vers le guichet de contact, qui enregistre la demande puis
 * prévient Kevin par e-mail. La demande est écrite en base **avant** l'envoi :
 * une panne du serveur d'e-mails ne fait donc perdre aucun client.
 *
 * L'envoi passe par le navigateur et non par une action serveur, pour une
 * raison d'hébergement : une vitrine figée en fichiers statiques n'a pas
 * d'action serveur, seulement une adresse à qui parler. Le prix à payer est
 * réel — sans JavaScript, le formulaire ne part plus. D'où le repli affiché
 * plus bas, qui donne l'adresse et le téléphone en clair.
 */
export function ContactForm({ email, telephone }: ContactProps) {
  const [etat, setEtat] = useState<EtatContact>({});
  const [envoi, setEnvoi] = useState(false);
  const [projet, setProjet] = useState<string>('mariage');
  // Horodatage d'ouverture : un formulaire renvoyé en moins de trois secondes
  // n'a pas été rempli par un humain.
  const [ouvertA] = useState(() => Date.now());

  // Permet aux liens du site de préremplir le type de projet (?projet=iris).
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('projet');
    if (demande && PROJETS.some((p) => p.value === demande)) setProjet(demande);
  }, []);

  async function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    if (envoi) return;

    const champs = Object.fromEntries(new FormData(evenement.currentTarget));
    setEnvoi(true);
    setEtat({});

    try {
      const reponse = await fetch(URL_CONTACT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...champs, ouvertA }),
      });
      setEtat(await reponse.json());
    } catch {
      // Réseau coupé, guichet injoignable : on ne laisse pas le visiteur sans
      // réponse, et le repli lui donne de quoi joindre Kevin autrement.
      setEtat({ erreur: 'L’envoi n’a pas abouti.' });
    } finally {
      setEnvoi(false);
    }
  }

  if (etat.ok) {
    return (
      <p className={s.etat} data-ton="succes" role="status">
        Message reçu. Je vous réponds rapidement.
      </p>
    );
  }

  return (
    <form className={s.formulaire} onSubmit={soumettre} noValidate={false}>
      <noscript>
        <p className={s.etat} data-ton="erreur">
          Ce formulaire a besoin de JavaScript. Écrivez-moi à {email} ou appelez le {telephone}.
        </p>
      </noscript>
      {/* Champ piège : hors de l'écran et hors du parcours clavier. Un visiteur
          ne le voit jamais, un robot le remplit. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
        <label htmlFor="site">Ne pas remplir</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className={s.paire}>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="nom">
            Votre nom
          </label>
          <input
            className={s.saisie}
            id="nom"
            name="nom"
            type="text"
            autoComplete="name"
            required
          />
        </p>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="email">
            E-mail
          </label>
          <input
            className={s.saisie}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </p>
      </div>

      <div className={s.paire}>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="projet">
            Votre projet
          </label>
          <select
            className={s.choix}
            id="projet"
            name="projet"
            value={projet}
            onChange={(e) => setProjet(e.target.value)}
          >
            {PROJETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </p>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="date">
            Date envisagée <span className={s.facultatif}>— si vous la connaissez</span>
          </label>
          <input
            className={s.saisie}
            id="date"
            name="date"
            type="text"
            inputMode="numeric"
            placeholder="Juin 2027, ou « pas encore décidé »"
          />
        </p>
      </div>

      <p className={s.champ}>
        <label className={s.etiquette} htmlFor="telephone">
          Téléphone <span className={s.facultatif}>— facultatif</span>
        </label>
        <input
          className={s.saisie}
          id="telephone"
          name="telephone"
          type="tel"
          autoComplete="tel"
        />
      </p>

      <p className={s.champ}>
        <label className={s.etiquette} htmlFor="message">
          Racontez-moi
        </label>
        <textarea
          className={s.zone}
          id="message"
          name="message"
          required
          placeholder="Quelques lignes suffisent : ce que vous préparez, où, et quand si vous le savez déjà."
        />
      </p>

      <label className={s.consentement}>
        <input type="checkbox" name="consentement" required />
        <span>J’accepte que mes données soient utilisées pour répondre à ma demande, et rien d’autre.</span>
      </label>

      <div className={s.pied}>
        <button type="submit" className="bouton" disabled={envoi}>
          {envoi ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
        {etat.erreur ? (
          <p className={s.etat} data-ton="erreur" role="status" aria-live="polite">
            {etat.erreur} Sinon, écrivez-moi à {email} ou appelez le {telephone}.
          </p>
        ) : null}
      </div>
    </form>
  );
}
