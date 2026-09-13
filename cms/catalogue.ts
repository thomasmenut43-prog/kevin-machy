import type { Bloc } from './schema';
import { boutons, entete, image, lien, reglagesSection, texte, titre } from './champs';

/**
 * Le catalogue de sections.
 *
 * Six familles, treize sections. Chacune vient du site existant : elles sont
 * donc toutes déjà conformes à la direction « chambre noire », et Kevin ne peut
 * pas en composer une qui jure.
 *
 * Les variantes d'une même section partagent ses champs. C'est ce qui permet de
 * proposer « image à gauche » et « image à droite » sans rien dupliquer, et
 * d'en ajouter une troisième sans toucher au contenu déjà saisi.
 */
export const CATALOGUE: Bloc[] = [
  {
    type: 'heros',
    libelle: 'Héros',
    famille: 'Héros',
    resume: 'Grande image d’ouverture, titre et appel à l’action.',
    champs: [
      {
        type: 'choix',
        nom: 'variante',
        libelle: 'Modèle',
        defaut: 'pleinePage',
        options: [
          { valeur: 'pleinePage', libelle: 'Image pleine page' },
          { valeur: 'titreDecale', libelle: 'Image et titre décalé' },
          { valeur: 'sobre', libelle: 'Sans image' },
        ],
      },
      image({ libelle: 'Image de fond' }),
      image({
        nom: 'imageEtroite',
        libelle: 'Image pour téléphone',
        // Un cadrage 16/9 rogné dans un écran vertical perd son sujet : on
        // laisse le choix d'une seconde image, plus haute que large.
      }),
      {
        type: 'liste',
        nom: 'surtitres',
        libelle: 'Surtitres',
        libelleItem: 'Mention',
        maximum: 4,
        aide: 'Courtes mentions au-dessus du titre. Par exemple le métier, le lieu.',
        champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
      },
      titre({ requis: true, niveau: 'h1', taille: 'geant' }),
      texte({ nom: 'chapo', libelle: 'Chapô' }),
      boutons(),
      reglagesSection,
    ],
  },
  {
    type: 'texteImage',
    libelle: 'Texte et image',
    famille: 'Texte et image',
    resume: 'Un bloc de texte et une photographie côte à côte.',
    champs: [
      {
        type: 'choix',
        nom: 'variante',
        libelle: 'Modèle',
        defaut: 'imageDroite',
        options: [
          { valeur: 'imageDroite', libelle: 'Image à droite' },
          { valeur: 'imageGauche', libelle: 'Image à gauche' },
          { valeur: 'imagePleineLargeur', libelle: 'Image pleine largeur, texte dessous' },
          { valeur: 'ouverture', libelle: 'Ouverture de page' },
        ],
        aide: 'L’ouverture se place en haut d’une page : elle réserve la hauteur du bandeau et agrandit le chaô.',
      },
      { type: 'texte', nom: 'numero', libelle: 'Numéro', aide: 'Par exemple 01.', moitie: true },
      { type: 'texte', nom: 'surtitre', libelle: 'Surtitre', moitie: true },
      titre(),
      texte(),
      {
        type: 'liste',
        nom: 'distinctions',
        libelle: 'Distinctions',
        libelleItem: 'Distinction',
        maximum: 4,
        aide: 'Récompenses ou labels, affichés en petites capitales sous le texte.',
        champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
      },
      image(),
      boutons(),
      lien(),
      reglagesSection,
    ],
  },
  {
    type: 'galerie',
    libelle: 'Galerie',
    famille: 'Galeries',
    resume: 'Plusieurs photographies disposées ensemble.',
    champs: [
      {
        type: 'choix',
        nom: 'variante',
        libelle: 'Modèle',
        defaut: 'visionneuse',
        options: [
          { valeur: 'visionneuse', libelle: 'Galerie avec visionneuse' },
          { valeur: 'mosaique', libelle: 'Mosaïque trois colonnes' },
          { valeur: 'mosaiqueLarge', libelle: 'Mosaïque pleine largeur' },
          { valeur: 'duo', libelle: 'Deux images côte à côte' },
          { valeur: 'trio', libelle: 'Trois images côte à côte' },
          { valeur: 'bande', libelle: 'Bande horizontale' },
          { valeur: 'colonne', libelle: 'Une image par ligne' },
        ],
      },
      entete(),
      {
        type: 'liste',
        nom: 'images',
        libelle: 'Images',
        libelleItem: 'Image',
        aide: 'Glisser pour réordonner. Le texte alternatif vient de la médiathèque.',
        champs: [image({ requis: true })],
      },
      reglagesSection,
    ],
  },
  {
    type: 'collections',
    libelle: 'Collections',
    famille: 'Contenu',
    resume: 'Des cartes numérotées qui mènent vers les autres pages.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'cartes',
        libelle: 'Cartes',
        libelleItem: 'Carte',
        maximum: 4,
        champs: [
          { type: 'texte', nom: 'numero', libelle: 'Numéro', moitie: true },
          { type: 'texte', nom: 'titre', libelle: 'Titre', requis: true, moitie: true },
          image({ requis: true }),
          { type: 'texte', nom: 'texte', libelle: 'Texte', multiligne: true },
          { type: 'texte', nom: 'href', libelle: 'Destination', requis: true },
          { type: 'texte', nom: 'libelleLien', libelle: 'Libellé du lien', aide: 'Par défaut : Découvrir.' },
        ],
      },
      texte({ nom: 'appoint', libelle: 'Mention complémentaire' }),
      lien({ nom: 'lienAppoint', libelle: 'Lien de la mention' }),
      reglagesSection,
    ],
  },
  {
    type: 'bande',
    libelle: 'Bande image',
    famille: 'Galeries',
    resume: 'Une image pleine largeur, qui sépare deux moments de la page.',
    champs: [
      {
        type: 'choix',
        nom: 'variante',
        libelle: 'Modèle',
        defaut: 'pleineLargeur',
        options: [
          { valeur: 'pleineLargeur', libelle: 'D’un bord à l’autre' },
          { valeur: 'dansLaPage', libelle: 'Dans la largeur de la page' },
        ],
      },
      image({ libelle: 'Image', requis: true }),
      image({ nom: 'imageEtroite', libelle: 'Image pour téléphone' }),
      { type: 'texte', nom: 'legende', libelle: 'Légende', multiligne: true },
      reglagesSection,
    ],
  },
  {
    type: 'jalons',
    libelle: 'Déroulé illustré',
    famille: 'Contenu',
    resume: 'Des moments numérotés, chacun avec sa photographie.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'jalons',
        libelle: 'Moments',
        libelleItem: 'Moment',
        aide: 'La numérotation est automatique : inutile de l’écrire dans le titre.',
        champs: [
          image({ requis: true }),
          { type: 'texte', nom: 'titre', libelle: 'Titre', requis: true },
          { type: 'texte', nom: 'texte', libelle: 'Texte', multiligne: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'offres',
    libelle: 'Collections et formules',
    famille: 'Commercial',
    resume: 'Des formules détaillées, avec un socle commun au-dessus.',
    champs: [
      entete(),
      {
        type: 'groupe',
        nom: 'socle',
        libelle: 'Socle commun',
        champs: [
          { type: 'texte', nom: 'titre', libelle: 'Titre', aide: 'Par exemple « Dans toutes les collections ».' },
          {
            type: 'liste',
            nom: 'points',
            libelle: 'Ce qui est toujours inclus',
            libelleItem: 'Ligne',
            champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
          },
        ],
      },
      {
        type: 'liste',
        nom: 'formules',
        libelle: 'Formules',
        libelleItem: 'Formule',
        maximum: 6,
        champs: [
          { type: 'texte', nom: 'nom', libelle: 'Nom', requis: true, moitie: true },
          { type: 'texte', nom: 'prix', libelle: 'Prix', requis: true, moitie: true },
          { type: 'texte', nom: 'duree', libelle: 'Durée' },
          { type: 'texte', nom: 'promesse', libelle: 'Promesse', multiligne: true },
          {
            type: 'liste',
            nom: 'inclus',
            libelle: 'Ce qui est inclus',
            libelleItem: 'Ligne',
            champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
          },
          { type: 'texte', nom: 'libelleBouton', libelle: 'Libellé du bouton', moitie: true },
          { type: 'texte', nom: 'href', libelle: 'Destination du bouton', moitie: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'options',
    libelle: 'Options et suppléments',
    famille: 'Commercial',
    resume: 'Une liste de prestations en plus, avec leur prix.',
    champs: [
      entete({ taille: 'titre3' }),
      {
        type: 'liste',
        nom: 'options',
        libelle: 'Options',
        libelleItem: 'Option',
        champs: [
          { type: 'texte', nom: 'nom', libelle: 'Nom', requis: true, moitie: true },
          { type: 'texte', nom: 'prix', libelle: 'Prix', moitie: true },
          { type: 'texte', nom: 'texte', libelle: 'Description', multiligne: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'encadre',
    libelle: 'Encadré',
    famille: 'Contenu',
    resume: 'Un bloc détaché, pour une précision ou une garantie.',
    champs: [
      titre({ niveau: 'h3', taille: 'titre3' }),
      texte(),
      reglagesSection,
    ],
  },
  {
    type: 'inclus',
    libelle: 'Ce que comprend la prestation',
    famille: 'Commercial',
    resume: 'Des cartes courtes, une par élément inclus.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'elements',
        libelle: 'Éléments',
        libelleItem: 'Élément',
        champs: [
          { type: 'texte', nom: 'titre', libelle: 'Titre', requis: true },
          { type: 'texte', nom: 'texte', libelle: 'Texte', multiligne: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'texteLibre',
    libelle: 'Texte libre',
    famille: 'Contenu',
    resume: 'Un bloc de texte seul, à la largeur choisie.',
    champs: [
      entete(),
      texte(),
      {
        type: 'choix',
        nom: 'largeur',
        libelle: 'Largeur du texte',
        defaut: 'mesure',
        options: [
          { valeur: 'mesure', libelle: 'Confortable à lire' },
          { valeur: 'mesureCourte', libelle: 'Étroite' },
          { valeur: 'pleine', libelle: 'Pleine largeur' },
        ],
        aide: 'Une ligne trop longue se lit mal. « Confortable » tient environ soixante caractères.',
      },
      reglagesSection,
    ],
  },
  {
    type: 'identiteEntreprise',
    libelle: 'Identité de l’entreprise',
    famille: 'Contenu',
    resume: 'Les mentions obligatoires, reprises des Paramètres.',
    champs: [entete(), reglagesSection],
  },
  {
    type: 'etapes',
    libelle: 'Étapes numérotées',
    famille: 'Contenu',
    resume: 'Une suite d’étapes, numérotées automatiquement.',
    champs: [
      entete(),
      {
        type: 'choix',
        nom: 'variante',
        libelle: 'Modèle',
        defaut: 'illustrees',
        options: [
          { valeur: 'illustrees', libelle: 'Trois colonnes illustrées' },
          { valeur: 'filets', libelle: 'Lignes séparées par un filet' },
        ],
      },
      {
        type: 'liste',
        nom: 'etapes',
        libelle: 'Étapes',
        libelleItem: 'Étape',
        aide: 'La numérotation est automatique : inutile de l’écrire dans le titre.',
        champs: [
          { type: 'texte', nom: 'titre', libelle: 'Titre de l’étape', requis: true },
          { type: 'texte', nom: 'texte', libelle: 'Description', multiligne: true },
          image(),
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'listePointee',
    libelle: 'Liste à puces',
    famille: 'Contenu',
    resume: 'Une liste de points, dans le style du site.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'points',
        libelle: 'Points',
        libelleItem: 'Point',
        champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
      },
      reglagesSection,
    ],
  },
  {
    type: 'citation',
    libelle: 'Bande citation',
    famille: 'Contenu',
    resume: 'Une phrase mise en avant sur toute la largeur.',
    champs: [
      { type: 'texte', nom: 'citation', libelle: 'Citation', multiligne: true, requis: true },
      { type: 'texte', nom: 'auteur', libelle: 'Auteur' },
      reglagesSection,
    ],
  },
  {
    type: 'tarifs',
    libelle: 'Grille de tarifs',
    famille: 'Commercial',
    resume: 'Jusqu’à quatre formules présentées côte à côte.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'formules',
        libelle: 'Formules',
        libelleItem: 'Formule',
        maximum: 4,
        champs: [
          { type: 'texte', nom: 'nom', libelle: 'Nom', requis: true, moitie: true },
          {
            type: 'texte',
            nom: 'prix',
            libelle: 'Prix',
            requis: true,
            moitie: true,
            aide: 'Tel qu’il doit s’afficher, par exemple « À partir de 49 € ».',
          },
          { type: 'texte', nom: 'note', libelle: 'Précision sous le prix' },
          {
            type: 'booleen',
            nom: 'simulateur',
            libelle: 'Remplacer le prix par le simulateur',
            aide: 'Le visiteur choisit ses options et voit le tarif se calculer. Réservé au Studio de l’Iris.',
          },
          { type: 'texte', nom: 'exclus', libelle: 'Ce qui n’est pas compris', multiligne: true },
          {
            type: 'liste',
            nom: 'inclus',
            libelle: 'Ce qui est inclus',
            libelleItem: 'Ligne',
            champs: [{ type: 'texte', nom: 'texte', libelle: 'Texte', requis: true }],
          },
          boutons({ libelle: 'Bouton' }),
        ],
      },
      { type: 'texte', nom: 'legende', libelle: 'Mention sous la grille', multiligne: true },
      {
        type: 'booleen',
        nom: 'barreDeRappel',
        libelle: 'Rappeler le tarif en bas d’écran',
        defaut: true,
        aide: 'Une barre compacte suit le visiteur une fois la grille dépassée. Sans effet si aucune formule n’utilise le simulateur.',
      },
      reglagesSection,
    ],
  },
  {
    type: 'supports',
    libelle: 'Grille de supports',
    famille: 'Commercial',
    resume: 'Des formats et leurs prix, en petites colonnes.',
    champs: [
      titre({ niveau: 'h3', taille: 'titre3' }),
      {
        type: 'liste',
        nom: 'supports',
        libelle: 'Supports',
        libelleItem: 'Support',
        champs: [
          { type: 'texte', nom: 'nom', libelle: 'Nom', requis: true, moitie: true },
          { type: 'texte', nom: 'prix', libelle: 'Prix', requis: true, moitie: true },
          { type: 'texte', nom: 'note', libelle: 'Précision' },
        ],
      },
      { type: 'texte', nom: 'legende', libelle: 'Mention sous la grille', multiligne: true },
      reglagesSection,
    ],
  },
  {
    type: 'contact',
    libelle: 'Formulaire et coordonnées',
    famille: 'Contact',
    resume: 'Le formulaire de contact, et la colonne des coordonnées.',
    champs: [
      {
        type: 'booleen',
        nom: 'formulaire',
        libelle: 'Afficher le formulaire',
        defaut: true,
        aide: 'Les demandes arrivent dans l’onglet Messages, et par e-mail si l’envoi est configuré.',
      },
      {
        type: 'liste',
        nom: 'blocs',
        libelle: 'Blocs de coordonnées',
        libelleItem: 'Bloc',
        champs: [
          { type: 'texte', nom: 'surtitre', libelle: 'Intitulé', requis: true },
          {
            type: 'choix',
            nom: 'variante',
            libelle: 'Contenu',
            defaut: 'texte',
            options: [
              { valeur: 'texte', libelle: 'Texte et liens' },
              { valeur: 'horaires', libelle: 'Horaires d’ouverture' },
            ],
          },
          { type: 'texte', nom: 'texte', libelle: 'Texte', multiligne: true },
          {
            type: 'liste',
            nom: 'liens',
            libelle: 'Liens',
            libelleItem: 'Lien',
            champs: [
              { type: 'texte', nom: 'libelle', libelle: 'Libellé', requis: true, moitie: true },
              { type: 'texte', nom: 'href', libelle: 'Destination', requis: true, moitie: true },
              { type: 'booleen', nom: 'grand', libelle: 'En gros caractères' },
            ],
          },
          {
            type: 'liste',
            nom: 'horaires',
            libelle: 'Horaires',
            libelleItem: 'Jour',
            champs: [
              { type: 'texte', nom: 'jour', libelle: 'Jour', requis: true, moitie: true },
              {
                type: 'texte',
                nom: 'ouverture',
                libelle: 'Ouverture',
                moitie: true,
                aide: 'Laisser vide pour afficher « Fermé ».',
              },
            ],
          },
          { type: 'texte', nom: 'legende', libelle: 'Mention discrète', multiligne: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'simulateurIris',
    libelle: 'Simulateur de tarifs',
    famille: 'Commercial',
    resume: 'Le calculateur du Studio de l’Iris, avec son rappel en bas d’écran.',
    champs: [
      titre(),
      {
        type: 'booleen',
        nom: 'barreDeRappel',
        libelle: 'Rappeler le tarif en bas d’écran',
        defaut: true,
        aide: 'Une barre compacte suit le visiteur une fois le simulateur dépassé, et s’efface au pied de page.',
      },
      reglagesSection,
    ],
  },
  {
    type: 'appelAction',
    libelle: 'Appel à l’action',
    famille: 'Commercial',
    resume: 'Une invitation à réserver ou à écrire.',
    champs: [titre({ requis: true }), texte(), boutons(), reglagesSection],
  },
  {
    type: 'avis',
    libelle: 'Avis clients',
    famille: 'Preuve',
    resume: 'Des témoignages, avec leur source.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'avis',
        libelle: 'Avis',
        libelleItem: 'Avis',
        champs: [
          { type: 'texte', nom: 'texte', libelle: 'Texte', multiligne: true, requis: true },
          { type: 'texte', nom: 'auteur', libelle: 'Auteur', requis: true, moitie: true },
          {
            type: 'choix',
            nom: 'source',
            libelle: 'Source',
            moitie: true,
            options: [
              { valeur: 'google', libelle: 'Google' },
              { valeur: 'mariagenet', libelle: 'Mariage.net' },
              { valeur: 'direct', libelle: 'Reçu directement' },
            ],
          },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'faq',
    libelle: 'Questions fréquentes',
    famille: 'Preuve',
    resume: 'Des questions et leurs réponses, dépliables.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'questions',
        libelle: 'Questions',
        libelleItem: 'Question',
        champs: [
          { type: 'texte', nom: 'question', libelle: 'Question', requis: true },
          { type: 'texte', nom: 'reponse', libelle: 'Réponse', multiligne: true, requis: true },
        ],
      },
      reglagesSection,
    ],
  },
  {
    type: 'logos',
    libelle: 'Logos et distinctions',
    famille: 'Preuve',
    resume: 'Une bande de logos ou de récompenses.',
    champs: [
      entete(),
      {
        type: 'liste',
        nom: 'logos',
        libelle: 'Logos',
        libelleItem: 'Logo',
        champs: [image({ requis: true }), { type: 'texte', nom: 'lien', libelle: 'Lien' }],
      },
      reglagesSection,
    ],
  },
];

/** Accès rapide par identifiant, pour le rendu et la validation. */
export const PAR_TYPE = new Map(CATALOGUE.map((b) => [b.type, b]));
