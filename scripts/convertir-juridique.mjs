/**
 * Fait entrer les pages juridiques de l'ancien site dans l'éditeur.
 *
 * L'ancien site portait trois documents écrits avec soin : des mentions
 * légales complètes, une politique de confidentialité en dix-neuf points, et
 * des conditions générales de vente de vingt-sept articles — neuf mille mots
 * qui couvrent l'annulation d'un mariage, les iris d'animaux, les mineurs, les
 * fichiers RAW. Le nouveau site n'en avait que des résumés d'une page.
 *
 * Un résumé ne protège pas. C'est ce texte-là qu'il faut reprendre.
 *
 *   node scripts/convertir-juridique.mjs
 *
 * Outil à usage unique, et **local** : il lit `.cache/ancien/*.part.html`, qui
 * n'est pas versionné. Ce qu'il produit l'est : `contenu/juridique.json` se
 * relit, se compare, et c'est lui que `npm run juridique` pose en base.
 *
 * Deux conséquences de ce découpage, et c'est pour elles qu'il existe :
 * la conversion ne touche jamais la base, et ce qui partira en production a
 * été relu sous sa forme définitive.
 *
 * L'éditeur du BackOffice ne stocke aucun HTML — le texte y vit sous forme de
 * fragments décrits, voir `lib/texteRiche.ts`. La conversion est donc une
 * traduction, pas une copie.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// —————————————————————————— Écriture du texte riche ——————————————————————————

const frag = (f) => (typeof f === 'string' ? { texte: f } : f);
const p = (...fs) => ({ type: 'paragraphe', fragments: fs.map(frag) });
const puce = (...fs) => ({ type: 'liste', fragments: fs.map(frag) });
const gras = (texte) => ({ texte, gras: true });
const lien = (texte, lien) => ({ texte, lien });

// ——————————————————————————————— Corrections ———————————————————————————————

/**
 * Ce qui a changé depuis que ces textes ont été écrits.
 *
 * Appliquées au HTML avant découpage, donc valables où que la mention
 * apparaisse — et elles apparaissent à plusieurs endroits : le siège social
 * est répété dans les mentions, dans la politique de confidentialité et à
 * l'article 1 des CGV.
 *
 * **`kevin@dronezvous.com` n'est pas corrigée.** Le domaine s'éteint comme
 * adresse de site, mais la boîte reste chez Hostinger et reste celle de Kevin.
 * La remplacer couperait le seul moyen de le joindre qui figure sur ces pages.
 */
const CORRECTIONS = [
  // Le siège a déménagé. L'ancienne adresse figurait encore partout.
  [
    /13\s*place du Coudert\s*,?\s*(<[^>]+>\s*)*43130\s*Solignac-sous-Roche/gi,
    '7 avenue Charles Dupuy, 43000 Le Puy-en-Velay',
  ],
  [/13\s*place du Coudert/gi, '7 avenue Charles Dupuy'],
  [/43130\s*Solignac-sous-Roche/gi, '43000 Le Puy-en-Velay'],
  // Relevée sur la page de réservation SumUp, et fausse aussi.
  [/14\s*avenue Foch/gi, '7 avenue Charles Dupuy'],

  // Le gras de l'ancien site s'arrêtait avant le dernier chiffre du SIRET, qui
  // s'affichait « 904 158 284 0002 » puis « 9 » en maigre. Les quatorze
  // chiffres sont bons ; c'est le balisage qui coupe au mauvais endroit.
  [/904 158 284 0002<\/strong>\s*9/g, '904 158 284 00029</strong>'],
  [/904 158 284 0002 9/g, '904 158 284 00029'],

  // L'ancien site écrivait le nom de famille en capitales — la convention des
  // actes — mais la fiche d'identité, elle, le tire de `lib/site.ts` et écrit
  // « Kevin Machy ». Les deux graphies se croisaient sur la même page. Celle du
  // site gagne : la portée juridique est la même, la page se lit d'une voix.
  [/Kevin MACHY/g, 'Kevin Machy'],
  [/M\. Dominique COULON/g, 'M. Dominique Coulon'],

  // Ce document est modifié aujourd'hui : siège social, hébergeur, cookies.
  // Laisser la date d'avant laisserait croire que rien n'a bougé.
  [/Dernière mise à jour\s*:\s*[^.<]*\./gi, 'Dernière mise à jour : octobre 2026.'],

  // Le site a changé d'adresse ; la boîte mail, non.
  [/Site internet\s*:\s*dronezvous\.com/gi, 'Site internet : kevinmachy.fr'],
  [/\bhttps?:\/\/(www\.)?dronezvous\.com\b/gi, 'https://kevinmachy.fr'],

  // L'ancien site affichait « kevin@dronezvous.com » sur un lien qui écrivait
  // à « contact@ ». La bonne adresse est celle affichée — c'est elle que
  // `lib/site.ts` porte, et celle que le pied de page donne.
  [/mailto:contact@dronezvous\.com/gi, 'mailto:kevin@dronezvous.com'],

  // L'ancien site renvoyait vers une « Politique de cookies » qui décrivait
  // cent huit cookies. Ce site n'en dépose aucun : cette page n'est pas
  // reprise, et les renvois vers elle mèneraient nulle part.
  [
    /(dans|à) la Politique de cookies accessible sur le site/gi,
    'dans la politique de confidentialité accessible sur le site',
  ],
  [
    /Les durées de conservation des cookies et traceurs sont précisées dans la Politique de cookies ou dans l’outil de gestion du consentement utilisé sur le site\.?/gi,
    'Ce site ne déposant aucun cookie, aucune durée de conservation de traceur n’est à indiquer.',
  ],
  [
    /Les informations détaillées concernant les cookies utilisés sont disponibles dans la Politique de cookies\.?/gi,
    '',
  ],
  // La base juridique du consentement ne vaut plus que pour les photographies :
  // laisser les cookies dans cette phrase contredirait la rubrique 17, qui dit
  // qu'il n'y en a aucun.
  [
    /lorsque celui-ci est nécessaire, notamment pour certaines utilisations de photographies à des fins de communication ou pour certains cookies et traceurs\.?/gi,
    'lorsque celui-ci est nécessaire, notamment pour certaines utilisations de photographies à des fins de communication.',
  ],
];

// ——————————————————————————————— Lecture HTML ———————————————————————————————

const entites = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8217;|&rsquo;|&#039;|&apos;/g, '’')
    .replace(/&#8216;|&lsquo;/g, '‘')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8230;|&hellip;/g, '…')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&icirc;/g, 'î')
    .replace(/&#8364;|&euro;/g, '€')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

/** Un morceau de HTML en ligne → une suite de fragments décrits. */
function fragments(html) {
  const sortie = [];
  const re = /<(a|strong|b|em|i)\b([^>]*)>([\s\S]*?)<\/\1>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      const t = entites(m[4]).replace(/\s+/g, ' ');
      if (t.trim() || (sortie.length && t === ' ')) sortie.push({ texte: t });
      continue;
    }
    const balise = m[1].toLowerCase();
    const interieur = entites(m[3].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
    if (!interieur.trim()) continue;
    const f = { texte: interieur };
    if (balise === 'strong' || balise === 'b') f.gras = true;
    if (balise === 'em' || balise === 'i') f.italique = true;
    // Le `href` de la balise elle-même, ou celui d'un lien qu'elle enveloppe :
    // l'ancien site écrit `<strong><a href="mailto:…">…</a></strong>`, et sans
    // ce second cas l'adresse de courriel perdait son lien en silence.
    const href = (m[2].match(/href=["']([^"']+)["']/) ||
      m[3].match(/href=["']([^"']+)["']/) ||
      [])[1];
    // Seuls les schémas que l'éditeur accepte à l'enregistrement.
    if (href && /^(https?:|mailto:|tel:|\/)/i.test(href)) f.lien = href;
    sortie.push(f);
  }
  // Les espaces de bord sont des artefacts de l'indentation du HTML.
  while (sortie.length && !sortie[0].texte.trim()) sortie.shift();
  while (sortie.length && !sortie[sortie.length - 1].texte.trim()) sortie.pop();
  return sortie;
}

/**
 * Un paragraphe coupé par des `<br>` → un ou plusieurs paragraphes recousus.
 *
 * Le texte riche de l'éditeur n'a pas de retour à la ligne, et c'est voulu : un
 * document y est une suite de blocs, parce qu'un retour à la ligne est une
 * décision de mise en page, pas de contenu. Or l'ancien site écrit ses adresses
 * postales en une balise coupée par des `<br>`. Les ignorer collerait
 * « 7 avenue Charles Dupuy43000 Le Puy-en-Velay » ; en faire un paragraphe
 * chacun étire une adresse sur quatre interlignes.
 *
 * Les vingt-huit cas des deux documents se rangent en deux familles :
 *
 * - **une étiquette, puis sa valeur** — « Siège social : » et l'adresse,
 *   « Consentement : » et sa définition, « Date : » et les pointillés du
 *   formulaire de rétractation. Les recoller donne la phrase que l'auteur a
 *   écrite ;
 * - **un bloc d'adresse ou d'identité** — nom, rue, code postal, pays, ou les
 *   parties au contrat à l'article 1 des CGV. Une ligne par élément, et c'est
 *   ainsi qu'une adresse s'écrit.
 *
 * D'où la règle : on recolle après un deux-points, jamais ailleurs. Essayé
 * autrement — en recollant à la virgule — l'article 1 des CGV devenait un
 * paragraphe de six lignes où « Ci-après dénommé » suivait une virgule.
 */
function recoudre(html) {
  const sorties = [];
  for (const part of html.split(/<br\s*\/?>/i)) {
    const f = fragments(part);
    if (!f.length) continue;
    const precedent = sorties[sorties.length - 1];
    const fin = precedent?.[precedent.length - 1]?.texte.trim().slice(-1);
    if (fin === ':') precedent.push({ texte: ' ' }, ...f);
    else sorties.push(f);
  }
  return sorties;
}

/**
 * Le corps d'une page → une suite plate de titres et de blocs.
 *
 * Les titres gardent leur niveau : c'est lui qui dira, plus bas, lesquels
 * ouvrent une rubrique et lesquels restent dedans.
 */
function aplatir(html) {
  const corps = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  const blocs = [];
  const re = /<(h[1-6]|p|ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(corps))) {
    const balise = m[1].toLowerCase();
    const interieur = m[2];

    if (balise === 'ul' || balise === 'ol') {
      const type = balise === 'ol' ? 'listeNumerotee' : 'liste';
      for (const li of interieur.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
        const f = fragments(li[1].replace(/<br\s*\/?>/gi, ' '));
        if (f.length) blocs.push({ type, fragments: f });
      }
      continue;
    }

    if (balise === 'p') {
      for (const f of recoudre(interieur)) blocs.push({ type: 'paragraphe', fragments: f });
      continue;
    }

    const titre = entites(interieur.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
    if (titre) blocs.push({ niveau: Number(balise[1]), titre });
  }
  return blocs;
}

/**
 * Ce que l'ancien site ajoutait au bas de chaque page juridique.
 *
 * Deux appels à l'action et le texte du pied. Le nouveau site les porte
 * ailleurs : repris ici, ils feraient doublon au milieu d'un document légal.
 */
const APPELS = ['Découvrez mon univers', 'On parle de votre projet ?'];

/** Coupe la suite de blocs au premier titre de la liste. */
function couper(blocs, titres) {
  const i = blocs.findIndex((b) => b.titre && titres.includes(b.titre));
  return i === -1 ? blocs : blocs.slice(0, i);
}

// —————————————————————————————— Les rubriques ——————————————————————————————

/**
 * Regroupe une suite plate en rubriques : un `h2` en ouvre une, le reste y
 * tombe. Un `h3` devient un paragraphe en gras — l'éditeur n'a que trois
 * niveaux de titre, et une rubrique par sous-article donnerait cent dix
 * sections pour les seules CGV.
 */
function rubriques(blocs) {
  const out = [];
  let courante = null;
  for (const b of blocs) {
    if (b.niveau === 1) continue; // le titre de page, porté par l'ouverture
    if (b.niveau === 2) {
      courante = { titre: b.titre, blocs: [] };
      out.push(courante);
      continue;
    }
    if (!courante) continue; // rien avant la première rubrique
    courante.blocs.push(b.titre ? p(gras(b.titre)) : b);
  }
  return out;
}

// ———————————————————————————————— Le plan ————————————————————————————————

/**
 * Ce que devient chaque rubrique de l'ancien site.
 *
 * Par défaut : reprise à l'identique. Les exceptions sont ici, nommées, avec
 * leur raison — c'est la partie de ce fichier qui mérite d'être relue.
 *
 * - `ecarter` : la rubrique disparaît du texte, parce qu'une autre partie du
 *   site la porte mieux.
 * - `{ titre, blocs }` : la rubrique est réécrite, parce que le texte d'origine
 *   serait faux sur ce site.
 */
const PLAN = {
  'mentions-legales': {
    source: 'mentions',
    cle: 'ml',
    titre: 'Mentions légales',
    // Première page du document : les mentions s'arrêtent là où commence la
    // politique de confidentialité, qui est une page à part sur ce site.
    jusqua: 'Politique de confidentialité',
    ouverture: p(
      'Ces informations sont publiées en application de la loi du 21 juin 2004 pour la confiance dans l’économie numérique. Elles disent qui édite ce site, qui l’héberge, et à qui s’adresser.',
    ),
    // La fiche d'identité est une section du catalogue, pas du texte : elle
    // lit les Paramètres. Kevin corrige un numéro de téléphone sans toucher
    // à une ligne de ce document.
    fiche: 'Qui édite ce site',
    rubriques: {
      // Nom, SIRET, adresse, téléphone, courriel et directeur de publication
      // sont exactement les lignes de la fiche. Ne restent ici que les deux
      // numéros qu'elle ne porte pas.
      'Éditeur du site': {
        titre: 'Immatriculation',
        blocs: [
          p(gras('SIREN :'), ' 904 158 284'),
          p(gras('RCS :'), ' Immatriculé au registre du commerce et des sociétés du Puy-en-Velay'),
        ],
      },
      // L'ancien texte nommait IONOS. Le site n'y est plus, et il n'est plus
      // chez un seul hébergeur : les pages sont servies par un Worker
      // Cloudflare, tandis que les photographies et la base de données qui
      // porte tout le texte du site restent chez Hostinger. Les deux comptent.
      //
      // Adresses vérifiées à la source : les conditions d'utilisation de
      // Cloudflare pour la première, l'Impressum allemand de Hostinger — une
      // mention obligatoire, donc tenue à jour — pour la seconde.
      Hébergement: {
        titre: 'Hébergement',
        blocs: [
          p(
            'Les pages de ce site sont hébergées par ',
            gras('Cloudflare, Inc.'),
            ' — 101 Townsend Street, San Francisco, CA 94107, États-Unis.',
          ),
          p(
            'Les photographies et la base de données qui porte le contenu du site sont hébergées par ',
            gras('HOSTINGER operations, UAB'),
            ' — Švitrigailos str. 34, Vilnius 03230, Lituanie.',
          ),
        ],
      },
      // L'ancien texte annonçait des cookies, une mesure d'audience tierce et
      // un outil de gestion du consentement. Ce site n'a aucun des trois :
      // reprendre ce paragraphe publierait une déclaration fausse.
      Cookies: {
        titre: 'Cookies',
        blocs: [
          p(
            'Ce site ne dépose aucun cookie et n’installe aucun traceur publicitaire. Il n’a donc pas de bandeau de consentement à afficher : il n’y a rien à accepter ni à refuser.',
          ),
          p(
            'La fréquentation est mesurée sans cookie et sans conserver d’adresse IP. Le détail de ce traitement figure dans la ',
            lien('politique de confidentialité', '/politique-de-confidentialite/'),
            '.',
          ),
        ],
      },
    },
  },

  'politique-de-confidentialite': {
    source: 'mentions',
    cle: 'pc',
    // Seconde page du même document d'origine.
    depuis: 'Politique de confidentialité',
    titre: 'Politique de confidentialité',
    ouverture: p(
      'Ce site collecte le strict nécessaire, et rien d’autre. Aucun cookie n’y est déposé, aucun traceur publicitaire n’y est installé, et aucune donnée n’est revendue ni transmise à des tiers à des fins commerciales.',
    ),
    // La fiche **est** la rubrique 1 : son contenu est, au mot près, celui que
    // l'ancien site y écrivait. Elle en prend donc le numéro, sans quoi le
    // document commencerait à « 2 — Objet de la politique » et donnerait
    // l'impression qu'une rubrique a été perdue.
    fiche: '1 — Responsable du traitement',
    rubriques: {
      // Mêmes lignes que la fiche, au mot près.
      '1 — Responsable du traitement': 'ecarter',
      // Même raison que la rubrique « Cookies » des mentions : l'ancien texte
      // décrivait un outil de consentement qui n'existe pas ici.
      '17 — Cookies et traceurs': {
        titre: '17 — Cookies et traceurs',
        blocs: [
          p('Ce site ne dépose aucun cookie, pas même un cookie dit « strictement nécessaire ».'),
          p(
            'La fréquentation est mesurée côté serveur. Le visiteur est reconnu dans la journée par une empreinte calculée à la volée à partir de son adresse, de son navigateur et d’un secret du serveur. Cette empreinte ne se stocke jamais en clair, l’adresse IP n’entre pas en base, et le calcul change chaque nuit : elle ne suit personne d’un jour à l’autre.',
          ),
          p(
            'Aucun consentement n’est donc demandé, et aucun outil de gestion des préférences n’est installé — il n’y a pas de préférence à gérer.',
          ),
          p(
            'Le BackOffice, réservé à l’éditeur du site, utilise un cookie de session nécessaire à la connexion. Il ne concerne pas les visiteurs.',
          ),
        ],
      },
    },
  },

  'conditions-generales-de-vente': {
    source: 'cgv',
    cle: 'cgv',
    titre: 'Conditions générales de vente',
    ouverture: p(
      'Ces conditions régissent les prestations photographiques et les ventes réalisées par Kevin Machy. Elles sont acceptées à la réservation, à la signature d’un devis ou à la validation d’une commande.',
    ),
    // Les CGV portent l'identité du prestataire à leur article 1 — nom, SIREN,
    // SIRET, RCS, siège social. La fiche ferait doublon trois lignes plus bas.
    fiche: null,
    rubriques: {},
  },
};

// ———————————————————————————————— Conversion ————————————————————————————————

/** Une rubrique → une section `texteLibre` du catalogue. */
function section(cle, titre, blocs, niveau) {
  return {
    cle,
    type: 'texteLibre',
    valeurs: {
      ...(titre
        ? {
            entete: {
              texte: titre,
              niveau,
              apparence: { police: 'titre', taille: niveau === 'h1' ? 'titre2' : 'titre3', couleur: 'encre' },
            },
          }
        : {}),
      texte: {
        contenu: blocs,
        apparence: { police: 'texte', taille: 'corps', couleur: 'encreAttenuee' },
      },
      largeur: 'mesure',
      reglages: { fond: 'noir', espacement: 'serre' },
    },
  };
}

const sourcesLues = new Map();
function lire(nom) {
  if (!sourcesLues.has(nom)) {
    let html = readFileSync(path.join(racine, '.cache/ancien', `${nom}.part.html`), 'utf8');
    for (const [de, vers] of CORRECTIONS) html = html.replace(de, vers);
    sourcesLues.set(nom, couper(aplatir(html), APPELS));
  }
  return sourcesLues.get(nom);
}

const resultat = {};
let alertes = 0;

for (const [chemin, plan] of Object.entries(PLAN)) {
  let blocs = lire(plan.source);

  // Un même fichier d'origine porte deux pages du nouveau site : on garde la
  // tranche délimitée par les titres de niveau 1.
  const borne = (t) => blocs.findIndex((b) => b.niveau === 1 && b.titre.includes(t));
  if (plan.depuis) blocs = blocs.slice(borne(plan.depuis));
  if (plan.jusqua) {
    const i = borne(plan.jusqua);
    if (i !== -1) blocs = blocs.slice(0, i);
  }

  const sections = [section(`${plan.cle}-1`, plan.titre, [plan.ouverture], 'h1')];
  let n = 2;
  if (plan.fiche) {
    sections.push({
      cle: `${plan.cle}-${n++}`,
      type: 'identiteEntreprise',
      valeurs: {
        entete: {
          texte: plan.fiche,
          niveau: 'h2',
          apparence: { police: 'titre', taille: 'titre3', couleur: 'encre' },
        },
        reglages: { fond: 'noir', espacement: 'serre' },
      },
    });
  }

  const vues = new Set();
  for (const r of rubriques(blocs)) {
    vues.add(r.titre);
    const regle = plan.rubriques[r.titre];
    if (regle === 'ecarter') continue;
    const titre = regle ? regle.titre : r.titre;
    const contenu = regle ? regle.blocs : r.blocs;
    if (!contenu.length) {
      console.error(`  ! /${chemin}/ « ${titre} » est vide`);
      alertes += 1;
      continue;
    }
    sections.push(section(`${plan.cle}-${n++}`, titre, contenu, 'h2'));
  }

  // Une règle qui ne correspond à aucune rubrique, c'est un titre qui a changé
  // dans la source : la correction ne s'applique plus, et personne ne le voit.
  for (const titre of Object.keys(plan.rubriques)) {
    if (!vues.has(titre)) {
      console.error(`  ! /${chemin}/ la règle « ${titre} » ne correspond à aucune rubrique`);
      alertes += 1;
    }
  }

  const mots = JSON.stringify(sections).match(/"texte":"[^"]*"/g)?.join(' ').split(/\s+/).length ?? 0;
  resultat[chemin] = { titre: plan.titre, sections };
  console.log(`  ${chemin.padEnd(32)} ${String(sections.length).padStart(3)} sections  ~${mots} mots`);
}

mkdirSync(path.join(racine, 'contenu'), { recursive: true });
writeFileSync(
  path.join(racine, 'contenu/juridique.json'),
  JSON.stringify(resultat, null, 2) + '\n',
);
console.log('\n  écrit : contenu/juridique.json');
if (alertes) {
  console.error(`\n  ${alertes} alerte(s) ci-dessus. À relire avant de poser en base.`);
  process.exitCode = 1;
}
