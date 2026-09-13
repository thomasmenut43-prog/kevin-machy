import type { Champ } from './schema';

/**
 * Les réglages du pied de page.
 *
 * Écrits dans le même langage que les sections et que la barre de navigation :
 * l'éditeur en déduit le panneau, le serveur valide ce qui arrive, et les deux
 * ne peuvent pas diverger.
 *
 * **Aucune coordonnée ici.** Le téléphone, l'adresse, les réseaux et les liens
 * légaux appartiennent à l'entreprise et se règlent une fois pour toutes dans
 * Paramètres → Mon entreprise. Ce panneau ne décide que de ce que le pied en
 * montre, et des textes qui n'appartiennent qu'à lui.
 */
export const CHAMPS_PIED: Champ[] = [
  {
    type: 'texte',
    nom: 'signature',
    libelle: 'Phrase sous le logo',
    multiligne: true,
    aide: 'Deux lignes au plus : qui vous êtes, en une respiration.',
  },
  {
    type: 'booleen',
    nom: 'reseauxActifs',
    libelle: 'Afficher les réseaux sociaux',
    aide: 'Leurs adresses viennent de Paramètres → Mon entreprise.',
    defaut: true,
  },

  {
    type: 'repli',
    nom: 'site',
    libelle: 'Colonne des pages',
    champs: [
      { type: 'texte', nom: 'titre', libelle: 'Titre de la colonne' },
      {
        type: 'liste',
        nom: 'menu',
        libelle: 'Pages listées',
        libelleItem: 'Page',
        maximum: 10,
        aide: 'L’accueil vient toujours en tête : il n’a pas à figurer ici.',
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
    ],
  },

  {
    type: 'repli',
    nom: 'joindre',
    libelle: 'Colonne des coordonnées',
    champs: [
      { type: 'texte', nom: 'titre', libelle: 'Titre de la colonne' },
      { type: 'booleen', nom: 'telephone', libelle: 'Téléphone', defaut: true },
      { type: 'booleen', nom: 'email', libelle: 'Adresse e-mail', defaut: true },
      { type: 'booleen', nom: 'acces', libelle: 'Lien « Accès clients »', defaut: true },
      {
        type: 'booleen',
        nom: 'reservation',
        libelle: 'Lien « Prendre rendez-vous »',
        defaut: true,
      },
      {
        type: 'booleen',
        nom: 'adresse',
        libelle: 'Adresse du studio',
        aide: 'La ligne « Studio au …, sur rendez-vous uniquement ».',
        defaut: true,
      },
    ],
  },

  {
    type: 'repli',
    nom: 'encadre',
    libelle: 'Quatrième colonne',
    champs: [
      { type: 'booleen', nom: 'actif', libelle: 'Afficher cette colonne', defaut: true },
      { type: 'texte', nom: 'titre', libelle: 'Titre', siValeur: { champ: 'actif', vaut: true } },
      {
        type: 'texte',
        nom: 'texte',
        libelle: 'Texte',
        multiligne: true,
        siValeur: { champ: 'actif', vaut: true },
      },
      {
        type: 'booleen',
        nom: 'lien',
        libelle: 'Ajouter le lien de prise de rendez-vous',
        defaut: true,
        siValeur: { champ: 'actif', vaut: true },
      },
      {
        type: 'booleen',
        nom: 'zone',
        libelle: 'Afficher la zone d’intervention',
        aide: 'La phrase réglée dans Paramètres → Mon entreprise.',
        defaut: true,
        siValeur: { champ: 'actif', vaut: true },
      },
    ],
  },
];
