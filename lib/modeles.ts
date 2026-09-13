/**
 * Les formes de données partagées entre le serveur et le navigateur.
 *
 * Ce fichier n'importe rien du serveur, et c'est toute sa raison d'être.
 * `lib/pages.ts` et `lib/medias.ts` sont marqués `server-only` : ils ouvrent la
 * base, et les importer depuis un composant client casserait la construction —
 * ce qui est exactement le but de ce marquage. Mais l'éditeur et l'aperçu, qui
 * tournent dans le navigateur, ont besoin des mêmes types.
 *
 * D'où cette séparation : les formes ici, les accès à la base là-bas.
 */

// ————————————————————————————— Médiathèque —————————————————————————————

export type Taille = { largeur: number; fichier: string };

export type Dossier = {
  id: number;
  nom: string;
  images: number;
  /** Le dossier qui le contient, ou null s'il est à la racine. */
  parentId: number | null;
};

export type Media = {
  id: number;
  fichier: string;
  alt: string;
  legende: string | null;
  largeur: number | null;
  hauteur: number | null;
  tailles: Taille[];
  aRemplacer: boolean;
  /** Le dossier de rangement, ou null pour « aucun ». */
  dossierId?: number | null;
};

/**
 * L'adresse publique d'une image.
 *
 * Deux origines cohabitent, et c'est volontaire. Les images envoyées depuis le
 * BackOffice sont servies par la route dédiée ; celles encodées à l'avance par
 * le script d'images du site portent déjà leur chemin complet et sont servies
 * telles quelles. Un `/` en tête suffit à les distinguer.
 */
export const urlMedia = (fichier: string) =>
  fichier.startsWith('/') ? fichier : `/medias/${fichier}`;

// ——————————————————————————————— Pages ———————————————————————————————

/** Une section enregistrée : son type, et les valeurs de ses champs. */
export type Section = {
  /** Identifiant stable, pour le glisser-déposer et la sélection. */
  cle: string;
  type: string;
  valeurs: Record<string, unknown>;
};

export type Page = {
  id: number;
  chemin: string;
  titre: string;
  statut: 'brouillon' | 'publie';
  sections: Section[];
  brouillon: Section[] | null;
  metaTitre: string | null;
  metaDescription: string | null;
  metaImage: string | null;
  horsIndexation: boolean;
  modifieLe: Date;
  publieLe: Date | null;
};

/** Identifiant court et stable, pour distinguer deux sections du même type. */
export function nouvelleCle() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}


/** Un lien du menu principal : une page du site, et le nom qu'on lui donne. */
export type LienNav = { chemin: string; libelle?: string };

/**
 * La barre de navigation, telle qu'elle est enregistrée.
 *
 * Ici plutôt que dans `lib/navigation.ts` : l'en-tête du site et l'éditeur sont
 * des composants client, et ne peuvent pas importer un module serveur.
 */
export type Navigation = {
  logoActif: boolean;
  logoImage: number | null;
  menu: LienNav[];
  telephoneActif: boolean;
  telephone: string;
  accesActif: boolean;
  accesLibelle: string;
  accesLien: string;
};
