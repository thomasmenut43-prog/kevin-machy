/**
 * Écrit les cinq prestations reprises de l'ancien site, et leur sommaire.
 *
 *   node scripts/convertir-prestations.mjs    → contenu/prestations.json
 *   npm run prestations                       → pose le fichier en base
 *
 * `dronezvous.com` vendait cinq choses que le nouveau site taisait :
 * photographie d'entreprise, inspection par drone, location de photobooth,
 * formation, tirages d'art. Cinq pages, deux mille quatre cents mots, et des
 * tarifs. Les laisser derrière, c'était éteindre cinq sources de revenu le jour
 * où l'ancien site s'arrête.
 *
 * ---
 *
 * **Pourquoi écrire les sections ici plutôt que de convertir le HTML.**
 *
 * Les pages juridiques se convertissaient : un titre, des paragraphes, et
 * l'ordre fait foi. Celles-ci sont des pages de vente. Leur contenu doit entrer
 * dans les sections du catalogue — une grille de tarifs est une `tarifs`, pas
 * un paragraphe qui parle de prix — et aucun analyseur ne devine ça. Le texte
 * est donc repris mot pour mot depuis `.cache/ancien/*.txt`, et c'est sa
 * **structure** qui est décidée ici.
 *
 * **Aucun chiffre n'est inventé.** Tous viennent des pages relevées. Ils ne
 * sont pas non plus recopiés dans `lib/site.ts` : ces pages n'ont pas de code
 * qui calcule, contrairement au simulateur d'iris. Un tarif écrit aux deux
 * endroits finirait par différer, et c'est celui que personne ne relit qui
 * s'afficherait.
 *
 * **Les images se désignent par leur nom**, préfixé d'une arobase —
 * `"@ent-hero-wide"`. Les identifiants de la médiathèque sont propres à chaque
 * base ; `poser-prestations.mjs` les résout au moment d'écrire.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ———————————————————————————————— Raccourcis ————————————————————————————————

const frag = (f) => (typeof f === 'string' ? { texte: f } : f);
const p = (...fs) => ({ type: 'paragraphe', fragments: fs.map(frag) });
const riche = (...paragraphes) => paragraphes.map((t) => (typeof t === 'string' ? p(t) : t));

const APP_TEXTE = { police: 'texte', taille: 'corps', couleur: 'encreAttenuee' };
const APP_CHAPO = { police: 'texte', taille: 'chapo', couleur: 'encre' };
const APP_TITRE = { police: 'titre', taille: 'titre2', couleur: 'encre' };
const APP_TITRE3 = { police: 'titre', taille: 'titre3', couleur: 'encre' };

const texte = (...ps) => ({ contenu: riche(...ps), apparence: APP_TEXTE });
const chapo = (...ps) => riche(...ps);

/** L'en-tête commun à presque toutes les sections : numéro, surtitre, titre, chapô. */
const entete = (numero, surtitre, titre, ...ps) => ({
  ...(numero ? { numero } : {}),
  ...(surtitre ? { surtitre } : {}),
  texte: titre,
  niveau: 'h2',
  ...(ps.length ? { chapo: chapo(...ps) } : {}),
  apparence: APP_TITRE,
});

const reglages = (espacement = 'normal') => ({ fond: 'noir', espacement });

let n = 0;
const sec = (type, valeurs, espacement) => ({
  cle: `prest-${(n += 1)}`,
  type,
  valeurs: { ...valeurs, reglages: valeurs.reglages ?? reglages(espacement) },
});

/** Remet le compteur à zéro entre deux pages : les clés sont locales à la page. */
const page = (cle) => {
  n = 0;
  return (type, valeurs, espacement) => {
    const s = sec(type, valeurs, espacement);
    s.cle = `${cle}-${n}`;
    return s;
  };
};

const heros = (s, { variante, image, imageEtroite, surtitres, titre, chapo: ch, boutons }) =>
  s('heros', {
    variante,
    ...(image ? { image } : {}),
    ...(imageEtroite ? { imageEtroite } : {}),
    ...(surtitres ? { surtitres: surtitres.map((t) => ({ texte: t })) } : {}),
    titre: { texte: titre, niveau: 'h1', apparence: { police: 'titre', taille: 'geant', couleur: 'encre' } },
    chapo: { contenu: riche(ch), apparence: APP_CHAPO },
    ...(boutons ? { boutons } : {}),
  });

// ———————————————————————————————— Les pages ————————————————————————————————

const pages = {};

// —————————————————————————————————————————————————————————— Sommaire
{
  const s = page('prestations');
  pages.prestations = {
    titre: 'Prestations',
    metaTitre: 'Prestations — huit façons de travailler ensemble',
    metaDescription:
      'Mariage, portrait, Studio de l’Iris, photographie d’entreprise, drone, photobooth, formation et tirages d’art. Huit façons de travailler ensemble.',
    sections: [
      heros(s, {
        variante: 'sobre',
        surtitres: ['Photographe', 'Artisan d’Art', 'Le Puy-en-Velay'],
        titre: 'Huit façons de travailler ensemble.',
        chapo:
          'Photographier des gens, surtout. Et puis quelques métiers voisins que je pratique depuis assez longtemps pour les faire bien : le drone, le photobooth, la formation, et des tirages à accrocher chez vous.',
      }),
      s('collections', {
        entete: entete(
          '01',
          'Photographier des gens',
          'Ce que je fais le plus souvent.',
          'Quatre univers, une même façon de travailler : on parle avant de photographier, et personne n’a besoin de savoir poser.',
        ),
        cartes: [
          {
            numero: '01',
            titre: 'Mariage',
            image: '@home-collection-mariage',
            texte:
              'Des préparatifs à la fête, je raconte votre journée telle qu’elle se vit : les émotions, les éclats de rire, et tout ce que vous n’aurez peut-être même pas vu passer.',
            href: '/mariage/',
          },
          {
            numero: '02',
            titre: 'Portrait',
            image: '@home-collection-portrait',
            texte:
              'Vous pensez ne pas être photogénique ? Tant mieux. C’est exactement là que mon travail commence — seul, en couple ou à plusieurs.',
            href: '/portrait/',
          },
          {
            numero: '03',
            titre: 'Studio de l’Iris',
            image: '@home-collection-iris',
            texte:
              'Votre regard, photographié en très haute définition, révèle des couleurs et des textures invisibles à l’œil nu. Et devient une œuvre.',
            href: '/studio-de-l-iris/',
          },
          {
            numero: '04',
            titre: 'Entreprise',
            image: '@prestations-entreprise',
            texte:
              'Portraits de collaborateurs, gestes métier, locaux : une banque d’images qui vous ressemble et que vous aurez envie d’utiliser.',
            href: '/entreprise/',
          },
        ],
      }),
      s('collections', {
        entete: entete(
          '02',
          'Et aussi',
          'Quatre métiers voisins.',
          'Ils viennent de la même pratique, et parfois du même matériel. Ils se commandent séparément, ou avec une prestation photographique.',
        ),
        cartes: [
          {
            numero: '05',
            titre: 'Drone',
            image: '@prestations-drone',
            texte:
              'Inspection de toitures, de pylônes, d’éoliennes ou de panneaux solaires, et suivi de chantier. Télépilote professionnel.',
            href: '/drone/',
          },
          {
            numero: '06',
            titre: 'Photobooth',
            image: '@prestations-photobooth',
            texte:
              'Vos invités repartent avec leurs photos imprimées sur place. Avec, si vous voulez, un livre d’or audio pour garder aussi les voix.',
            href: '/photobooth/',
          },
          {
            numero: '07',
            titre: 'Formation',
            image: '@prestations-formation',
            texte:
              'Comprendre son appareil et apprendre à construire une image. En petit groupe sur une journée, ou en individuel.',
            href: '/formation/',
          },
          {
            numero: '08',
            titre: 'Tirages d’art',
            image: '@prestations-tirages',
            texte:
              'Une sélection de mes photographies de paysages, en série limitée à quinze exemplaires, sur papier ou sur aluminium.',
            href: '/tirages/',
          },
        ],
      }),
    ],
  };
}

// —————————————————————————————————————————————————————————— Entreprise
{
  const s = page('ent');
  pages.entreprise = {
    titre: 'Photographie d’entreprise',
    metaTitre: 'Photographe d’entreprise en Haute-Loire',
    metaDescription:
      'Portraits professionnels, photos d’équipes et de savoir-faire, reportages en entreprise. Au Puy-en-Velay, en Haute-Loire, dans la Loire et en Auvergne-Rhône-Alpes.',
    metaImage: '@ent-hero-wide',
    sections: [
      heros(s, {
        variante: 'titreDecale',
        image: '@ent-hero-wide',
        imageEtroite: '@ent-hero-tall',
        surtitres: ['Entreprise', 'Haute-Loire'],
        titre: 'Montrez qui vous êtes vraiment.',
        chapo:
          'Portraits professionnels, photos d’équipes, de savoir-faire et reportages en entreprise, pour donner un visage à votre activité. Basé au Puy-en-Velay, j’interviens en Haute-Loire, dans la Loire et partout en Auvergne-Rhône-Alpes selon les projets.',
        boutons: [{ libelle: 'Parler de mon projet', lien: '/contact/' }],
      }),
      s('texteImage', {
        variante: 'imageDroite',
        numero: '01',
        surtitre: 'L’idée',
        titre: {
          texte: 'Votre entreprise mérite mieux que des photos qui font « photo d’entreprise ».',
          niveau: 'h2',
          apparence: APP_TITRE,
        },
        texte: texte(
          'Vos clients ne découvrent pas seulement vos produits ou vos services. Ils découvrent aussi les personnes qui se cachent derrière.',
          'Dirigeants, collaborateurs, artisans, indépendants : mon travail est de montrer votre entreprise telle qu’elle est vraiment. Professionnelle, bien sûr, mais surtout humaine.',
          'Pas besoin que votre équipe sache poser. Je guide chacun pour obtenir des portraits naturels et cohérents avec votre image, et je photographie également votre savoir-faire, vos locaux et vos équipes en situation.',
          'L’objectif : une banque d’images qui vous ressemble et que vous aurez réellement envie d’utiliser sur votre site, LinkedIn, vos réseaux sociaux et vos supports de communication.',
        ),
        image: '@ent-nb',
      }),
      s('inclus', {
        entete: entete(
          '02',
          'Ce que je photographie',
          'Des images pour montrer votre entreprise, pas seulement vos visages.',
        ),
        elements: [
          {
            titre: 'Portraits professionnels',
            texte:
              'Dirigeants, indépendants et collaborateurs. Des portraits naturels pour LinkedIn, votre site internet, votre communication et vos supports professionnels.',
          },
          {
            titre: 'Équipes et savoir-faire',
            texte:
              'Vos collaborateurs en situation, vos gestes métier, vos locaux et votre quotidien. L’idée : montrer concrètement ce qui fait votre entreprise.',
          },
          {
            titre: 'Reportages et événements',
            texte:
              'Séminaires, inaugurations, événements professionnels ou moments forts de votre entreprise, photographiés de manière naturelle et discrète.',
          },
        ],
      }),
      s('tarifs', {
        entete: entete(
          '03',
          'Les tarifs',
          'Un portrait, ou tout un reportage.',
          'Le portrait seul a un prix fixe. Un reportage se construit autour de vos besoins, donc sur devis.',
        ),
        barreDeRappel: false,
        formules: [
          {
            nom: 'Corporate Express',
            prix: '75 €',
            note: 'Pour LinkedIn, votre site internet, votre CV ou vos supports professionnels.',
            inclus: [
              { texte: '20 minutes au studio' },
              { texte: 'Un portrait final retouché' },
              { texte: 'Accompagnement pendant toute la séance : posture, regard, expression' },
            ],
            boutons: [{ libelle: 'Réserver mon portrait', lien: '/contact/' }],
          },
          {
            nom: 'Reportage en entreprise',
            prix: 'Sur devis',
            note: 'Construit autour de vos besoins, et de l’usage que vous ferez des images.',
            inclus: [
              { texte: 'Portraits de collaborateurs' },
              { texte: 'Photos d’équipe' },
              { texte: 'Gestes métier et savoir-faire' },
              { texte: 'Locaux et environnement de travail' },
              { texte: 'Banque d’images pour votre communication' },
              { texte: 'Reportage événementiel' },
            ],
            boutons: [{ libelle: 'Parler de mon projet', lien: '/contact/' }],
          },
        ],
        legende:
          'L’objectif n’est pas de produire des centaines d’images inutiles, mais de vous livrer des photographies cohérentes, naturelles et réellement exploitables.',
      }),
      s('texteImage', {
        variante: 'imageGauche',
        numero: '04',
        surtitre: 'Une objection courante',
        titre: { texte: '« Je ne suis pas photogénique. »', niveau: 'h2', apparence: APP_TITRE },
        texte: texte(
          'Je l’entends aussi en entreprise. Tout le monde n’est pas à l’aise devant un appareil photo, et quand il faut photographier toute une équipe, certains collaborateurs préféreraient clairement être ailleurs.',
          'C’est justement mon rôle de gérer ça. Je guide chacun simplement — posture, regard, position des mains, expression — sans demander à vos collaborateurs de devenir mannequins pendant cinq minutes.',
          'Résultat : une équipe cohérente visuellement, sans effacer la personnalité de chacun. Et une séance qui ne devient pas une corvée.',
        ),
        image: '@ent-equipe',
      }),
      s('galerie', {
        variante: 'trio',
        entete: entete('05', 'Quelques images', 'Des entreprises m’ont déjà confié leur image.'),
        images: [{ image: '@ent-portrait' }, { image: '@ent-magasin' }, { image: '@ent-accueil' }],
      }),
      s('encadre', {
        titre: { texte: 'Des images faites pour être utilisées', niveau: 'h3', apparence: APP_TITRE3 },
        texte: texte(
          'Site internet, LinkedIn, réseaux sociaux, communication interne, plaquettes ou relations presse : les images sont pensées dès la préparation en fonction de vos futurs usages.',
          'Les droits d’utilisation sont définis clairement avec vous dans le devis. Pas de mauvaise surprise après la séance. Pour une campagne publicitaire ou un usage particulier, nous définissons simplement les droits nécessaires en amont.',
        ),
      }),
    ],
  };
}

// —————————————————————————————————————————————————————————— Drone
{
  const s = page('drone');
  pages.drone = {
    titre: 'Inspection et suivi de chantier par drone',
    metaTitre: 'Inspection par drone en Haute-Loire et dans la Loire',
    metaDescription:
      'Inspection visuelle par drone : toitures, antennes et pylônes, éoliennes, panneaux solaires, sites industriels. Et suivi de chantier en vues aériennes.',
    metaImage: '@drone-hero-wide',
    sections: [
      heros(s, {
        variante: 'titreDecale',
        image: '@drone-hero-wide',
        surtitres: ['Drone', 'Télépilote professionnel'],
        titre: 'Voir ce qu’on ne peut pas atteindre.',
        chapo:
          'Inspection visuelle par drone en Haute-Loire, dans la Loire et dans les régions voisines. Un drone équipé d’un zoom puissant permet des prises de vue précises, rapides et sûres, sur une large variété de projets.',
        boutons: [{ libelle: 'Demander un devis', lien: '/contact/' }],
      }),
      s('texteImage', {
        variante: 'imageDroite',
        numero: '01',
        surtitre: 'Pourquoi le drone',
        titre: { texte: 'Ni nacelle, ni échafaudage, ni personne en hauteur.', niveau: 'h2', apparence: APP_TITRE },
        texte: texte(
          'Le drone est une alternative aux méthodes d’inspection traditionnelles — la nacelle, l’accès manuel. Il atteint facilement des zones difficiles d’accès ou dangereuses, en réduisant les risques humains et les coûts associés.',
          'Les images et vidéos haute définition capturées pendant le vol vous donnent une base de travail claire pour analyser l’état de vos structures.',
        ),
        image: '@drone-chantier-01',
      }),
      s('inclus', {
        entete: entete(
          '02',
          'Les applications',
          'Ce qu’une inspection aérienne permet de contrôler.',
        ),
        elements: [
          {
            titre: 'Toitures',
            texte: 'Vérifier rapidement l’état d’une couverture, des tuiles, des gouttières ou des cheminées.',
          },
          {
            titre: 'Antennes et pylônes',
            texte: 'Contrôler l’état des antennes relais ou des structures électriques, repérer les signes d’usure ou les dommages.',
          },
          {
            titre: 'Parcs éoliens',
            texte: 'Analyser l’état des pales, des nacelles et des mâts, en accédant en sécurité à des zones inatteignables autrement.',
          },
          {
            titre: 'Panneaux solaires',
            texte: 'Évaluer les dégâts sur une installation photovoltaïque — ceux de la grêle, par exemple — pour une estimation rapide et précise.',
          },
          {
            titre: 'Sites industriels',
            texte: 'Examiner des façades, des cheminées ou des structures complexes sans interrompre l’activité du site.',
          },
        ],
      }),
      s('texteImage', {
        variante: 'imageGauche',
        numero: '03',
        surtitre: 'Suivi de chantier',
        titre: { texte: 'Documenter l’avancement, depuis le ciel.', niveau: 'h2', apparence: APP_TITRE },
        texte: texte(
          'Pour suivre l’évolution d’un chantier ou répondre à une demande particulière, je réalise des photographies aériennes de haute précision.',
          'Ces vues offrent une perspective claire et détaillée : planifier des livraisons, documenter l’avancement des travaux, analyser une réalisation avec exactitude. Chaque détail est visible.',
        ),
        image: '@drone-chantier-02',
      }),
      s('encadre', {
        titre: { texte: 'Les tarifs', niveau: 'h3', apparence: APP_TITRE3 },
        texte: texte(
          'Sur devis, à établir ensemble. Une inspection de toiture et le suivi d’un chantier sur plusieurs mois n’ont ni la même durée, ni les mêmes livrables : décrivez-moi ce que vous avez à contrôler.',
        ),
      }),
    ],
  };
}

// —————————————————————————————————————————————————————————— Photobooth
{
  const s = page('pb');
  pages.photobooth = {
    titre: 'Location de photobooth',
    metaTitre: 'Location de photobooth en Haute-Loire',
    metaDescription:
      'Photobooth avec impression instantanée pour mariage, anniversaire ou soirée d’entreprise, en Haute-Loire et dans la Loire. Et un livre d’or audio pour garder les voix.',
    metaImage: '@photobooth-hero-wide',
    sections: [
      heros(s, {
        variante: 'titreDecale',
        image: '@photobooth-hero-wide',
        surtitres: ['Photobooth', 'Livre d’or audio'],
        titre: 'Vos invités repartent avec leurs photos.',
        chapo:
          'Mariage, anniversaire, soirée d’entreprise ou fête de famille : un photobooth qui imprime sur place, disponible en Haute-Loire et dans la Loire. Plusieurs formules, selon le nombre de tirages.',
        boutons: [{ libelle: 'Réserver un photobooth', lien: '/contact/' }],
      }),
      s('inclus', {
        entete: entete('01', 'Le photobooth', 'Ce qu’il fait, et ce qu’il demande.'),
        elements: [
          { titre: 'Simple à utiliser', texte: 'Vos invités se prennent en photo en toute autonomie.' },
          {
            titre: 'Qualité professionnelle',
            texte: 'Appareil photo Canon et éclairage intégré. Ce ne sont pas des images de borne.',
          },
          { titre: 'Impression instantanée', texte: 'Les photos sont imprimées pendant votre événement.' },
          { titre: 'Galerie numérique', texte: 'Vous retrouvez également les photos après l’événement.' },
        ],
      }),
      s('texteImage', {
        variante: 'imageDroite',
        numero: '02',
        surtitre: 'Le livre d’or audio',
        titre: { texte: 'Garder aussi les voix.', niveau: 'h2', apparence: APP_TITRE },
        texte: texte(
          'Vos invités décrochent un téléphone rétro et laissent un message vocal. Tous les messages sont enregistrés et vous sont remis après l’événement.',
          'Les plus jeunes adorent le photobooth ; le livre d’or audio, lui, séduit les invités de tous âges. Vous repartez avec des photos drôles et des messages touchants.',
          'Les deux se louent ensemble ou séparément — pour un mariage, un anniversaire, un événement d’entreprise ou une fête de famille.',
        ),
        image: '@photobooth-invites',
      }),
      s('tarifs', {
        entete: entete(
          '03',
          'Les tarifs',
          'Deux formules, adaptables.',
          'Retrait la veille ou livraison, retour le lendemain de l’événement, et une prise en main avant de vous laisser avec.',
        ),
        barreDeRappel: false,
        formules: [
          {
            nom: 'Photobooth',
            prix: 'À partir de 170 €',
            note: 'Le tarif dépend du nombre d’impressions.',
            inclus: [
              { texte: 'Photos numériques illimitées' },
              { texte: 'Galerie en ligne à télécharger' },
              { texte: 'Retrait la veille ou livraison' },
              { texte: 'Retour le lendemain de l’événement' },
              { texte: 'Formation à l’utilisation' },
            ],
            boutons: [{ libelle: 'Réserver mon photobooth', lien: '/contact/' }],
          },
          {
            nom: 'Livre d’or audio',
            prix: 'À partir de 50 €',
            note: '60 € seul, 50 € s’il accompagne un photobooth.',
            inclus: [
              { texte: 'Messages audio illimités' },
              { texte: 'Enregistrement de votre annonce d’accueil' },
              { texte: 'Retrait la veille' },
              { texte: 'Retour le lendemain de l’événement' },
              { texte: 'Formation à l’utilisation' },
            ],
            boutons: [{ libelle: 'Réserver mon livre d’or', lien: '/contact/' }],
          },
        ],
      }),
      s('options', {
        entete: {
          texte: 'Les forfaits d’impression',
          niveau: 'h3',
          chapo: chapo('Le photobooth seul livre les fichiers ; les forfaits ci-dessous ajoutent les tirages papier, imprimés pendant la soirée.'),
          apparence: APP_TITRE3,
        },
        options: [
          { nom: 'Numériques seulement', prix: '170 €', texte: 'Photos illimitées, sans impression.' },
          { nom: '200 impressions', prix: '250 €' },
          { nom: '300 impressions', prix: '350 €' },
          { nom: '400 impressions', prix: '400 €', texte: 'Location du livre d’or audio offerte.' },
          { nom: 'Accessoires', prix: '30 €', texte: 'La malle à déguisements.' },
        ],
      }),
      s('texteLibre', {
        entete: { texte: 'Où j’interviens', niveau: 'h2', apparence: APP_TITRE3 },
        texte: texte(
          'Basé en Haute-Loire, je propose la location de photobooth au Puy-en-Velay, à Yssingeaux, à Monistrol-sur-Loire, ainsi que dans la Loire et les environs.',
          'Installation, prise en main et assistance sont prévues : l’idée est que vous profitiez de votre soirée, pas que vous dépanniez une imprimante.',
        ),
        largeur: 'mesure',
      }),
    ],
  };
}

// —————————————————————————————————————————————————————————— Formation
{
  const s = page('form');
  pages.formation = {
    titre: 'Formation photographie',
    metaTitre: 'Formation photo en Haute-Loire et dans la Loire',
    metaDescription:
      'Apprendre à maîtriser son appareil et à construire ses images, avec un photographe professionnel. En petit groupe sur une journée, ou en individuel.',
    metaImage: '@formation-hero-wide',
    sections: [
      heros(s, {
        variante: 'titreDecale',
        image: '@formation-hero-wide',
        surtitres: ['Formation', 'Haute-Loire', 'Loire'],
        titre: 'Votre appareil décide à votre place ?',
        chapo:
          'Des formations accessibles aux débutants et aux amateurs qui veulent comprendre leur matériel, maîtriser les réglages et surtout apprendre à construire une image. En individuel ou en petit groupe.',
        boutons: [{ libelle: 'Demander les prochaines dates', lien: '/contact/' }],
      }),
      s('texteImage', {
        variante: 'imageDroite',
        numero: '01',
        surtitre: 'La méthode',
        titre: { texte: 'De la théorie, oui. Mais surtout de la pratique.', niveau: 'h2', apparence: APP_TITRE },
        texte: texte(
          'Comprendre l’ouverture, la vitesse, les ISO ou la lumière est indispensable. Mais c’est en photographiant que tout devient vraiment clair.',
          'Pendant les formations, nous alternons explications et exercices : utiliser son appareil, comprendre la lumière, construire une image. Je suis là pour vous expliquer, vous faire pratiquer, et corriger avec vous ce qui peut l’être.',
          'Le but n’est pas de vous apprendre une recette toute faite, mais de vous rendre progressivement autonome avec votre appareil. Moins de théorie inutile, davantage de conseils directement applicables à vos propres photos.',
        ),
        image: '@formation-pratique',
      }),
      s('tarifs', {
        entete: entete(
          '02',
          'Les formations',
          'Choisissez celle qui vous correspond.',
          'Découvrir les bases, mieux maîtriser son appareil, ou progresser sur un point précis : en petit groupe, ou en tête à tête.',
        ),
        barreDeRappel: false,
        formules: [
          {
            nom: 'Stage collectif',
            prix: '119 €',
            note: 'Une journée complète.',
            inclus: [
              { texte: 'Comprendre les bases' },
              { texte: 'Pratiquer sur le terrain' },
              { texte: 'Analyser vos images en groupe' },
              { texte: '6 participants maximum' },
              { texte: 'Repas inclus' },
            ],
            boutons: [{ libelle: 'Demander les prochaines dates', lien: '/contact/' }],
          },
          {
            nom: 'Formation individuelle',
            prix: '320 €',
            note: 'Une journée entièrement personnalisée.',
            inclus: [
              { texte: 'Construite autour de votre niveau' },
              { texte: 'Avec votre propre matériel' },
              { texte: 'Sur ce que vous souhaitez apprendre' },
            ],
            boutons: [{ libelle: 'Organiser ma formation', lien: '/contact/' }],
          },
        ],
      }),
    ],
  };
}

// —————————————————————————————————————————————————————————— Tirages d'art
{
  const s = page('tir');
  pages.tirages = {
    titre: 'Tirages d’art',
    metaTitre: 'Photographies d’art en tirage limité',
    metaDescription:
      'Une sélection de photographies de paysages en série limitée à quinze exemplaires, sur papier ou sur aluminium. Du 20 × 30 au 60 × 90 cm.',
    metaImage: '@tirage-lac-bleu',
    sections: [
      heros(s, {
        variante: 'sobre',
        surtitres: ['Tirages d’art', 'Série limitée'],
        titre: 'Faire entrer une image chez vous.',
        chapo:
          'Une sélection de mes photographies de paysages, proposées en tirages d’art — pour celles et ceux qui préfèrent accrocher une image plutôt que la laisser vivre sur un écran.',
      }),
      s('jalons', {
        entete: entete(
          '01',
          'La série',
          'Des photographies pensées pour être imprimées.',
          'Chaque photographie est proposée en série limitée à quinze exemplaires, tous formats et supports confondus.',
        ),
        jalons: [
          {
            image: '@tirage-lac-bleu',
            titre: 'Lac Bleu d’Automne',
            texte:
              'Capturée en automne 2023 au-dessus du lac Bleu, en Haute-Loire. La lumière dorée souligne le contraste entre le lac et les teintes de la forêt.',
          },
          {
            image: '@tirage-ocean',
            titre: 'Océan d’Été',
            texte:
              'Été 2023, Portugal. Vue aérienne d’une plage où l’océan turquoise rejoint le sable doré ; les ombres humaines donnent l’échelle.',
          },
          { image: '@tirage-coucher', titre: 'Coucher d’Été' },
          { image: '@tirage-voiles', titre: 'Toutes voiles dehors' },
          { image: '@tirage-pont-amours', titre: 'Pont des Amours' },
          { image: '@tirage-pont-face', titre: 'Pont d’en face' },
        ],
      }),
      s('supports', {
        titre: { texte: 'Tirage sur aluminium', niveau: 'h3', apparence: APP_TITRE3 },
        supports: [
          { nom: '20 × 30 cm', prix: '100 €' },
          { nom: '30 × 45 cm', prix: '150 €' },
          { nom: '40 × 60 cm', prix: '240 €' },
          { nom: '60 × 90 cm', prix: '499 €' },
        ],
        legende: 'Tirage contrecollé sur Alu Dibond, prêt à accrocher.',
      }),
      s('supports', {
        titre: { texte: 'Tirage papier', niveau: 'h3', apparence: APP_TITRE3 },
        supports: [
          { nom: '20 × 30 cm', prix: '70 €' },
          { nom: '30 × 45 cm', prix: '85 €' },
          { nom: '40 × 60 cm', prix: '120 €' },
          { nom: '60 × 90 cm', prix: '150 €' },
        ],
        legende: 'Encadrement en sus, sur devis.',
      }),
      s('encadre', {
        titre: { texte: 'D’autres œuvres', niveau: 'h3', apparence: APP_TITRE3 },
        texte: texte(
          'Six photographies sont présentées ici. D’autres sont disponibles sur demande, et un format qui ne figure pas dans les grilles se fait sur devis.',
        ),
      }),
    ],
  };
}

// ———————————————————————————————— Écriture ————————————————————————————————

mkdirSync(path.join(racine, 'contenu'), { recursive: true });
writeFileSync(
  path.join(racine, 'contenu/prestations.json'),
  JSON.stringify(pages, null, 2) + '\n',
);

for (const [chemin, { sections }] of Object.entries(pages)) {
  const mots = JSON.stringify(sections).match(/"texte":"[^"]*"/g)?.join(' ').split(/\s+/).length ?? 0;
  console.log(`  /${chemin}/`.padEnd(20) + `${String(sections.length).padStart(2)} sections  ~${mots} mots`);
}
console.log('\n  écrit : contenu/prestations.json');
