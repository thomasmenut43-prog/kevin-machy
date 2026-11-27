'use server';

import addressparser from 'nodemailer/lib/addressparser';
import { utilisateurConnecte } from '@/lib/auth';
import {
  echec,
  ecrire,
  lireEmail,
  listerEmails,
  marquerLu,
  supprimer,
  type Echec,
} from '@/lib/boite-mail';

/**
 * La boîte de Kevin est la sienne : réservée aux administrateurs, comme le
 * réglage qui la branche. Un éditeur de pages n'a pas à lire son courrier.
 */
async function exigerAdministrateur() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur?.role !== 'administrateur') throw new Error('Non autorisé.');
}

/** Ce qui arrive du navigateur est vérifié avant d'aller jusqu'au serveur IMAP. */
function verifier(chemin: string, uid?: number) {
  if (typeof chemin !== 'string' || !chemin || chemin.length > 200 || /[\r\n]/.test(chemin)) {
    throw new Error('Dossier invalide.');
  }
  if (uid !== undefined && (!Number.isInteger(uid) || uid < 1)) throw new Error('Message invalide.');
}

export async function actionLister(chemin: string, numero: number) {
  await exigerAdministrateur();
  verifier(chemin);
  try {
    return { ok: true as const, ...(await listerEmails(chemin, Math.max(0, Math.trunc(numero) || 0))) };
  } catch (erreur) {
    return echec(erreur);
  }
}

export async function actionLire(chemin: string, uid: number) {
  await exigerAdministrateur();
  verifier(chemin, uid);
  try {
    const email = await lireEmail(chemin, uid);
    return email
      ? { ok: true as const, email }
      : ({ ok: false, message: 'Ce message n’existe plus. Il a peut-être été déplacé ailleurs.' } as Echec);
  } catch (erreur) {
    return echec(erreur);
  }
}

export async function actionMarquerLu(chemin: string, uid: number, lu: boolean) {
  await exigerAdministrateur();
  verifier(chemin, uid);
  try {
    await marquerLu(chemin, uid, Boolean(lu));
    return { ok: true as const };
  } catch (erreur) {
    return echec(erreur);
  }
}

export async function actionSupprimer(chemin: string, uid: number, definitivement: boolean) {
  await exigerAdministrateur();
  verifier(chemin, uid);
  try {
    return { ok: true as const, issue: await supprimer(chemin, uid, Boolean(definitivement)) };
  } catch (erreur) {
    return echec(erreur);
  }
}

const ADRESSE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

/**
 * Relire une liste d'adresses comme le ferait un logiciel de courrier.
 *
 * « Marie <marie@exemple.fr>, paul@exemple.fr » doit passer ; une faute de
 * frappe doit être dite **avant** l'envoi, adresse par adresse, plutôt que de
 * revenir en message d'erreur du serveur une heure plus tard.
 */
function adresses(champ: string, libelle: string): { liste: string[] } | { erreur: string } {
  const liste = addressparser(champ ?? '', { flatten: true })
    .map((a) => ({ nom: a.name, adresse: (a.address ?? '').trim() }))
    .filter((a) => a.adresse || a.nom);

  for (const a of liste) {
    if (!ADRESSE.test(a.adresse)) {
      return { erreur: `${libelle} : « ${a.adresse || a.nom} » n’est pas une adresse e-mail.` };
    }
  }
  return {
    liste: liste.map((a) =>
      a.nom ? `"${a.nom.replace(/["\\\r\n]/g, '')}" <${a.adresse}>` : a.adresse,
    ),
  };
}

export async function actionEcrire(
  brouillon: { a: string; cc: string; objet: string; texte: string },
  reponse?: { chemin: string; uid: number },
): Promise<{ ok: true; range: boolean } | Echec> {
  await exigerAdministrateur();
  if (reponse) verifier(reponse.chemin, reponse.uid);

  const a = adresses(brouillon.a, 'Destinataire');
  if ('erreur' in a) return { ok: false, message: a.erreur };
  const cc = adresses(brouillon.cc, 'Copie');
  if ('erreur' in cc) return { ok: false, message: cc.erreur };
  if (!a.liste.length) return { ok: false, message: 'Indiquez au moins un destinataire.' };
  if (a.liste.length + cc.liste.length > 20) {
    return { ok: false, message: 'Vingt destinataires au plus par message.' };
  }

  // Un saut de ligne dans un objet ouvrirait la porte à des en-têtes ajoutés.
  const objet = String(brouillon.objet ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 200);
  const texte = String(brouillon.texte ?? '').slice(0, 50_000);
  if (!objet) return { ok: false, message: 'Indiquez un objet.' };
  if (!texte.trim()) return { ok: false, message: 'Le message est vide.' };

  return ecrire({ a: a.liste.join(', '), cc: cc.liste.join(', '), objet, texte }, reponse);
}
