'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  aucunCompte,
  connecter,
  creerCompte,
  fermerSession,
  motDePasseAcceptable,
  nettoyerSessions,
} from '@/lib/auth';

/**
 * Ce qu'un formulaire renvoie après tentative.
 *
 * Les champs saisis reviennent avec l'erreur, et c'est important : sans eux,
 * React réaffiche un formulaire vide après chaque refus, et l'utilisateur
 * retape son adresse à chaque essai. Le mot de passe, lui, ne revient jamais.
 */
export type EtatFormulaire = {
  erreur?: string;
  saisi?: { nom?: string; email?: string };
};

/** Une adresse e-mail plausible. La vérité, c'est l'envoi qui la donnera. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function actionConnexion(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const email = String(donnees.get('email') ?? '');
  const motDePasse = String(donnees.get('motDePasse') ?? '');
  const saisi = { email };

  if (!email || !motDePasse) return { erreur: 'Renseignez les deux champs.', saisi };

  const agent = (await headers()).get('user-agent') ?? undefined;
  const resultat = await connecter(email, motDePasse, agent);

  if (!resultat.ok) return { erreur: resultat.message, saisi };

  await nettoyerSessions();
  redirect('/admin/');
}

export async function actionPremierCompte(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  // Vérifié ici et pas seulement à l'affichage : sans ce garde, l'adresse
  // resterait un moyen de créer un compte une fois le premier créé.
  if (!(await aucunCompte())) return { erreur: 'Un compte existe déjà. Utilisez la connexion.' };

  const nom = String(donnees.get('nom') ?? '').trim();
  const email = String(donnees.get('email') ?? '').trim();
  const motDePasse = String(donnees.get('motDePasse') ?? '');
  const confirmation = String(donnees.get('confirmation') ?? '');
  const saisi = { nom, email };

  if (!nom) return { erreur: 'Indiquez un nom.', saisi };
  if (!EMAIL.test(email)) return { erreur: 'Cette adresse e-mail ne semble pas valide.', saisi };
  if (motDePasse !== confirmation) return { erreur: 'Les deux mots de passe diffèrent.', saisi };

  const faible = motDePasseAcceptable(motDePasse);
  if (faible) return { erreur: faible, saisi };

  await creerCompte({ nom, email, motDePasse });
  const resultat = await connecter(email, motDePasse);
  if (!resultat.ok) return { erreur: 'Compte créé, mais la connexion a échoué. Réessayez.', saisi };

  redirect('/admin/');
}

export async function actionDeconnexion() {
  await fermerSession();
  redirect('/admin/connexion/');
}
