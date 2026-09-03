/**
 * Constantes du site. Toute donnée factuelle vient de contenu-source.md.
 * Rien ici ne doit être inventé : ni tarif, ni durée, ni récompense.
 */

export const SITE = {
  nom: 'Kevin Machy',
  role: 'Photographe · Artisan d’Art',
  /** À remplacer par le domaine définitif avant mise en ligne. */
  url: 'https://www.kevinmachy.fr',
  ville: 'Le Puy-en-Velay',
  /** Adresse du studio, relevée sur la page Studio de l’Iris. À confirmer avec Kevin. */
  adresse: '14 avenue Foch',
  codePostal: '43000',
  region: 'Haute-Loire',
  telephone: '07 81 74 32 84',
  telephoneUri: 'tel:+33781743284',
  email: 'kevin@dronezvous.com',
  /** Coordonnées de la commune du Puy-en-Velay (donnée publique). */
  geo: { lat: 45.0435, lon: 3.8853 },
} as const;

export const LIENS = {
  accesClients: 'https://kevinmachy.pic-time.com/client',
  reservation: 'https://www.sumupbookings.com/kevin-photographe',
  linkedin: 'https://www.linkedin.com/in/kevin-machy-dronez-vous-43a342253',
  facebook: 'https://www.facebook.com/profile.php?id=100072639815595',
  instagram: 'https://www.instagram.com/kevinphotographe43/',
  youtube: 'https://www.youtube.com/channel/UCP4akj3DrpgwqEhnrrp9V3w',
  avis: 'https://dronezvous.com/temoignages/',
  mentions: 'https://dronezvous.com/mentions-legales/',
  cgv: 'https://dronezvous.com/cgv/',
  cookies: 'https://dronezvous.com/politique-de-cookies-ue/',
} as const;

export const NAV = [
  { href: '/mariage/', label: 'Mariage' },
  { href: '/portrait/', label: 'Portrait' },
  { href: '/studio-de-l-iris/', label: 'Studio de l’Iris' },
  { href: '/a-propos/', label: 'À propos' },
  { href: '/contact/', label: 'Contact' },
] as const;

export const ZONE =
  'Le Puy-en-Velay, Yssingeaux, Monistrol-sur-Loire, Saint-Étienne — et partout en Auvergne-Rhône-Alpes selon les projets.';

/** Avis relevés sur le site actuel. Ne pas modifier le texte des clients. */
export const TEMOIGNAGES = [
  {
    auteur: 'Stéphanie Pigeon',
    contexte: 'Mariage',
    texte:
      'Pour notre mariage, nous avons fait confiance à Kevin et le moins que l’on puisse dire, c’est que nous ne l’avons absolument pas regretté ! D’une gentillesse incroyable, Kevin nous a accompagnés dans tous nos projets, même les plus fous. Nous avons passé une merveilleuse journée à ses côtés le jour du mariage, puisqu’il nous a suivis tout au long de cette journée si particulière, avec beaucoup de discrétion, de bonne humeur et de bienveillance.',
  },
  {
    auteur: 'Gaelle Darnon',
    contexte: 'Mariage',
    texte:
      'Nous avons fait confiance à Kevin pour notre mariage et il a été incroyable ! Nous ne sommes habituellement pas très à l’aise pour les photos mais je viens de recevoir nos photos et elles sont toutes magnifiques ! Encore merci pour ses merveilleux souvenirs capturés !',
  },
  {
    auteur: 'Justine Page',
    contexte: 'Séance grossesse',
    texte:
      'Nous avons contacté Kevin pour un shooting photo de grossesse. Nous n’avions jamais fait de shooting auparavant. Il a su nous mettre à l’aise, nous avons pu vivre cette séance photo à 1000 %. Le résultat est tout aussi incroyable. Merci Kevin d’avoir été un si bon créateur de souvenir.',
  },
] as const;

/** Collections mariage — chiffres repris à l’identique du site actuel. */
export const COLLECTIONS_MARIAGE = [
  {
    nom: 'L’Essentiel',
    prix: '1390 €',
    promesse: 'L’essentiel de votre journée',
    duree: '5 heures de reportage',
    inclus: [
      'Cérémonie civile',
      'Cérémonie laïque ou religieuse',
      'Photos de couple',
      'Photos de groupes',
      'Vin d’honneur',
    ],
  },
  {
    nom: 'L’Expérience',
    prix: '1890 €',
    promesse: 'Pour raconter votre mariage plus largement',
    duree: '8 heures de reportage · séance engagement incluse',
    inclus: [
      'Préparatifs',
      'Cérémonie civile',
      'Cérémonie laïque ou religieuse',
      'Photos de couple',
      'Photos de groupes',
      'Vin d’honneur',
    ],
  },
  {
    nom: 'L’Histoire',
    prix: '2390 €',
    promesse: 'Votre journée, des préparatifs jusqu’à la soirée',
    duree: 'Séance engagement incluse',
    inclus: [
      'Préparatifs',
      'Cérémonie civile',
      'Cérémonie laïque ou religieuse',
      'Photos de couple',
      'Photos de groupes',
      'Vin d’honneur',
      'Soirée jusqu’à 1 heure',
      'Tableau d’art 30 × 45 cm inclus',
      'Livre d’or audio inclus',
    ],
  },
  {
    nom: 'Signature',
    prix: '3400 €',
    promesse: 'L’expérience complète, du reportage aux souvenirs imprimés',
    duree: 'Tout le contenu de « L’Histoire »',
    inclus: [
      'Photobooth avec 400 tirages',
      'Album 30 × 30 cm',
      '2 copies parents en 20 × 20 cm',
      'Folio Boxe avec 5 tirages 20 × 30 cm et son chevalet',
      'Galerie privée en ligne',
      'Photographies sélectionnées en haute définition',
    ],
  },
] as const;

export const SOCLE_MARIAGE = [
  'Nos échanges et mes conseils pour préparer votre journée',
  'La sélection et le traitement individuel de vos photographies',
  'Une galerie privée en ligne à partager avec vos proches',
  'Vos photographies sélectionnées en haute définition',
  'Une livraison sous 21 jours',
] as const;

export const OPTIONS_MARIAGE = [
  {
    nom: 'L’Album',
    prix: null,
    texte:
      'Une galerie en ligne, c’est pratique. Mais un mariage mérite aussi quelque chose que l’on peut tenir entre ses mains.',
  },
  {
    nom: 'Le Day After',
    prix: '250 €',
    texte:
      'On remet les tenues, mais cette fois sans planning, sans invités qui attendent et avec beaucoup plus de liberté.',
  },
  {
    nom: 'Prolonger la soirée',
    prix: '250 € / heure',
    texte: 'Parce qu’il est parfois impossible de prévoir à quelle heure la fête va vraiment commencer.',
  },
  {
    nom: 'Le Photobooth',
    prix: null,
    texte: 'Pour laisser aussi vos invités repartir avec leurs propres souvenirs de la soirée.',
  },
] as const;

/** Déroulé d’une journée : jalons tirés du contenu des collections, sans durée inventée. */
export const JOURNEE = [
  {
    titre: 'Préparatifs',
    texte:
      'J’arrive quand tout commence à s’accélérer. Les mains qui tremblent un peu, la robe encore sur son cintre, les regards de ceux qui vous aident à vous préparer.',
    image: 'mariage-jour-01',
    alt: 'Robe de mariée suspendue avant les préparatifs',
  },
  {
    titre: 'Cérémonie civile',
    texte:
      'Deux signatures, une salle trop petite pour tous ceux qui sont venus, et souvent la première vraie émotion de la journée.',
    image: 'mariage-jour-02',
    alt: 'Les mariés remontent l’allée après la cérémonie',
  },
  {
    titre: 'Cérémonie laïque ou religieuse',
    texte:
      'C’est là que je me fais le plus discret. Je cherche les visages dans l’assistance autant que ce qui se passe devant.',
    image: 'mariage-jour-03',
    alt: 'Mariée seule dans une allée avant la cérémonie',
  },
  {
    titre: 'Photos de couple',
    texte:
      'Le seul moment où je vous dirige vraiment. Vingt minutes, une balade, quelques indications simples, et beaucoup de fous rires en général.',
    image: 'mariage-jour-04',
    alt: 'Couple de mariés en contre-jour',
  },
  {
    titre: 'Photos de groupes',
    texte:
      'On les organise en amont pour qu’elles ne mangent pas votre journée. Personne n’aime attendre son tour pendant le vin d’honneur.',
    image: 'mariage-jour-05',
    alt: 'Groupe d’invités lève son verre',
  },
  {
    titre: 'Vin d’honneur',
    texte:
      'Je disparais. C’est le moment où les gens s’oublient, se retrouvent et se racontent — c’est-à-dire exactement ce que je viens photographier.',
    image: 'mariage-jour-06',
    alt: 'Tables dressées pour le vin d’honneur',
  },
  {
    titre: 'Soirée',
    texte:
      'La lumière tombe, la fête démarre. Il est souvent impossible de prévoir à quelle heure elle commence vraiment — c’est pour ça que l’heure supplémentaire existe.',
    image: 'mariage-jour-07',
    alt: 'Silhouettes d’invités qui dansent en soirée',
  },
] as const;

/** Portrait — collection unique. */
export const PORTRAIT_INCLUS = [
  {
    titre: 'Un échange avant la séance',
    texte: 'Pour parler de vous, de ce que vous aimez, et préparer ensemble le style de vos portraits.',
  },
  {
    titre: 'Environ 1 heure de prise de vue',
    texte: 'Au studio au Puy-en-Velay ou en extérieur. Seul, en couple ou à plusieurs.',
  },
  {
    titre: 'Je vous guide du début à la fin',
    texte: 'Tenues, posture, gestes, regard. Vous n’avez pas besoin de savoir poser : c’est mon boulot.',
  },
  {
    titre: 'Un rendez-vous de découverte au studio',
    texte: 'On regarde ensemble les portraits réalisés et vous choisissez tranquillement ceux que vous gardez.',
  },
  {
    titre: '1 tirage d’art 20 × 30 cm inclus',
    texte:
      'Votre séance ne se termine pas avec des photos oubliées dans un téléphone : vous repartez déjà avec un objet photographique.',
  },
] as const;

export const PORTRAIT_SUPPORTS = [
  'Tirages d’art dès 25 €',
  'Tableaux dès 149 €',
  'Folio 235 €',
  'Albums dès 350 €',
] as const;

/** Studio de l’Iris — déroulé en cinq temps. */
export const IRIS_ETAPES = [
  {
    numero: '01',
    titre: 'Prise de vue',
    texte:
      'Votre iris est capturé en cinq à dix minutes, avec une méthode sécurisée et sans contact, adaptée à l’humain comme à l’animal.',
  },
  {
    numero: '02',
    titre: 'Traitement de l’image',
    texte: 'Suppression des reflets, fond noir, et surtout : conservation des couleurs naturelles de votre œil.',
  },
  {
    numero: '03',
    titre: 'Présentation',
    texte:
      'Vous découvrez votre photographie. On peut y ajouter un prénom, un surnom, ou le nom de votre animal.',
  },
  {
    numero: '04',
    titre: 'Supports remis',
    texte: 'Un fichier numérique optimisé pour le web, non imprimable, et un tirage papier au format 10 × 15 cm.',
  },
  {
    numero: '05',
    titre: 'Choix du tableau',
    texte:
      'Vous choisissez votre tableau en alu acrylique avec caisse américaine. Il est à récupérer sous un mois.',
  },
] as const;

export const IRIS_TARIFS = [
  {
    nom: 'Prise de vue',
    prix: 'À partir de 49 €',
    note: 'Le tarif dépend du nombre d’humains et d’animaux photographiés.',
    inclus: [
      'Conseil de préparation',
      'Prise de vue de l’iris',
      'Post-traitement personnalisé',
      'Choix de l’effet et du texte, si souhaité',
      'Fichier numérique optimisé pour le web, non imprimable',
      '1 tirage papier 10 × 15 cm',
    ],
    exclus: 'Tirage et support grande taille non inclus.',
    cta: { label: 'Commander une séance', href: LIENS.reservation },
  },
  {
    nom: 'Formule événementielle',
    prix: '800 € la journée',
    note: '1 500 € les deux jours.',
    inclus: [
      'Animation photographie d’iris dans votre entreprise ou lors de votre événement',
      'Jusqu’à 5 prises de vue d’iris par heure',
      '1 tirage 10 × 15 imprimé sur place pour chaque iris',
      'Personnalisation avec le visuel de votre entreprise',
      'Exclusivité sur votre commune pendant 1 an',
    ],
    exclus: null,
    cta: { label: 'Demander un devis', href: '/contact/?projet=entreprise' },
  },
] as const;

export const IRIS_SUPPORTS = [
  { nom: 'Tableau d’art Alu-Dibond', prix: 'à partir de 79 €', note: 'Option verre acrylique à partir de + 20 €.' },
  { nom: 'Caisses américaines', prix: 'à partir de 50 €', note: null },
  { nom: 'Bijoux', prix: 'à partir de 54 €', note: 'Bracelet, collier ou bague.' },
  { nom: 'Tirage papier', prix: 'à partir de 40 €', note: 'Encadrement en option.' },
] as const;

export const IRIS_FAQ = [
  {
    q: 'À partir de quel âge peut-on réaliser une séance ?',
    r: 'Dès 5 ans, à condition que l’enfant puisse rester calme et stable. C’est possible plus jeune, mais il devra garder son regard fixe et les yeux bien ouverts quelques secondes. En cas d’échec avant 5 ans, la séance n’est pas remboursée ; en revanche, une deuxième prise de vue un an plus tard est offerte.',
  },
  {
    q: 'La lumière utilisée est-elle dangereuse pour les yeux ?',
    r: 'Non. Elle est spécialement réglée pour garantir votre sécurité tout en évitant de vous éblouir. La prise de vue se fait sans aucun contact avec l’œil.',
  },
  {
    q: 'Peut-on porter des lentilles ?',
    r: 'Il est préférable de les retirer au moins quinze minutes avant la prise de vue, pour éviter tout reflet indésirable.',
  },
  {
    q: 'Dois-je me démaquiller ?',
    r: 'Non. Vous pouvez venir maquillée, même avec des extensions de cils. Si vos cils sont très longs, il suffira de les maintenir quelques secondes.',
  },
  {
    q: 'Où se déroule la prise de vue ?',
    r: 'À votre domicile ou au studio du Puy-en-Velay, selon votre localisation.',
  },
  {
    q: 'Quels animaux peuvent bénéficier d’une séance ?',
    r: 'Principalement les chiens et les chats. D’autres animaux — chevaux, NAC — peuvent être envisagés selon leur comportement et les conditions de prise de vue. Écrivez-moi en amont pour en discuter.',
  },
  {
    q: 'La séance est-elle sans danger pour mon animal ?',
    r: 'Oui. La méthode est non invasive, sans contact direct avec l’œil, et la lumière est la même que pour les séances humaines. En moyenne, comptez entre vingt et quarante minutes selon son calme. Aucune contrainte n’est imposée s’il montre des signes d’inconfort, et votre présence est fortement recommandée.',
  },
  {
    q: 'Combien d’iris peut-on réunir dans un même tableau ?',
    r: 'Cela dépend du format choisi, mais le nombre est presque illimité. La création graphique est incluse dans le tarif, en style standard ou explosion, avec un prénom ou une date. Il est aussi possible de réunir l’iris d’une personne et celui de son animal dans une même composition.',
  },
  {
    q: 'Peut-on offrir une séance ?',
    r: 'Oui, des bons cadeaux sont disponibles sur simple demande.',
  },
] as const;

export const PROJETS = [
  { value: 'mariage', label: 'Mariage' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'iris', label: 'Studio de l’Iris' },
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'photobooth', label: 'Photobooth' },
  { value: 'autre', label: 'Autre' },
] as const;
