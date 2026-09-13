'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { utilisateurConnecte } from '@/lib/auth';
import { ecrireNavigation } from '@/lib/navigation';
import {
  creerPage,
  depublier,
  enregistrerBrouillon,
  majReglages,
  normaliserChemin,
  nettoyerSections,
  pageParId,
  publier,
  listerVersions,
  restaurerVersion,
  supprimerPage,
  verifierChemin,
} from '@/lib/pages';

/**
 * Toute action passe par ce garde.
 *
 * Une action serveur est une adresse comme une autre : sans vérification, elle
 * s'appelle depuis n'importe où. Le contrôle posé sur la disposition protège
 * l'affichage, pas les actions.
 */
async function exigerConnexion() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) throw new Error('Non autorisé.');
  return utilisateur;
}

export type EtatPage = { erreur?: string; saisi?: Record<string, string> };

export async function actionCreerPage(_p: EtatPage, donnees: FormData): Promise<EtatPage> {
  await exigerConnexion();

  const titre = String(donnees.get('titre') ?? '').trim();
  const chemin = normaliserChemin(String(donnees.get('chemin') ?? ''));
  const saisi = { titre, chemin };

  if (!titre) return { erreur: 'Donnez un nom à la page.', saisi };

  const souci = verifierChemin(chemin);
  if (souci) return { erreur: souci, saisi };

  let page;
  try {
    page = await creerPage({ titre, chemin });
  } catch (erreur) {
    // 23505 : contrainte d'unicité. Deux pages ne peuvent pas partager une adresse.
    if ((erreur as { code?: string }).code === '23505') {
      return { erreur: 'Une page occupe déjà cette adresse.', saisi };
    }
    throw erreur;
  }

  redirect(`/admin/pages/${page!.id}/`);
}

export async function actionEnregistrerBrouillon(id: number, sections: unknown) {
  await exigerConnexion();
  await enregistrerBrouillon(id, nettoyerSections(sections));
  return { ok: true };
}

export async function actionPublier(id: number, sections: unknown) {
  const utilisateur = await exigerConnexion();

  // On enregistre avant de publier : le bouton « Enregistrer » doit mettre en
  // ligne exactement ce que Kevin a sous les yeux, pas le dernier brouillon
  // automatique.
  await enregistrerBrouillon(id, nettoyerSections(sections));
  await publier(id, utilisateur.id);

  const page = await pageParId(id);
  if (page) {
    // La page publique est mise en cache : sans cette purge, le visiteur
    // continuerait de voir l'ancienne version.
    revalidatePath(`/${page.chemin}`);
    revalidatePath('/sitemap.xml');
  }
  revalidatePath('/admin/pages');

  return { ok: true };
}

export async function actionDepublier(id: number) {
  await exigerConnexion();
  const page = await pageParId(id);
  await depublier(id);
  if (page) revalidatePath(`/${page.chemin}`);
  revalidatePath('/admin/pages');
}

export async function actionReglagesPage(_p: EtatPage, donnees: FormData): Promise<EtatPage> {
  await exigerConnexion();

  const id = Number(donnees.get('id'));
  const titre = String(donnees.get('titre') ?? '').trim();
  const chemin = normaliserChemin(String(donnees.get('chemin') ?? ''));
  const saisi = { titre, chemin };

  if (!titre) return { erreur: 'Donnez un nom à la page.', saisi };

  const avant = await pageParId(id);
  const souciAdresse = verifierChemin(chemin, { accueil: avant?.chemin === '' });
  if (souciAdresse) return { erreur: souciAdresse, saisi };

  try {
    await majReglages(id, {
      titre,
      chemin,
      metaTitre: String(donnees.get('metaTitre') ?? ''),
      metaDescription: String(donnees.get('metaDescription') ?? ''),
      metaImage: String(donnees.get('metaImage') ?? ''),
      horsIndexation: donnees.get('horsIndexation') === 'on',
    });
  } catch (erreur) {
    if ((erreur as { code?: string }).code === '23505') {
      return { erreur: 'Une page occupe déjà cette adresse.', saisi };
    }
    throw erreur;
  }

  // L'ancienne adresse doit cesser de répondre, la nouvelle commencer.
  if (avant && avant.chemin !== chemin) revalidatePath(`/${avant.chemin}`);
  revalidatePath(`/${chemin}`);
  revalidatePath('/admin/pages');

  return {};
}

/**
 * La barre de navigation vaut pour tout le site.
 *
 * Elle s'enregistre donc en même temps que la page ouverte, quelle qu'elle
 * soit : c'est le même bouton, et le même geste.
 */
export async function actionPublierNavigation(nav: unknown) {
  await exigerConnexion();
  const enregistree = await ecrireNavigation(nav as Parameters<typeof ecrireNavigation>[0]);
  // L'en-tête est sur toutes les pages : c'est tout le site qu'il faut refaire.
  revalidatePath('/', 'layout');
  return enregistree;
}

export async function actionSupprimerPage(id: number) {
  const utilisateur = await exigerConnexion();
  if (utilisateur.role !== 'administrateur') throw new Error('Non autorisé.');

  const page = await pageParId(id);
  // Le site perdrait son entrée : toutes les autres pages se recréent, celle-ci
  // n'a pas d'adresse de rechange.
  if (page?.chemin === '') throw new Error('La page d’accueil ne peut pas être supprimée.');

  await supprimerPage(id);
  if (page) revalidatePath(`/${page.chemin}`);
  revalidatePath('/admin/pages');
  redirect('/admin/pages/');
}

export async function actionListerVersions(pageId: number) {
  await exigerConnexion();
  const versions = await listerVersions(pageId);
  return versions.map((v) => ({
    id: v.id,
    titre: v.titre,
    auteur: v.auteur,
    date: v.cree_le.toISOString(),
  }));
}

/**
 * Remet une version d'avant dans le brouillon, et rend ses sections.
 *
 * Rien n'est publié : Kevin retrouve l'ancienne page dans l'éditeur, la
 * regarde, et décide. Restaurer d'un clic sur le site en ligne serait le
 * meilleur moyen de remplacer une erreur par une autre.
 */
export async function actionRestaurerVersion(pageId: number, versionId: number) {
  await exigerConnexion();
  await restaurerVersion(pageId, versionId);
  const page = await pageParId(pageId);
  return { sections: page?.brouillon ?? [] };
}
