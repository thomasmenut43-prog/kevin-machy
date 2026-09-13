'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  actionChoisirPaiement,
  actionConnecterGoogle,
  actionDeconnecterGoogle,
  actionIntegrations,
} from './(protege)/reglages/actions';
import type { IntegrationsAffichables } from '@/lib/integrations';

/**
 * Les services extérieurs, en liste.
 *
 * Un par ligne, avec son état et le geste qui va avec. Stripe et SumUp sont
 * là mais fermés : ils encaissent, et la boutique n'existe pas encore. Les
 * montrer grisés vaut mieux que de les cacher — Kevin voit ce qui l'attend,
 * et ne se demande pas si le paiement est possible.
 */
export function Integrations() {
  const [etat, setEtat] = useState<IntegrationsAffichables | null>(null);
  const [ouvre, setOuvre] = useState(false);
  const [placeId, setPlaceId] = useState('');
  const [cle, setCle] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const recharger = () => actionIntegrations().then(setEtat);
  useEffect(() => {
    recharger();
  }, []);

  if (!etat) return <p className="bo-aide">Chargement…</p>;

  const connecter = () =>
    demarrer(async () => {
      const r = await actionConnecterGoogle(placeId, cle);
      if (r.erreur) return setErreur(r.erreur);
      setErreur(null);
      setOuvre(false);
      setPlaceId('');
      setCle('');
      await recharger();
    });

  return (
    <div className="bo-integrations">
      {erreur ? (
        <p className="bo-erreur" role="alert">
          {erreur}
        </p>
      ) : null}

      {/* ————————————————————— Avis Google ————————————————————— */}
      <div className="bo-integration">
        <div>
          <strong>Avis Google</strong>
          <p>
            Reprend les avis de la fiche Google du studio et les affiche sur le site. Ils se
            rafraîchissent tout seuls.
          </p>
          {etat.google.connecte ? (
            <p className="bo-integration-etat">
              Connecté · fiche {etat.google.placeId}
            </p>
          ) : null}
        </div>

        {etat.google.connecte ? (
          <button
            type="button"
            className="bo-bouton bo-bouton-discret"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                await actionDeconnecterGoogle();
                await recharger();
              })
            }
          >
            Déconnecter
          </button>
        ) : (
          <button type="button" className="bo-bouton" onClick={() => setOuvre((v) => !v)}>
            Connecter
          </button>
        )}
      </div>

      {ouvre && !etat.google.connecte ? (
        <div className="bo-integration-form">
          <div className="bo-champ">
            <label htmlFor="i-place">Identifiant de la fiche</label>
            <input
              id="i-place"
              type="text"
              value={placeId}
              placeholder="ChIJ…"
              onChange={(ev) => setPlaceId(ev.target.value)}
            />
            <p className="bo-aide">
              Le « Place ID » de la fiche Google du studio. Il se trouve dans la fiche
              d’établissement.
            </p>
          </div>

          <div className="bo-champ">
            <label htmlFor="i-cle">Clef d’API</label>
            <input
              id="i-cle"
              type="password"
              autoComplete="off"
              value={cle}
              onChange={(ev) => setCle(ev.target.value)}
            />
            <p className="bo-aide">
              Elle est chiffrée avant d’être enregistrée, et ne peut plus être réaffichée —
              seulement remplacée.
            </p>
          </div>

          <button type="button" className="bo-bouton" disabled={enCours} onClick={connecter}>
            {enCours ? 'Connexion…' : 'Connecter'}
          </button>
        </div>
      ) : null}

      {/* ————————————————————— Encaissement ————————————————————— */}
      {(['stripe', 'sumup'] as const).map((nom) => {
        const autre = nom === 'stripe' ? 'sumup' : 'stripe';
        const actif = etat.paiement === nom;
        const prisParLAutre = etat.paiement === autre;

        return (
          <div className="bo-integration" key={nom} data-ferme={!etat.boutiqueActive ? '' : undefined}>
            <div>
              <strong>{nom === 'stripe' ? 'Stripe' : 'SumUp'}</strong>
              <p>
                Encaisse les commandes de la boutique par carte.
                {prisParLAutre
                  ? ` Indisponible : ${autre === 'stripe' ? 'Stripe' : 'SumUp'} est déjà connecté.`
                  : ''}
              </p>
              {!etat.boutiqueActive ? (
                <p className="bo-integration-etat">
                  La boutique n’est pas encore en place : rien à encaisser pour l’instant.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              className="bo-bouton bo-bouton-discret"
              disabled={!etat.boutiqueActive || prisParLAutre || enCours}
              title={
                !etat.boutiqueActive
                  ? 'Disponible quand la boutique sera activée'
                  : prisParLAutre
                    ? 'Un seul encaisseur à la fois'
                    : undefined
              }
              onClick={() =>
                demarrer(async () => {
                  // Un seul encaisseur : choisir l'un débranche l'autre.
                  await actionChoisirPaiement(actif ? null : nom);
                  await recharger();
                })
              }
            >
              {actif ? 'Déconnecter' : 'Connecter'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
