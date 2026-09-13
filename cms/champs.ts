import type { Champ } from './schema';
import { ALIGNEMENTS, COULEURS, ESPACEMENTS, FONDS, POLICES, TAILLES } from '@/lib/apparence';

/** Les listes de choix, dérivées des tables d'apparence. */
const options = (table: Record<string, { label: string }>) =>
  Object.entries(table).map(([valeur, { label }]) => ({ valeur, libelle: label }));

export const OPTIONS_TAILLE = options(TAILLES);
export const OPTIONS_POLICE = options(POLICES);
export const OPTIONS_COULEUR = [
  ...options(COULEURS),
  { valeur: 'personnalisee', libelle: 'Personnalisée…' },
];
export const OPTIONS_ALIGNEMENT = options(ALIGNEMENTS);
export const OPTIONS_FOND = options(FONDS);
export const OPTIONS_ESPACEMENT = options(ESPACEMENTS);

/** Un titre : son texte, son niveau de hiérarchie, son apparence. */
export const titre = (o?: {
  nom?: string;
  libelle?: string;
  requis?: boolean;
  niveau?: string;
  taille?: string;
}): Champ => ({
  type: 'groupe',
  nom: o?.nom ?? 'titre',
  libelle: o?.libelle ?? 'Titre',
  champs: [
    { type: 'texte', nom: 'texte', libelle: 'Texte', requis: o?.requis },
    {
      type: 'choix',
      nom: 'niveau',
      libelle: 'Niveau',
      defaut: o?.niveau ?? 'h2',
      options: [
        { valeur: 'h1', libelle: 'Titre principal de la page' },
        { valeur: 'h2', libelle: 'Titre de section' },
        { valeur: 'h3', libelle: 'Sous-titre' },
        { valeur: 'h4', libelle: 'Sous-sous-titre' },
      ],
      aide: 'Sert au référencement et aux lecteurs d’écran. Un seul titre principal par page.',
    },
    {
      type: 'apparence',
      nom: 'apparence',
      libelle: 'Apparence',
      defaut: { police: 'titre', taille: o?.taille ?? 'titre2', couleur: 'encre' },
    },
  ],
});

/** Un paragraphe riche : gras, italique, liens et listes, plus son apparence. */
export const texte = (o?: { nom?: string; libelle?: string }): Champ => ({
  type: 'groupe',
  nom: o?.nom ?? 'texte',
  libelle: o?.libelle ?? 'Texte',
  champs: [
    { type: 'texteRiche', nom: 'contenu', libelle: 'Contenu' },
    {
      type: 'apparence',
      nom: 'apparence',
      libelle: 'Apparence',
      defaut: { police: 'texte', taille: 'corps', couleur: 'encreAttenuee' },
    },
  ],
});

/** Une image de la médiathèque. Son texte alternatif est obligatoire là-bas. */
export const image = (o?: { nom?: string; libelle?: string; requis?: boolean }): Champ => ({
  type: 'image',
  nom: o?.nom ?? 'image',
  libelle: o?.libelle ?? 'Image',
  requis: o?.requis,
});

/** Jusqu'à deux boutons. Au-delà, le visiteur ne choisit plus, il hésite. */
export const boutons = (o?: { nom?: string; libelle?: string }): Champ => ({
  type: 'liste',
  nom: o?.nom ?? 'boutons',
  libelle: o?.libelle ?? 'Boutons',
  libelleItem: 'Bouton',
  maximum: 2,
  aide: 'Deux au maximum. Au-delà, le visiteur ne choisit plus, il hésite.',
  champs: [
    { type: 'texte', nom: 'libelle', libelle: 'Libellé', requis: true, moitie: true },
    {
      type: 'texte',
      nom: 'lien',
      libelle: 'Destination',
      requis: true,
      moitie: true,
      aide: 'Une adresse du site comme /contact/, ou une adresse complète en https://',
    },
    {
      type: 'booleen',
      nom: 'fantome',
      libelle: 'Bouton secondaire',
      aide: 'Contour seul, sans fond plein. Pour l’action la moins importante.',
    },
  ],
});

/**
 * Réglages posés au bas de chaque section.
 *
 * Volontairement courts. Une section qui expose trente réglages n'est plus un
 * modèle, c'est une page blanche déguisée.
 */
export const reglagesSection: Champ = {
  type: 'repli',
  nom: 'reglages',
  libelle: 'Réglages de la section',
  champs: [
    {
      type: 'choix',
      nom: 'fond',
      libelle: 'Fond',
      defaut: 'noir',
      options: OPTIONS_FOND,
      moitie: true,
    },
    {
      type: 'choix',
      nom: 'espacement',
      libelle: 'Espacement vertical',
      defaut: 'normal',
      options: OPTIONS_ESPACEMENT,
      moitie: true,
    },
    {
      type: 'booleen',
      nom: 'masquee',
      libelle: 'Masquer cette section',
      aide: 'La section reste dans la page et se remet en un clic. Préférer ceci à une suppression.',
    },
  ],
};

/**
 * L'en-tête d'une section : numéro, surtitre, titre, chapô.
 *
 * C'est le motif qui ouvre presque toutes les sections du site — « 02 / Les
 * collections / Quel projet allons-nous imaginer ensemble ? ». Le regrouper
 * évite de le redécrire section par section, et garantit qu'il s'affiche
 * partout de la même façon.
 */
export const entete = (o?: { requis?: boolean; taille?: string }): Champ => ({
  type: 'groupe',
  nom: 'entete',
  libelle: 'En-tête de section',
  champs: [
    {
      type: 'texte',
      nom: 'numero',
      libelle: 'Numéro',
      moitie: true,
      aide: 'Par exemple 02. Laisser vide pour ne pas en afficher.',
    },
    { type: 'texte', nom: 'surtitre', libelle: 'Surtitre', moitie: true },
    { type: 'texte', nom: 'texte', libelle: 'Titre', requis: o?.requis },
    {
      type: 'choix',
      nom: 'niveau',
      libelle: 'Niveau',
      defaut: 'h2',
      options: [
        { valeur: 'h1', libelle: 'Titre principal de la page' },
        { valeur: 'h2', libelle: 'Titre de section' },
        { valeur: 'h3', libelle: 'Sous-titre' },
      ],
      aide: 'Sert au référencement et aux lecteurs d’écran. Un seul titre principal par page.',
    },
    { type: 'texteRiche', nom: 'chapo', libelle: 'Chapô' },
    {
      type: 'apparence',
      nom: 'apparence',
      libelle: 'Apparence du titre',
      defaut: { police: 'titre', taille: o?.taille ?? 'titre2', couleur: 'encre' },
    },
  ],
});

/** Un lien de texte, avec sa flèche. Différent d'un bouton : plus discret. */
export const lien = (o?: { nom?: string; libelle?: string }): Champ => ({
  type: 'groupe',
  nom: o?.nom ?? 'lien',
  libelle: o?.libelle ?? 'Lien',
  champs: [
    { type: 'texte', nom: 'libelle', libelle: 'Libellé', moitie: true },
    { type: 'texte', nom: 'href', libelle: 'Destination', moitie: true },
  ],
});
