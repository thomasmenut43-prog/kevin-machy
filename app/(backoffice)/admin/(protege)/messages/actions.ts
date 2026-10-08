'use server';

import { revalidatePath } from 'next/cache';
import { utilisateurConnecte } from '@/lib/auth';
import { marquerLu, renvoyerNotification, supprimerMessage } from '@/lib/messages';

async function exigerConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) throw new Error('Non autorisé.');
  return utilisateur;
}

export async function actionMarquerLu(id: number, lu: boolean) {
  await exigerConnexion();
  await marquerLu(id, lu);
  revalidatePath('/admin/messages');
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
  revalidatePath('/admin/messages');
  return parti;
}

export async function actionSupprimerMessage(id: number) {
  const utilisateur = await exigerConnexion();
  if (utilisateur.role !== 'administrateur') throw new Error('Non autorisé.');
  await supprimerMessage(id);
  revalidatePath('/admin/messages');
}
