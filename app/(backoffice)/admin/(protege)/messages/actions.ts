'use server';

import { revalidatePath } from 'next/cache';
import { utilisateurConnecte } from '@/lib/auth';
import { marquerLu, supprimerMessage } from '@/lib/messages';

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

export async function actionSupprimerMessage(id: number) {
  const utilisateur = await exigerConnexion();
  if (utilisateur.role !== 'administrateur') throw new Error('Non autorisé.');
  await supprimerMessage(id);
  revalidatePath('/admin/messages');
}
