'use server';

import { revalidatePath } from 'next/cache';
import { utilisateurConnecte } from '@/lib/auth';
import {
  compterRecursif,
  creerDossier,
  creerDossierNomLibre,
  deplacerDossier,
  dupliquerDossier,
  enregistrerMedia,
  majMedia,
  rangerMedia,
  renommerDossier,
  supprimerDossier,
  supprimerMedia,
  utilisationsMedia,
  type ImageRecue,
} from '@/lib/medias';

/** Toute action passe par ce garde : une action serveur est une adresse comme une autre. */
async function exigerConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) throw new Error('Non autorisé.');
  return utilisateur;
}

export type EtatMedia = { erreur?: string; envoyees?: number; saisi?: { alt?: string } };

/**
 * Relit une image déjà encodée par le navigateur.
 *
 * Le formulaire est plat : chaque image porte son rang dans le nom de ses
 * champs. `img0.principal`, `img0.largeur`, `img0.v480`… Rien ici n'est cru
 * sur parole — `enregistrerMedia` revérifie que chaque morceau est bien du
 * WebP et que chaque largeur est l'une des nôtres.
 */
function lireImage(donnees: FormData, rang: number): ImageRecue | null {
  const champ = (nom: string) => donnees.get(`img${rang}.${nom}`);

  const principal = champ('principal');
  if (!(principal instanceof Blob) || principal.size === 0) return null;

  const largeurs = String(champ('variantes') ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number);

  const variantes: ImageRecue['variantes'] = [];
  for (const largeur of largeurs) {
    const blob = champ(`v${largeur}`);
    if (!(blob instanceof Blob) || blob.size === 0) return null;
    variantes.push({ largeur, blob });
  }

  return {
    largeur: Number(champ('largeur') ?? 0),
    hauteur: Number(champ('hauteur') ?? 0),
    octets: Number(champ('octets') ?? 0),
    principal,
    variantes,
  };
}

export async function actionEnvoyer(_p: EtatMedia, donnees: FormData): Promise<EtatMedia> {
  await exigerConnexion();

  const alt = String(donnees.get('alt') ?? '').trim();
  const aRemplacer = donnees.get('aRemplacer') === 'on';
  const dossier = Number(donnees.get('dossier') ?? 0) || null;
  const combien = Number(donnees.get('combien') ?? 0);

  const images: ImageRecue[] = [];
  for (let i = 0; i < combien; i++) {
    const image = lireImage(donnees, i);
    if (!image) return { erreur: 'Une des images n’est pas arrivée entière.', saisi: { alt } };
    images.push(image);
  }

  if (!images.length) return { erreur: 'Choisissez au moins une image.', saisi: { alt } };
  if (!alt) {
    return {
      erreur: 'Le texte alternatif est obligatoire : sans lui, ni référencement ni accessibilité.',
      saisi: { alt },
    };
  }

  let envoyees = 0;
  for (const [i, image] of images.entries()) {
    // Plusieurs images d'un coup partagent la même description, numérotée.
    // Kevin l'affinera image par image, mais aucune n'entre sans description.
    const description = images.length > 1 ? `${alt} (${i + 1})` : alt;
    const resultat = await enregistrerMedia(image, description, { aRemplacer });
    if (!resultat.ok) return { erreur: resultat.message, envoyees, saisi: { alt } };
    // Les images arrivent rangées : le classement après coup ne se fait jamais.
    if (dossier) await rangerMedia(resultat.media.id, dossier);
    envoyees++;
  }

  revalidatePath('/admin/medias');
  return { envoyees };
}

export async function actionMajMedia(id: number, alt: string, legende: string) {
  await exigerConnexion();
  if (!alt.trim()) return { erreur: 'Le texte alternatif ne peut pas être vide.' };

  await majMedia(id, { alt, legende });
  revalidatePath('/admin/medias');
  return {};
}

export async function actionUtilisations(id: number) {
  await exigerConnexion();
  return utilisationsMedia(id);
}

export async function actionSupprimerMedia(id: number) {
  await exigerConnexion();

  // Refus net si l'image sert quelque part : un trou dans une page en ligne ne
  // se voit pas tout de suite, et se répare mal.
  const usages = await utilisationsMedia(id);
  if (usages.length) {
    return { erreur: `Image utilisée par : ${usages.map((u) => u.titre).join(', ')}.` };
  }

  await supprimerMedia(id);
  revalidatePath('/admin/medias');
  return {};
}


// ————————————————————————— Dossiers —————————————————————————

export async function actionCreerDossier(nom: string, parentId: number | null = null) {
  await exigerConnexion();
  const r = await creerDossier(nom, parentId);
  revalidatePath('/admin/medias');
  return r;
}

/** Le bouton « Nouveau dossier » : on crée d'abord, on nomme ensuite. */
export async function actionCreerDossierNomLibre(parentId: number | null = null) {
  await exigerConnexion();
  const r = await creerDossierNomLibre(parentId);
  revalidatePath('/admin/medias');
  return r;
}

export async function actionRenommerDossier(id: number, nom: string) {
  await exigerConnexion();
  const r = await renommerDossier(id, nom);
  revalidatePath('/admin/medias');
  return r;
}

/** Le dossier part, ses images restent : elles rejoignent le fonds commun. */
export async function actionSupprimerDossier(id: number) {
  await exigerConnexion();
  await supprimerDossier(id);
  revalidatePath('/admin/medias');
  return {};
}

export async function actionRangerMedia(id: number, dossierId: number | null) {
  await exigerConnexion();
  await rangerMedia(id, dossierId);
  revalidatePath('/admin/medias');
  return {};
}


/**
 * Déplace plusieurs images d'un coup.
 *
 * Un rangement n'abîme rien : l'image reste la même, seul son dossier change.
 * Aucune confirmation, donc — et l'opération se refait dans l'autre sens.
 */
export async function actionRangerPlusieurs(ids: number[], dossierId: number | null) {
  await exigerConnexion();
  for (const id of ids) await rangerMedia(id, dossierId);
  revalidatePath('/admin/medias');
  return { deplacees: ids.length };
}

/**
 * Supprime plusieurs images, pour de bon.
 *
 * La ligne part de la base et les fichiers du disque : rien n'est caché à
 * l'écran en restant là-dessous. Une image utilisée par une page est refusée
 * et nommée — les autres partent quand même, plutôt que de tout annuler pour
 * une seule.
 */
export async function actionSupprimerPlusieurs(ids: number[]) {
  await exigerConnexion();

  const refusees: string[] = [];
  let supprimees = 0;

  for (const id of ids) {
    const usages = await utilisationsMedia(id);
    if (usages.length) {
      refusees.push(usages[0].titre);
      continue;
    }
    await supprimerMedia(id);
    supprimees++;
  }

  revalidatePath('/admin/medias');
  return {
    supprimees,
    erreur: refusees.length
      ? `${refusees.length} image${refusees.length > 1 ? 's' : ''} conservée${
          refusees.length > 1 ? 's' : ''
        } : encore utilisée${refusees.length > 1 ? 's' : ''} par ${[...new Set(refusees)].join(', ')}.`
      : undefined,
  };
}


export async function actionDeplacerDossier(id: number, parentId: number | null) {
  await exigerConnexion();
  const r = await deplacerDossier(id, parentId);
  revalidatePath('/admin/medias');
  return r;
}

/** Combien d'images une duplication recopierait : annonce avant le geste. */
export async function actionCompterDossier(id: number) {
  await exigerConnexion();
  return compterRecursif(id);
}

export async function actionDupliquerDossier(id: number) {
  await exigerConnexion();
  const copiees = await dupliquerDossier(id);
  revalidatePath('/admin/medias');
  return { copiees };
}
