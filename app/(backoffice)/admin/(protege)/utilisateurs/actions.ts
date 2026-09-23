'use server';

import { revalidatePath } from 'next/cache';
import {
  changerMotDePasse,
  majAvatar,
  majEmail,
  majProfil,
  changerRole,
  creerCompte,
  fermerAutresSessions,
  motDePasseAcceptable,
  motDePasseCorrect,
  supprimerUtilisateur,
  utilisateurConnecte,
} from '@/lib/auth';
import { COTES_AVATAR, effacerAvatar, enregistrerAvatar } from '@/lib/medias';

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

// ————————————————————————————— Mon profil —————————————————————————————

/**
 * Le menu du BackOffice affiche le nom et la photo : tout ce qui change ici
 * doit se voir partout, d'où la remise à jour de la mise en page entière.
 */
function rafraichirBackOffice() {
  revalidatePath('/admin', 'layout');
}

export async function actionMonProfil(_p: EtatCompte, donnees: FormData): Promise<EtatCompte> {
  const moi = await exigerConnexion();

  const prenom = String(donnees.get('prenom') ?? '').trim();
  const nom = String(donnees.get('nom') ?? '').trim();

  if (!prenom) return { erreur: 'Indiquez au moins un prénom.', saisi: { prenom, nom } };
  if (prenom.length > 80 || nom.length > 80) {
    return { erreur: 'Quatre-vingts caractères au maximum.', saisi: { prenom, nom } };
  }

  await majProfil(moi.id, { prenom, nom });
  rafraichirBackOffice();
  return { succes: 'Profil enregistré.' };
}

/**
 * L'adresse de connexion.
 *
 * Le mot de passe est redemandé pour la même raison que sur le mot de passe
 * lui-même : l'adresse est l'identifiant du compte, et la changer depuis un
 * poste resté ouvert reviendrait à s'en emparer.
 */
export async function actionMonEmail(_p: EtatCompte, donnees: FormData): Promise<EtatCompte> {
  const moi = await exigerConnexion();

  const email = String(donnees.get('email') ?? '').trim();
  const motDePasse = String(donnees.get('motDePasse') ?? '');
  const saisi = { email };

  if (!EMAIL.test(email)) return { erreur: 'Cette adresse e-mail ne semble pas valide.', saisi };
  if (email.toLowerCase() === moi.email.toLowerCase()) {
    return { erreur: 'C’est déjà votre adresse.', saisi };
  }
  if (!(await motDePasseCorrect(moi.id, motDePasse))) {
    return { erreur: 'Le mot de passe est incorrect.', saisi };
  }

  try {
    await majEmail(moi.id, email);
  } catch (erreur) {
    if ((erreur as { code?: string }).code === '23505') {
      return { erreur: 'Un compte utilise déjà cette adresse.', saisi };
    }
    throw erreur;
  }

  rafraichirBackOffice();
  return { succes: `Vous vous connecterez désormais avec ${email}.` };
}

export async function actionMaPhoto(_p: EtatCompte, donnees: FormData): Promise<EtatCompte> {
  const moi = await exigerConnexion();

  // Le navigateur a déjà découpé les deux carrés : ici on ne fait que les
  // relire. `enregistrerAvatar` vérifie qu'ils sont bien du WebP.
  const carres: { largeur: number; blob: Blob }[] = [];
  for (const cote of COTES_AVATAR) {
    const blob = donnees.get(`carre${cote}`);
    if (!(blob instanceof Blob) || blob.size === 0) {
      return { erreur: 'Choisissez une image.' };
    }
    carres.push({ largeur: cote, blob });
  }

  const resultat = await enregistrerAvatar(carres);
  if (!resultat.ok) return { erreur: resultat.message };

  // L'ancienne photo n'est effacée qu'une fois la nouvelle en base : l'ordre
  // inverse laisserait un compte sans image si l'enregistrement échouait.
  const ancienne = await majAvatar(moi.id, resultat.nom);
  await effacerAvatar(ancienne);

  rafraichirBackOffice();
  return { succes: 'Photo mise à jour.' };
}

export async function actionRetirerMaPhoto() {
  const moi = await exigerConnexion();
  const ancienne = await majAvatar(moi.id, null);
  await effacerAvatar(ancienne);
  rafraichirBackOffice();
}
