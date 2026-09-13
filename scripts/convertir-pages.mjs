/**
 * Fait entrer les pages écrites en code dans l'éditeur.
 *
 * Elle était écrite en JSX ; elle devient une pile de sections en base, que
 * Kevin peut modifier, réordonner et republier. Le rendu ne change pas d'un
 * pixel : ce sont les mêmes composants, alimentés par des données au lieu de
 * constantes.
 *
 *   npm run convertir
 *
 * Le script est rejouable et n'écrase une page existante que si elle n'a jamais
 * été modifiée depuis le BackOffice — on ne veut pas effacer le travail de Kevin
 * en rejouant une conversion.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Le contenu des pages vit déjà en données dans lib/site.ts : on le lit à la
// source plutôt que de le recopier ici, sinon les deux finiraient par diverger.
const {
  COLLECTIONS_MARIAGE,
  HORAIRES,
  IRIS_ETAPES,
  IRIS_FAQ,
  IRIS_SUPPORTS,
  IRIS_TARIFS,
  JOURNEE,
  LIENS,
  OPTIONS_MARIAGE,
  PORTRAIT_INCLUS,
  PORTRAIT_SUPPORTS,
  SITE,
  SOCLE_MARIAGE,
  TEMOIGNAGES: TEMOIGNAGES_SITE,
  ZONE,
} = await import('../lib/site.ts');

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const ligne of readFileSync(path.join(racine, '.env'), 'utf8').split('\n')) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URI });
await client.connect();

// —————————————————————————— Outils ——————————————————————————

/** L'identifiant du média correspondant à un emplacement du manifeste. */
const { rows: medias } = await client.query('SELECT id, fichier FROM medias');
const parNom = new Map(
  medias
    .map((m) => [m.fichier.match(/^\/img\/(.+)-\d+\.webp$/)?.[1], m.id])
    .filter(([nom]) => nom),
);

function image(nom) {
  const id = parNom.get(nom);
  if (!id) console.warn(`  image absente de la médiathèque : ${nom}`);
  return id;
}

let compteur = 0;
const cle = () => `conv${(compteur++).toString(36)}${Date.now().toString(36).slice(-4)}`;

/** Un document de texte riche à partir de paragraphes simples. */
const paragraphes = (...textes) =>
  textes.map((texte) => ({ type: 'paragraphe', fragments: [{ texte }] }));

const apparenceTitre = (taille = 'titre2') => ({
  taille,
  police: 'titre',
  couleur: 'encre',
});

const section = (type, valeurs, cleFixe) => ({
  cle: cleFixe ?? cle(),
  type,
  valeurs: { reglages: { fond: 'noir', espacement: 'normal' }, ...valeurs },
});

// ——————————————————————— Page d'accueil ———————————————————————

const SELECTION = [
  'home-selection-01', 'home-selection-02', 'home-selection-03', 'home-selection-04',
  'home-selection-05', 'home-selection-06', 'home-selection-07', 'home-selection-08',
  'home-selection-09', 'home-selection-10', 'home-selection-11', 'home-selection-12',
];

const TEMOIGNAGES = TEMOIGNAGES_SITE.map((t) => ({
  texte: t.texte,
  auteur: t.auteur,
  source: 'direct',
}));

const accueil = [
  section('heros', {
    variante: 'pleinePage',
    image: image('home-hero-wide'),
    imageEtroite: image('home-hero-tall'),
    surtitres: [
      { texte: 'Photographe' },
      { texte: 'Artisan d’Art' },
      { texte: 'Le Puy-en-Velay' },
    ],
    titre: {
      texte: 'Vous n’aurez pas à savoir poser.',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    chapo: {
      contenu: paragraphes(
        'Mariages, portraits et histoires humaines en Haute-Loire. Je vous guide juste ce qu’il faut, et j’évite autant que possible les photos où tout le monde attend qu’on dise « cheese ».',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    boutons: [
      { libelle: 'Découvrir les mariages', lien: '/mariage/' },
      { libelle: 'Découvrir les portraits', lien: '/portrait/', fantome: true },
    ],
  }),

  section('texteImage', {
    variante: 'imageGauche',
    numero: '01',
    surtitre: 'Le photographe',
    titre: {
      texte: 'Photographe, oui. Mais surtout là pour raconter les gens.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Je suis Kevin Machy, photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Mon terrain de jeu préféré, ce sont les gens : ceux qui se marient, ceux qui s’aiment, ceux qui sont persuadés de ne pas être photogéniques, et ceux qui veulent simplement garder une trace vraie d’un moment de leur vie.',
        'Mon approche tient en peu de mots : vous guider quand il le faut, me faire oublier le reste du temps.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    image: image('home-apropos'),
    lien: { libelle: 'Découvrir qui je suis', href: '/a-propos/' },
  }),

  section('collections', {
    entete: {
      numero: '02',
      surtitre: 'Les collections',
      texte: 'Quel projet allons-nous imaginer ensemble ?',
      niveau: 'h2',
      chapo: paragraphes(
        'Trois façons de travailler ensemble. Elles se ressemblent sur un point : dans les trois, on commence par parler avant de photographier.',
      ),
      apparence: apparenceTitre(),
    },
    cartes: [
      {
        numero: '01',
        titre: 'Mariage',
        href: '/mariage/',
        image: image('home-collection-mariage'),
        texte:
          'Des préparatifs à la fête, je raconte votre journée telle qu’elle se vit : les émotions, les éclats de rire, et tout ce que vous n’aurez peut-être même pas vu passer.',
      },
      {
        numero: '02',
        titre: 'Portrait',
        href: '/portrait/',
        image: image('home-collection-portrait'),
        texte:
          'Vous pensez ne pas être photogénique ? Tant mieux. C’est exactement là que mon travail commence — seul, en couple ou à plusieurs.',
      },
      {
        numero: '03',
        titre: 'Studio de l’Iris',
        href: '/studio-de-l-iris/',
        image: image('home-collection-iris'),
        texte:
          'Votre regard, photographié en très haute définition, révèle des couleurs et des textures invisibles à l’œil nu. Et devient une œuvre.',
      },
    ],
    appoint: {
      contenu: paragraphes(
        'Vous cherchez un photographe pour votre entreprise ? Portraits de collaborateurs, gestes métier, reportage ou banque d’images : dites-moi ce dont vous avez besoin, on construit la prestation autour.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    lienAppoint: {
      libelle: 'Parler d’un projet d’entreprise',
      href: '/contact/?projet=entreprise',
    },
  }),

  section('bande', {
    image: image('mariage-silence'),
    imageEtroite: image('mariage-jour-03'),
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('galerie', {
    variante: 'visionneuse',
    entete: {
      numero: '03',
      surtitre: 'Une sélection',
      texte: 'Quelques images, plutôt que toutes.',
      niveau: 'h2',
      chapo: paragraphes(
        'Douze photographies pour voir comment je travaille : les gens, les émotions, et tout ce qui se passe entre les deux. Cliquez sur une image pour l’agrandir.',
      ),
      apparence: apparenceTitre(),
    },
    images: SELECTION.map((nom) => ({ image: image(nom) })),
  }),

  section('avis', {
    entete: {
      numero: '04',
      surtitre: 'Ce qu’ils en disent',
      texte: 'Ce sont eux qui en parlent le mieux.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    avis: TEMOIGNAGES,
    lien: { libelle: 'Voir plus d’avis', href: 'https://dronezvous.com/temoignages/' },
  }),

  section('appelAction', {
    titre: {
      texte: 'Vous avez une histoire à me raconter ?',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Un mariage, une séance portrait, un projet pour votre entreprise. Parlez-moi de ce que vous avez en tête : on échange simplement, sans engagement, et on voit ensemble comment le photographier à votre manière.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    boutons: [
      { libelle: 'Me parler de votre projet', lien: '/contact/' },
      { libelle: 'Accès clients', lien: 'https://kevinmachy.pic-time.com/client', fantome: true },
    ],
  }),
];


// ——————————————————————— Page Mariage ———————————————————————

const GALERIE_MARIAGE = Array.from(
  { length: 12 },
  (_, i) => `mariage-galerie-${String(i + 1).padStart(2, '0')}`,
);

const mariage = [
  section('heros', {
    variante: 'pleinePage',
    image: image('mariage-hero-wide'),
    imageEtroite: image('mariage-hero-tall'),
    surtitres: [
      { texte: 'Mariage' },
      { texte: 'Haute-Loire & Loire' },
      { texte: 'Et plus loin si l’histoire l’exige' },
    ],
    titre: {
      texte: 'Des photos vraies, et une journée que vous allez vraiment vivre.',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    chapo: {
      contenu: paragraphes(
        'Photographe de mariage en Haute-Loire et dans la Loire. Mon rôle commence bien avant les photos : vous mettre à l’aise, vous laisser profiter, et raconter votre journée telle qu’elle se passe.',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    boutons: [
      { libelle: 'Me parler de votre mariage', lien: '/contact/?projet=mariage' },
      { libelle: 'Voir les collections', lien: '#collections', fantome: true },
    ],
  }),

  section('texteImage', {
    variante: 'imageGauche',
    numero: '01',
    surtitre: 'L’approche',
    titre: {
      texte: 'Présent quand il faut. Invisible le reste du temps.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Je ne vais pas transformer votre mariage en séance photo de huit heures. Je vous guide quand vous en avez besoin — pendant les photos de couple, essentiellement — puis je vous laisse vivre. Le reste du temps, je cherche les regards, les gestes et les fous rires que vous n’avez parfois même pas vus passer.',
        'L’objectif n’est pas d’avoir de belles photos. C’est qu’en les regardant dans vingt ans, vous retrouviez vraiment votre journée : les gens que vous aimez, l’ambiance, et tout ce qui fait que cette journée n’appartiendra qu’à vous.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    distinctions: [{ texte: 'Wedding Awards 2025 & 2026' }, { texte: 'Artisan d’Art' }],
    image: image('mariage-approche'),
  }),

  section('bande', {
    image: image('mariage-silence'),
    imageEtroite: image('mariage-jour-03'),
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('jalons', {
    entete: {
      numero: '02',
      surtitre: 'Le déroulé',
      texte: 'Une journée, sept moments.',
      niveau: 'h2',
      chapo: paragraphes(
        'Chaque mariage se déroule à sa façon. Voici les temps que je couvre, et ce que je cherche dans chacun d’eux. Le détail de ce qui est inclus dépend de la collection choisie.',
      ),
      apparence: apparenceTitre(),
    },
    jalons: JOURNEE.map((j) => ({ image: image(j.image), titre: j.titre, texte: j.texte })),
  }),

  section('galerie', {
    variante: 'visionneuse',
    entete: {
      numero: '03',
      surtitre: 'La galerie',
      texte: 'Douze images, prises dans de vrais mariages.',
      niveau: 'h2',
      chapo: paragraphes(
        'Cliquez sur une image pour l’agrandir. Les flèches du clavier permettent de passer d’une photographie à l’autre.',
      ),
      apparence: apparenceTitre(),
    },
    images: GALERIE_MARIAGE.map((nom) => ({ image: image(nom) })),
  }),

  section('offres', {
    entete: {
      numero: '04',
      surtitre: 'Les collections',
      texte: 'Pas de mariage standard, donc pas de reportage standard.',
      niveau: 'h2',
      chapo: paragraphes(
        'De cinq heures de reportage à une couverture complète de votre journée, quatre collections permettent de choisir l’accompagnement qui correspond réellement à votre mariage.',
      ),
      apparence: apparenceTitre(),
    },
    socle: {
      titre: 'Dans toutes les collections',
      points: SOCLE_MARIAGE.map((texte) => ({ texte })),
    },
    formules: COLLECTIONS_MARIAGE.map((c) => ({
      nom: c.nom,
      prix: c.prix,
      duree: c.duree,
      promesse: c.promesse,
      inclus: c.inclus.map((texte) => ({ texte })),
      libelleBouton: 'Vérifier la disponibilité',
      href: '/contact/?projet=mariage',
    })),
  }),

  section('options', {
    entete: {
      texte: 'Et si vous voulez aller plus loin',
      niveau: 'h3',
      apparence: apparenceTitre('titre3'),
    },
    options: OPTIONS_MARIAGE.map((o) => ({ nom: o.nom, prix: o.prix ?? '', texte: o.texte })),
  }),

  section('encadre', {
    titre: { texte: 'Et un vidéaste ?', niveau: 'h3', apparence: apparenceTitre('titre3') },
    texte: {
      contenu: paragraphes(
        'Je me consacre aujourd’hui entièrement à la photographie. Si vous voulez aussi garder votre journée en vidéo, je travaille régulièrement aux côtés de vidéastes qui abordent un mariage comme moi : naturellement, discrètement, sans transformer la journée en tournage. Je vous oriente vers les bonnes personnes, et nous coordonnons nos prestations.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
  }),

  section('appelAction', {
    titre: {
      texte: 'Racontez-moi votre mariage.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'La date, le lieu, l’ambiance que vous imaginez — ou simplement le fait que vous n’en savez encore rien. On échange, et on voit si je suis la bonne personne pour raconter cette journée.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    boutons: [
      { libelle: 'Me parler de votre mariage', lien: '/contact/?projet=mariage' },
      { libelle: 'Prendre rendez-vous', lien: LIENS.reservation, fantome: true },
    ],
  }),
];


// ——————————————————————— Page Portrait ———————————————————————

const METHODE = [
  {
    titre: 'On commence par vous mettre à l’aise',
    texte:
      'On discute, on teste, on rigole. Au bout de quelques minutes, vous arrêtez de penser à votre sourire, à vos mains, et à cette question qui revient toujours : « mais je fais quoi, là ? »',
    image: 'portrait-methode-01',
  },
  {
    titre: 'Vous n’avez pas à savoir poser',
    texte:
      'Je me suis formé spécifiquement à la gestuelle et à la direction de modèle, pour une raison simple : c’est mon travail, pas le vôtre. Je vous guide dans la posture, le regard, les mouvements.',
    image: 'portrait-methode-02',
  },
  {
    titre: 'Le but n’est pas de vous transformer',
    texte:
      'Je veux que vous vous reconnaissiez sur les images. Avec, si possible, ce petit moment où vous vous dites : « ah ouais… c’est vraiment moi ? »',
    image: 'portrait-methode-03',
  },
];

const GALERIE_PORTRAIT = Array.from(
  { length: 10 },
  (_, i) => `portrait-galerie-${String(i + 1).padStart(2, '0')}`,
);

const portrait = [
  section('heros', {
    variante: 'pleinePage',
    image: image('portrait-hero-wide'),
    imageEtroite: image('portrait-hero-tall'),
    surtitres: [
      { texte: 'Portrait' },
      { texte: 'Studio au Puy-en-Velay' },
      { texte: 'Ou en extérieur' },
    ],
    titre: {
      texte: 'Vous pensez ne pas être photogénique ?',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    chapo: {
      contenu: paragraphes(
        'Parfait. C’est exactement avec vous que j’aime travailler — et c’est précisément là que mon travail commence.',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    boutons: [
      { libelle: 'Me parler de vous', lien: '/contact/?projet=portrait' },
      { libelle: 'Ce que comprend la séance', lien: '#seance', fantome: true },
    ],
  }),

  section('etapes', {
    entete: {
      numero: '01',
      surtitre: 'La méthode',
      texte: 'Mon boulot : vous faire oublier l’appareil photo.',
      niveau: 'h2',
      chapo: paragraphes(
        'La plupart des personnes que je photographie ne sont pas habituées à être devant un objectif. Et c’est très bien comme ça — je préfère largement ça à quelqu’un qui a appris à poser.',
      ),
      apparence: apparenceTitre(),
    },
    etapes: METHODE.map((m) => ({ image: image(m.image), titre: m.titre, texte: m.texte })),
  }),

  section('bande', {
    image: image('portrait-silence'),
    imageEtroite: image('portrait-hero-tall'),
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('inclus', {
    entete: {
      numero: '02',
      surtitre: 'La collection Portrait',
      texte: 'Une seule collection. 129 €.',
      niveau: 'h2',
      chapo: paragraphes(
        'Parce que vous n’avez pas à choisir votre expérience dans un tableau de tarifs. Seul, en couple ou à plusieurs, le principe reste le même : prendre le temps de créer des portraits qui vous ressemblent, puis choisir uniquement ce que vous avez vraiment envie de garder.',
      ),
      apparence: apparenceTitre(),
    },
    elements: PORTRAIT_INCLUS.map((i) => ({ titre: i.titre, texte: i.texte })),
  }),

  section('texteImage', {
    variante: 'imageGauche',
    titre: {
      texte: 'Et après la séance ? C’est vous qui choisissez.',
      niveau: 'h3',
      apparence: apparenceTitre('titre3'),
    },
    texte: {
      contenu: [
        ...paragraphes(
          'Lors du rendez-vous de découverte, vous voyez vos portraits finalisés et vous gardez ceux que vous avez envie de garder. Tirage d’art, tableau, Folio, album : je vous présente les supports qui correspondent le mieux à vos images et à ce que vous voulez en faire.',
        ),
        {
          type: 'paragraphe',
          fragments: [
            { texte: 'Aucune obligation d’achat supplémentaire.', gras: true },
            {
              texte:
                ' Vous choisissez librement, selon vos envies et votre budget.',
            },
          ],
        },
        ...PORTRAIT_SUPPORTS.map((texte) => ({
          type: 'liste',
          fragments: [{ texte }],
        })),
        ...paragraphes(
          'Dès 500 € de panier total, votre galerie complète en haute définition vous est offerte. Et pour chaque photographie achetée sur un support, vous recevez aussi son fichier web.',
        ),
      ],
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    image: image('portrait-tirage'),
  }),

  section('encadre', {
    titre: {
      texte: 'Et si je ne me plais sur aucune photo ?',
      niveau: 'h3',
      apparence: apparenceTitre('titre3'),
    },
    texte: {
      contenu: paragraphes(
        'C’est probablement la question que vous n’osiez pas poser. Si aucune image ne vous plaît lors du premier visionnage, je vous propose une nouvelle séance, une fois, sans frais.',
        'Parce que si vous venez en pensant ne pas être photogénique, mon travail n’est pas d’appuyer sur un bouton. C’est de trouver avec vous les images dans lesquelles vous allez enfin vous reconnaître.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
  }),

  section('galerie', {
    variante: 'visionneuse',
    entete: {
      numero: '03',
      surtitre: 'La galerie',
      texte: 'Ils pensaient ne pas être photogéniques, eux aussi.',
      niveau: 'h2',
      chapo: paragraphes('Cliquez sur une image pour l’agrandir.'),
      apparence: apparenceTitre(),
    },
    images: GALERIE_PORTRAIT.map((nom) => ({ image: image(nom) })),
  }),

  section('appelAction', {
    titre: {
      texte: 'On se voit au studio ?',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Dites-moi qui vous êtes et ce que vous attendez de ces portraits. On prépare la séance ensemble, je vous guide du début à la fin, et vous découvrez vos images au studio du Puy-en-Velay.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    boutons: [
      { libelle: 'Me parler de vous', lien: '/contact/?projet=portrait' },
      { libelle: 'Réserver ma séance — 129 €', lien: LIENS.reservation, fantome: true },
    ],
  }),
];


// ——————————————————————— Studio de l'Iris ———————————————————————

const IRIS_MOSAIQUE = Array.from(
  { length: 6 },
  (_, i) => `iris-detail-0${i + 1}`,
);

const iris = [
  section('heros', {
    variante: 'pleinePage',
    image: image('iris-hero-wide'),
    imageEtroite: image('iris-hero-tall'),
    surtitres: [
      { texte: 'Studio de l’Iris' },
      { texte: SITE.adresse },
      { texte: 'Sur rendez-vous' },
    ],
    titre: {
      texte: 'Votre iris est aussi unique qu’une empreinte digitale.',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    chapo: {
      contenu: paragraphes(
        'Photographié en très haute définition, il révèle des couleurs, des textures et des détails invisibles à l’œil nu. Seul, en couple, en famille — ou avec votre animal.',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    boutons: [
      { libelle: 'Réserver ma séance', lien: LIENS.reservation },
      { libelle: 'Voir les tarifs', lien: '#section-tarifs', fantome: true },
    ],
  }),

  section('texteImage', {
    variante: 'imageDroite',
    numero: '01',
    surtitre: 'L’œuvre',
    titre: {
      texte: 'Votre regard devient une pièce à part entière.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: [
        ...paragraphes(
          'La prise de vue est rapide et se fait sans aucun contact avec l’œil. Je vous accompagne ensuite dans le choix de la composition et du rendu qui mettront le mieux votre iris en valeur.',
          'La prestation fonctionne pour une personne seule, pour un duo, ou pour immortaliser le regard de votre animal — chien, chat, cheval, NAC selon les conditions.',
        ),
        ...[
          'Maîtrise technique en photographie macro',
          'Équipement spécialisé, dédié à la prise de vue d’iris',
          'Sécurité et confort : sans contact, sans risque',
          'Une composition adaptée à chaque sujet',
        ].map((texte) => ({ type: 'liste', fragments: [{ texte }] })),
      ],
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    image: image('iris-oeuvre'),
  }),

  section('galerie', {
    variante: 'mosaiqueLarge',
    images: IRIS_MOSAIQUE.map((nom) => ({ image: image(nom) })),
    reglages: { fond: 'noir', espacement: 'serre' },
  }),

  section('etapes', {
    variante: 'filets',
    entete: {
      numero: '02',
      surtitre: 'Le déroulé',
      texte: 'Une séance dure environ trente minutes.',
      niveau: 'h2',
      chapo: paragraphes(
        'Quarante-cinq minutes pour deux personnes. Pour un animal, la durée dépend de son calme et de sa réceptivité — et son rythme reste prioritaire.',
      ),
      apparence: apparenceTitre(),
    },
    etapes: IRIS_ETAPES.map((e) => ({ titre: e.titre, texte: e.texte })),
  }),

  section('galerie', {
    variante: 'trio',
    entete: {
      numero: '03',
      surtitre: 'L’iris animal',
      texte: 'Le regard de votre compagnon.',
      niveau: 'h2',
      chapo: paragraphes(
        'Chaque animal a un regard unique. La séance se déroule dans le respect total de l’animal, sans contrainte, avec patience — et votre présence est fortement recommandée.',
      ),
      apparence: apparenceTitre(),
    },
    images: [
      { image: image('iris-animal-01') },
      { image: image('iris-animal-02') },
      { image: image('iris-duo') },
    ],
  }),

  section(
    'tarifs',
    {
      entete: {
        numero: '04',
        surtitre: 'Les tarifs',
        texte: 'Deux formules, adaptables.',
        niveau: 'h2',
        chapo: paragraphes(
          'Le tirage et le support grande taille se choisissent après la séance, quand vous avez vu votre image. Rien n’est imposé.',
        ),
        apparence: apparenceTitre(),
      },
      formules: IRIS_TARIFS.map((t) => ({
        nom: t.nom,
        prix: t.prix,
        note: t.note,
        simulateur: t.simulateur || undefined,
        exclus: t.exclus ?? undefined,
        inclus: t.inclus.map((texte) => ({ texte })),
        boutons: [{ libelle: t.cta.label, lien: t.cta.href, fantome: true }],
      })),
      barreDeRappel: true,
    },
    // Clé fixe : le bouton du héros pointe vers #section-tarifs.
    'tarifs',
  ),

  section('supports', {
    titre: { texte: 'Les supports', niveau: 'h3', apparence: apparenceTitre('titre3') },
    supports: IRIS_SUPPORTS.map((sup) => ({
      nom: sup.nom,
      prix: sup.prix,
      note: sup.note ?? undefined,
    })),
    legende:
      'La grille complète des formats et des finitions est détaillée au studio. Au-delà des formats listés, sur devis.',
  }),

  section('galerie', {
    variante: 'duo',
    images: [{ image: image('iris-support-tableau') }, { image: image('iris-support-bijou') }],
  }),

  section('faq', {
    entete: {
      numero: '05',
      surtitre: 'Questions fréquentes',
      texte: 'Ce que l’on me demande le plus souvent.',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    questions: IRIS_FAQ.map((q) => ({ question: q.q, reponse: q.r })),
  }),

  section('appelAction', {
    titre: { texte: 'Prêt à voir votre iris ?', niveau: 'h2', apparence: apparenceTitre() },
    texte: {
      contenu: paragraphes(
        `Le Studio de l’Iris se trouve au ${SITE.adresse}, au Puy-en-Velay, uniquement sur rendez-vous. Dès la commande passée, je vous recontacte pour fixer une date.`,
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    boutons: [
      { libelle: 'Réserver ma séance Iris', lien: LIENS.reservation },
      { libelle: 'Poser une question', lien: '/contact/?projet=iris', fantome: true },
    ],
  }),
];

// ——————————————————————— Page À propos ———————————————————————

const apropos = [
  section('texteImage', {
    variante: 'ouverture',
    numero: '00',
    surtitre: 'À propos',
    titre: {
      texte: 'Derrière l’appareil, il y a Kevin.',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    texte: {
      contenu: paragraphes(
        'Photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Je photographie surtout des gens — et très souvent ceux qui commencent par me dire qu’ils ne sont « pas photogéniques ».',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    distinctions: [{ texte: 'Artisan d’Art' }, { texte: 'Télépilote de drone professionnel' }],
    image: image('apropos-portrait'),
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('texteLibre', {
    entete: {
      numero: '01',
      surtitre: 'Le parcours',
      texte: 'Avant la photo, il y avait la gendarmerie.',
      niveau: 'h2',
      chapo: paragraphes(
        'Douze ans. Un univers assez éloigné d’un mariage ou d’une séance portrait — en apparence seulement.',
      ),
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'J’y ai appris à observer, à anticiper, à rester discret quand il le faut, et surtout à m’adapter vite aux gens et aux situations. Ce sont exactement ces qualités que j’emmène aujourd’hui derrière l’appareil.',
        'Pendant un mariage, je sais être là sans prendre toute la place. En portrait, je prends le temps de comprendre la personne que j’ai en face de moi, plutôt que de lui demander d’enchaîner des poses.',
        'La technique photographique s’apprend. Mettre les gens en confiance, observer ce qui se passe et savoir quand déclencher, c’est une autre histoire.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    largeur: 'mesure',
  }),

  section('bande', {
    variante: 'pleineLargeur',
    image: image('apropos-silence'),
    imageEtroite: image('mariage-jour-07'),
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('texteImage', {
    variante: 'imageDroite',
    numero: '02',
    surtitre: 'L’outil',
    titre: { texte: 'Et le drone dans tout ça ?', niveau: 'h2', apparence: apparenceTitre() },
    texte: {
      contenu: paragraphes(
        'Je suis également télépilote de drone professionnel. Une compétence qui permet, lorsque le projet s’y prête et que les conditions le permettent, d’apporter un autre point de vue à un reportage.',
        'Mais le drone reste un outil. L’histoire et les personnes passent toujours en premier.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    image: image('apropos-travail'),
  }),

  section('texteLibre', {
    entete: {
      numero: '03',
      surtitre: 'La façon de faire',
      texte: 'Je ne vais pas vous demander de savoir poser.',
      niveau: 'h2',
      chapo: paragraphes(
        'La plupart des personnes que je photographie ne sont pas habituées à être devant un objectif. Et c’est très bien comme ça.',
      ),
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Mon rôle, c’est de vous guider quand vous en avez besoin, de vous laisser respirer quand il le faut, et surtout de faire oublier progressivement l’appareil. Que ce soit pendant un mariage ou une séance portrait, je cherche moins la photo parfaite que celle dans laquelle vous allez vraiment vous reconnaître.',
        'Je photographie des personnes, pas des modèles. Des couples qui rient, des mariés qui profitent de leur journée, des familles qui bougent — et beaucoup de gens qui commencent leur séance en s’excusant presque d’être là.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    largeur: 'mesure',
  }),

  section('appelAction', {
    titre: {
      texte: 'Et maintenant, on fait des photos ?',
      niveau: 'h2',
      apparence: apparenceTitre(),
    },
    texte: {
      contenu: paragraphes(
        'Si ma façon de voir la photographie vous parle, il ne reste plus qu’à me raconter ce que vous avez en tête. Un mariage, une séance portrait, un projet pour votre entreprise : on échange simplement, sans engagement, et on voit si je suis la bonne personne pour raconter votre histoire.',
      ),
      apparence: { taille: 'corps', police: 'texte', couleur: 'encreAttenuee' },
    },
    boutons: [
      { libelle: 'Me parler de votre projet', lien: '/contact/' },
      { libelle: 'Voir mon Instagram', lien: LIENS.instagram, fantome: true },
    ],
  }),
];

// ——————————————————————— Page Contact ———————————————————————

const contact = [
  section('texteImage', {
    variante: 'ouverture',
    numero: '00',
    surtitre: 'Contact',
    titre: {
      texte: 'Parlez-moi de votre projet.',
      niveau: 'h1',
      apparence: apparenceTitre('geant'),
    },
    texte: {
      contenu: paragraphes(
        'Quelques lignes suffisent. Dites-moi ce que vous préparez, où, et quand si vous le savez déjà. Je vous réponds pour qu’on puisse en discuter.',
      ),
      apparence: { taille: 'chapo', police: 'texte', couleur: 'encre' },
    },
    reglages: { fond: 'noir', espacement: 'aucun' },
  }),

  section('contact', {
    formulaire: true,
    blocs: [
      {
        surtitre: 'Vous préférez appeler',
        variante: 'texte',
        liens: [{ libelle: SITE.telephone, href: SITE.telephoneUri, grand: true }],
      },
      {
        surtitre: 'Ou écrire',
        variante: 'texte',
        liens: [{ libelle: SITE.email, href: `mailto:${SITE.email}` }],
      },
      {
        surtitre: 'Le studio',
        variante: 'texte',
        texte: `${SITE.adresse}\n${SITE.codePostal} ${SITE.ville}`,
        legende: 'Sur rendez-vous uniquement.',
      },
      {
        surtitre: 'Le studio est ouvert',
        variante: 'horaires',
        horaires: HORAIRES.map((h) => ({ jour: h.jour, ouverture: h.ouverture ?? '' })),
        legende: 'Toujours sur rendez-vous.',
      },
      { surtitre: 'Zone d’intervention', variante: 'texte', legende: ZONE },
      {
        surtitre: 'Déjà client',
        variante: 'texte',
        liens: [
          { libelle: 'Accéder à ma galerie ↗', href: LIENS.accesClients },
          { libelle: 'Prendre rendez-vous en ligne ↗', href: LIENS.reservation },
        ],
      },
    ],
    reglages: { fond: 'noir', espacement: 'serre' },
  }),

  section('bande', {
    variante: 'dansLaPage',
    image: image('contact-studio'),
    legende:
      'Le studio du Puy-en-Velay accueille les séances portrait, les portraits professionnels, le Studio de l’Iris et les photos d’identité agréées ANTS. Toujours sur rendez-vous.',
    reglages: { fond: 'noir', espacement: 'serre' },
  }),
];

// ——————————————————————— Enregistrement ———————————————————————

const PAGES = [
  {
    chemin: '',
    titre: 'Accueil',
    metaTitre: 'Kevin Machy — Photographe mariage et portrait en Haute-Loire',
    metaDescription:
      'Photographe de mariage et de portrait au Puy-en-Velay. Des images naturelles, pour ceux qui pensent ne pas être photogéniques.',
    metaImage: '/img/og-accueil.jpg',
    sections: accueil,
  },
  {
    chemin: 'mariage',
    titre: 'Mariage',
    metaTitre: 'Photographe de mariage en Haute-Loire',
    metaDescription:
      'Photographe de mariage au Puy-en-Velay, en Haute-Loire et dans la Loire. Un reportage naturel, quatre collections de 1390 € à 3400 €, livraison sous 21 jours.',
    metaImage: '/img/og-mariage.jpg',
    sections: mariage,
  },
  {
    chemin: 'portrait',
    titre: 'Portrait',
    metaTitre: 'Photographe portrait en Haute-Loire',
    metaDescription:
      'Séance portrait au studio du Puy-en-Velay ou en extérieur. Une seule collection à 129 €, un tirage d’art inclus, et une nouvelle séance offerte si aucune image ne vous plaît.',
    sections: portrait,
    metaImage: '/img/og-portrait.jpg',
  },
  {
    chemin: 'studio-de-l-iris',
    titre: 'Studio de l’Iris',
    metaTitre: 'Studio de l’Iris au Puy-en-Velay',
    metaDescription:
      'Votre iris photographié en très haute définition, au Puy-en-Velay. Séance à partir de 49 €, sans contact avec l’œil. Humains et animaux, sur rendez-vous.',
    metaImage: '/img/og-iris.jpg',
    sections: iris,
  },
  {
    chemin: 'a-propos',
    titre: 'À propos',
    metaTitre: 'À propos — Kevin Machy, photographe et Artisan d’Art',
    metaDescription:
      'Douze ans de gendarmerie avant la photographie. Kevin Machy, photographe professionnel et Artisan d’Art au Puy-en-Velay, également télépilote de drone.',
    metaImage: '/img/og-apropos.jpg',
    sections: apropos,
  },
  {
    chemin: 'contact',
    titre: 'Contact',
    metaTitre: 'Contact — Photographe au Puy-en-Velay',
    metaDescription:
      'Parlez-moi de votre projet photo : mariage, portrait, iris ou entreprise. Studio au Puy-en-Velay, sur rendez-vous. 07 81 74 32 84.',
    metaImage: '/img/og-contact.jpg',
    sections: contact,
  },
];

for (const page of PAGES) {
  const { rows } = await client.query(
    'SELECT id, publie_le, modifie_le FROM pages WHERE chemin = $1',
    [page.chemin],
  );

  if (rows.length) {
    // Une page déjà retouchée depuis le BackOffice ne se réécrit pas : rejouer
    // la conversion effacerait le travail de Kevin.
    const retouchee = rows[0].publie_le && rows[0].modifie_le > rows[0].publie_le;
    if (retouchee) {
      // L'image de partage n'a jamais eu d'équivalent dans l'éditeur : la
      // poser ne peut rien écraser, et sans elle la page perdrait sa vignette.
      await client.query(
        'UPDATE pages SET meta_image = $2 WHERE id = $1 AND meta_image IS NULL',
        [rows[0].id, page.metaImage ?? null],
      );
      console.log(`  ignorée   /${page.chemin} — modifiée depuis le BackOffice`);
      continue;
    }
    await client.query(
      `UPDATE pages SET titre = $2, sections = $3, brouillon = NULL, statut = 'publie',
              meta_titre = $4, meta_description = $5, meta_image = $6,
              publie_le = now(), modifie_le = now()
        WHERE id = $1`,
      [
        rows[0].id,
        page.titre,
        JSON.stringify(page.sections),
        page.metaTitre,
        page.metaDescription,
        page.metaImage ?? null,
      ],
    );
    console.log(`  remplacée /${page.chemin}`);
  } else {
    await client.query(
      `INSERT INTO pages (chemin, titre, sections, statut, meta_titre, meta_description, meta_image, publie_le)
       VALUES ($1, $2, $3, 'publie', $4, $5, $6, now())`,
      [
        page.chemin,
        page.titre,
        JSON.stringify(page.sections),
        page.metaTitre,
        page.metaDescription,
        page.metaImage ?? null,
      ],
    );
    console.log(`  créée     /${page.chemin}`);
  }
}

console.log('\nConversion terminée.');
await client.end();
