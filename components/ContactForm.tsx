'use client';

import { useEffect, useRef, useState } from 'react';
import { PROJETS, SITE } from '@/lib/site';
import s from './ContactForm.module.css';

type Etat = { ton: 'repos' | 'envoi' | 'succes' | 'erreur'; message: string };

/**
 * Formulaire court : cinq champs, pas un de plus.
 *
 * Le site étant exporté en statique, il n'y a pas de serveur pour recevoir
 * l'envoi. Deux chemins :
 *   1. NEXT_PUBLIC_CONTACT_ENDPOINT défini → envoi JSON vers ce point de collecte ;
 *   2. sinon → ouverture du client de messagerie avec le message prérempli.
 * Voir README.md pour brancher le point de collecte définitif.
 */
export function ContactForm() {
  const [etat, setEtat] = useState<Etat>({ ton: 'repos', message: '' });
  const [projet, setProjet] = useState<string>('mariage');
  const form = useRef<HTMLFormElement>(null);

  // Permet aux liens du site de préremplir le type de projet (?projet=iris).
  useEffect(() => {
    const demande = new URLSearchParams(window.location.search).get('projet');
    if (demande && PROJETS.some((p) => p.value === demande)) setProjet(demande);
  }, []);

  async function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    const valeurs = Object.fromEntries(donnees.entries()) as Record<string, string>;
    const point = process.env.NEXT_PUBLIC_CONTACT_ENDPOINT;

    if (!point) {
      const corps = [
        `Projet : ${PROJETS.find((p) => p.value === valeurs.projet)?.label ?? valeurs.projet}`,
        valeurs.date ? `Date envisagée : ${valeurs.date}` : null,
        `Téléphone : ${valeurs.telephone || 'non communiqué'}`,
        '',
        valeurs.message,
        '',
        `— ${valeurs.nom} (${valeurs.email})`,
      ]
        .filter(Boolean)
        .join('\n');
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(
        `Demande ${valeurs.projet} — ${valeurs.nom}`,
      )}&body=${encodeURIComponent(corps)}`;
      setEtat({
        ton: 'succes',
        message: 'Votre messagerie s’ouvre avec le message prérempli. Il ne reste qu’à l’envoyer.',
      });
      return;
    }

    setEtat({ ton: 'envoi', message: 'Envoi en cours…' });
    try {
      const reponse = await fetch(point, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(valeurs),
      });
      if (!reponse.ok) throw new Error(String(reponse.status));
      form.current?.reset();
      setEtat({ ton: 'succes', message: 'Message reçu. Je vous réponds rapidement.' });
    } catch {
      setEtat({
        ton: 'erreur',
        message: `L’envoi n’a pas abouti. Écrivez-moi directement à ${SITE.email} ou appelez le ${SITE.telephone}.`,
      });
    }
  }

  return (
    <form className={s.formulaire} onSubmit={envoyer} ref={form} noValidate={false}>
      <div className={s.paire}>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="nom">
            Votre nom
          </label>
          <input className={s.saisie} id="nom" name="nom" type="text" autoComplete="name" required />
        </p>
        <p className={s.champ}>
          <label className={s.etiquette} htmlFor="email">
            E-mail
          </label>
          <input className={s.saisie} id="email" name="email" type="email" autoComplete="email" required />
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
        <input className={s.saisie} id="telephone" name="telephone" type="tel" autoComplete="tel" />
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
        <button type="submit" className="bouton" disabled={etat.ton === 'envoi'}>
          {etat.ton === 'envoi' ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
        <p className={s.etat} data-ton={etat.ton} role="status" aria-live="polite">
          {etat.message}
        </p>
      </div>
    </form>
  );
}
