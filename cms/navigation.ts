import type { Champ } from './schema';

/**
 * Les réglages de la barre de navigation.
 *
 * Décrits dans le même langage que les sections : l'éditeur en déduit le
 * panneau, le serveur valide ce qui arrive, et rien ne peut diverger entre les
 * deux. Chaque élément a son interrupteur — Kevin peut retirer le téléphone de
 * la barre sans perdre le numéro qu'il y avait écrit.
 */
export const CHAMPS_NAVIGATION: Champ[] = [
  {
    type: 'booleen',
    nom: 'logoActif',
    libelle: 'Afficher le logo',
    defaut: true,
  },
  {
    type: 'image',
    nom: 'logoImage',
    libelle: 'Logo',
    aide: 'Laisser vide pour garder le logo du site. Une image claire, sur fond transparent.',
    siValeur: { champ: 'logoActif', vaut: true },
  },
  {
    type: 'liste',
    nom: 'menu',
    libelle: 'Menu',
    libelleItem: 'Lien',
    maximum: 8,
    aide: 'Les pages du site, dans l’ordre où elles doivent apparaître.',
    champs: [
      { type: 'page', nom: 'chemin', libelle: 'Page', requis: true },
      {
        type: 'texte',
        nom: 'libelle',
        libelle: 'Nom affiché',
        aide: 'Vide : le nom de la page.',
      },
    ],
  },
  {
    type: 'booleen',
    nom: 'telephoneActif',
    libelle: 'Afficher le téléphone',
    defaut: true,
  },
  {
    type: 'texte',
    nom: 'telephone',
    libelle: 'Numéro affiché',
    aide: 'Vide : celui des Paramètres → Mon entreprise.',
    siValeur: { champ: 'telephoneActif', vaut: true },
  },
  {
    type: 'booleen',
    nom: 'accesActif',
    libelle: 'Afficher le lien « Accès clients »',
    defaut: true,
  },
  {
    type: 'texte',
    nom: 'accesLibelle',
    libelle: 'Libellé du lien',
    moitie: true,
    siValeur: { champ: 'accesActif', vaut: true },
  },
  {
    type: 'texte',
    nom: 'accesLien',
    libelle: 'Destination',
    moitie: true,
    aide: 'L’adresse complète de la galerie client, en https:// — vide : celle des Paramètres → Mon entreprise.',
    siValeur: { champ: 'accesActif', vaut: true },
  },
];
