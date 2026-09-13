/**
 * Le langage dans lequel on décrit une section.
 *
 * Volontairement minuscule : une douzaine de types de champs, pas un de plus.
 * Ce fichier est lu par trois choses — l'éditeur, qui en déduit les panneaux de
 * réglages ; le serveur, qui valide ce qui arrive ; et le site, qui affiche.
 * Une seule description, trois usages, donc aucune dérive possible entre ce que
 * l'éditeur propose et ce que le site sait afficher.
 */

export type Option = { valeur: string; libelle: string };

type Commun = {
  nom: string;
  libelle: string;
  /** Phrase d'aide affichée sous le champ, en français, à hauteur de Kevin. */
  aide?: string;
  requis?: boolean;
  /** N'affiche le champ que si la condition est remplie. */
  siValeur?: { champ: string; vaut: string | boolean };
  /** Met le champ sur la même ligne que le suivant. */
  moitie?: boolean;
};

export type Champ =
  | (Commun & { type: 'texte'; multiligne?: boolean; defaut?: string })
  | (Commun & { type: 'texteRiche' })
  | (Commun & { type: 'choix'; options: Option[]; defaut?: string })
  | (Commun & { type: 'booleen'; defaut?: boolean })
  | (Commun & { type: 'image' })
  // Une page du site, choisie dans la liste de celles qui existent. La valeur
  // enregistree est son chemin : renommer la page ne casse donc pas le lien.
  | (Commun & { type: 'page' })
  | (Commun & { type: 'apparence'; defaut?: Record<string, string> })
  | (Commun & { type: 'liste'; champs: Champ[]; maximum?: number; libelleItem?: string })
  | (Commun & { type: 'groupe'; champs: Champ[] })
  | (Commun & { type: 'repli'; champs: Champ[] });

/** Une section du catalogue. */
export type Bloc = {
  /** Identifiant technique, stocké en base. Ne change jamais. */
  type: string;
  libelle: string;
  /** Famille affichée dans le sélecteur de sections. */
  famille: string;
  /** Ce que la section fait, en une phrase, pour le sélecteur. */
  resume: string;
  champs: Champ[];
};

/** Les six familles, dans l'ordre du sélecteur. */
export const FAMILLES = [
  'Héros',
  'Texte et image',
  'Galeries',
  'Contenu',
  'Commercial',
  'Preuve',
] as const;

export type Famille = (typeof FAMILLES)[number];
