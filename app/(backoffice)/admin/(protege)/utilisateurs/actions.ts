'use server';

import { revalidatePath } from 'next/cache';
import {
  changerMotDePasse,
  changerRole,
  creerCompte,
  fermerAutresSessions,
  motDePasseAcceptable,
  motDePasseCorrect,
  supprimerUtilisateur,
  utilisateurConnecte,
} from '@/lib/auth';

async function exigerConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) throw new Error('Non autorisé.');
  return utilisateur;
}

async function exigerAdministrateur() {
  const utilisateur = await exigerConnexion();
  if (utilisateur.role !== 'administrateur') throw new Error('Non autorisé.');
  return utilisateur;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type EtatCompte = { erreur?: string; succes?: string; saisi?: Record<string, string> };

export async function actionCreerCompte(_p: EtatCompte, donnees: FormData): Promise<EtatCompte> {
  await exigerAdministrateur();

  const nom = String(donnees.get('nom') ?? '').trim();
  const email = String(donnees.get('email') ?? '').trim();
  const motDePasse = String(donnees.get('motDePasse') ?? '');
  const role = String(donnees.get('role') ?? 'editeur') as 'administrateur' | 'editeur';
  const saisi = { nom, email, role };

  if (!nom) return { erreur: 'Indiquez un nom.', saisi };
  if (!EMAIL.test(email)) return { erreur: 'Cette adresse e-mail ne semble pas valide.', saisi };

  const faible = motDePasseAcceptable(motDePasse);
  if (faible) return { erreur: faible, saisi };

  try {
    await creerCompte({ nom, email, motDePasse, role });
  } catch (erreur) {
    if ((erreur as { code?: string }).code === '23505') {
      return { erreur: 'Un compte utilise déjà cette adresse.', saisi };
    }
    throw erreur;
  }

  revalidatePath('/admin/utilisateurs');
  return { succes: `Compte créé pour ${nom}. Transmettez-lui son mot de passe de vive voix.` };
}

export async function actionChangerRole(id: number, role: 'administrateur' | 'editeur') {
  const moi = await exigerAdministrateur();

  // Se rétrograder soi-même est le meilleur moyen de se retrouver dehors sans
  // pouvoir revenir. On l'interdit, quitte à demander à un collègue.
  if (id === moi.id && role === 'editeur') {
    return { erreur: 'Vous ne pouvez pas retirer votre propre rôle d’administrateur.' };
  }

  const r = await changerRole(id, role);
  revalidatePath('/admin/utilisateurs');
  return r;
}

export async function actionSupprimerCompte(id: number) {
  const moi = await exigerAdministrateur();
  if (id === moi.id) return { erreur: 'Vous ne pouvez pas supprimer votre propre compte.' };

  const r = await supprimerUtilisateur(id);
  revalidatePath('/admin/utilisateurs');
  return r;
}

/** Réinitialisation par un administrateur : toutes les sessions du compte tombent. */
export async function actionReinitialiserMotDePasse(id: number, nouveau: string) {
  const moi = await exigerAdministrateur();
  if (id === moi.id) {
    return { erreur: 'Pour votre propre mot de passe, utilisez le formulaire du bas.' };
  }

  const faible = motDePasseAcceptable(nouveau);
  if (faible) return { erreur: faible };

  await changerMotDePasse(id, nouveau);
  revalidatePath('/admin/utilisateurs');
  return { succes: 'Mot de passe remplacé. Les appareils connectés à ce compte sont déconnectés.' };
}

export async function actionChangerMonMotDePasse(
  _p: EtatCompte,
  donnees: FormData,
): Promise<EtatCompte> {
  const moi = await exigerConnexion();

  const actuel = String(donnees.get('actuel') ?? '');
  const nouveau = String(donnees.get('nouveau') ?? '');
  const confirmation = String(donnees.get('confirmation') ?? '');

  // On redemande le mot de passe en cours : sans cela, un poste laissé ouvert
  // suffirait à en changer et à verrouiller le compte de son propriétaire.
  if (!(await motDePasseCorrect(moi.id, actuel))) {
    return { erreur: 'Le mot de passe actuel est incorrect.' };
  }
  if (nouveau !== confirmation) return { erreur: 'Les deux nouveaux mots de passe diffèrent.' };

  const faible = motDePasseAcceptable(nouveau);
  if (faible) return { erreur: faible };

  await changerMotDePasse(moi.id, nouveau, { garderSessionCourante: true });
  revalidatePath('/admin/utilisateurs');
  return { succes: 'Mot de passe changé. Vos autres appareils ont été déconnectés.' };
}

export async function actionFermerAutresSessions() {
  const moi = await exigerConnexion();
  await fermerAutresSessions(moi.id);
  revalidatePath('/admin/utilisateurs');
}
