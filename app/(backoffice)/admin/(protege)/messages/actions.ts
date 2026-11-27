'use server';

import { revalidatePath } from 'next/cache';
import { utilisateurConnecte } from '@/lib/auth';
import { marquerLu, renvoyerNotification, repondre, supprimerMessage } from '@/lib/messages';

/**
 * Le menu porte le nombre de messages non lus : tout ce qui le change doit
 * rafraîchir l'ossature, pas seulement la page des messages.
 */
const rafraichir = () => revalidatePath('/admin', 'layout');

async function exigerConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) throw new Error('Non autorisé.');
  return utilisateur;
}

export async function actionMarquerLu(id: number, lu: boolean) {
  await exigerConnexion();
  await marquerLu(id, lu);
  rafraichir();
}

/**
 * Réessayer de prévenir Kevin d'une demande qu'il n'a jamais reçue par e-mail.
 *
 * Accessible à toute personne connectée, et pas seulement aux administrateurs :
 * le message ne part que vers la boîte déjà configurée pour recevoir les
 * demandes, jamais vers le visiteur ni vers une adresse choisie ici.
 */
export async function actionRenvoyerNotification(id: number) {
  await exigerConnexion();
  const parti = await renvoyerNotification(id);
  rafraichir();
  return parti;
}

export async function actionSupprimerMessage(id: number) {
  const utilisateur = await exigerConnexion();
  if (utilisateur.role !== 'administrateur') throw new Error('Non autorisé.');
  await supprimerMessage(id);
  rafraichir();
}

/**
 * Répondre au visiteur, depuis le BackOffice.
 *
 * Ouvert à toute personne connectée, comme le renvoi : le destinataire est
 * relu en base à partir du message, il ne vient jamais du formulaire.
 */
export async function actionRepondre(
  id: number,
  objet: string,
  texte: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await exigerConnexion();
  const resultat = await repondre(id, { objet, texte });
  if (!resultat.ok) {
    // Le détail technique sert à qui répare : il va dans les journaux.
    if (resultat.detail) console.error('Réponse non partie :', resultat.detail);
    return { ok: false, message: resultat.message };
  }
  rafraichir();
  return { ok: true };
}
