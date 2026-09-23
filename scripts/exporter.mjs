/**
 * Construit la vitrine en fichiers statiques.
 *
 * Une seule application porte le site public et le BackOffice. Le premier peut
 * devenir du HTML figé ; le second a besoin d'un serveur, d'une base et d'une
 * session — il ne s'exporte pas. Or `output: 'export'` refuse de construire si
 * une seule route du projet lui résiste.
 *
 * D'où ce détour : les parties qui exigent un serveur sont **écartées le temps
 * de la construction**, puis remises. Elles sont déplacées, jamais copiées ni
 * modifiées, et le `finally` les remet en place même si la construction échoue
 * ou si l'on interrompt au clavier. En cas de coupure brutale, elles attendent
 * dans `.export-retire/` et `npm run exporter` les récupère au démarrage.
 *
 *   npm run exporter
 *
 * Le résultat atterrit dans `out/`.
 */
import {
  existsSync, mkdirSync, renameSync, rmSync, readdirSync, copyFileSync, readFileSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abri = path.join(racine, '.export-retire');

/** Ce qui exige un serveur, et n'a donc rien à faire dans une vitrine figée. */
const A_ECARTER = [
  path.join('app', '(backoffice)'), // éditeur, médiathèque, réglages, aperçu
  path.join('app', 'api'), // la collecte de mesure, qui répond en POST
  path.join('app', 'medias'), // le service des fichiers, remplacé par de vrais fichiers
];

/**
 * Une ligne doit différer entre les deux constructions.
 *
 * `dynamicParams` décide du sort d'une adresse absente du pré-rendu : rendue à
 * la demande côté serveur, introuvable en statique. Next veut un booléen écrit
 * en toutes lettres — ni variable, ni condition. Le fichier est donc mis à
 * l'abri, retouché, puis remis à l'identique.
 */
const RETOUCHES = [
  {
    fichier: path.join('app', '(frontend)', '[...chemin]', 'page.tsx'),
    de: 'export const dynamicParams = true;',
    vers: 'export const dynamicParams = false;',
  },
];

const deplacer = (de, vers) => {
  mkdirSync(path.dirname(vers), { recursive: true });
  renameSync(de, vers);
};

/**
 * Next écrit les charges de navigation en dossiers ; le navigateur les demande
 * à plat.
 *
 * Suivre un lien du menu ne recharge pas la page : Next va chercher
 * `…/__next.X.Y.__PAGE__.txt`. L'export, lui, pose `…/__next.X/Y/__PAGE__.txt`
 * — mêmes segments, séparateur différent. Sans ce doublage, chaque
 * préchargement répond 404, la navigation retombe sur un rechargement complet,
 * et la console se remplit d'erreurs qui n'en sont pas.
 *
 * On copie au lieu de déplacer : la forme en dossiers sert aux hébergeurs qui
 * réécrivent les points en barres obliques.
 */
function aplatirCharges(sortie) {
  let poses = 0;

  const fichiersDe = (dossier, prefixe = '') => {
    const trouves = [];
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const relatif = path.join(prefixe, e.name);
      if (e.isDirectory()) trouves.push(...fichiersDe(path.join(dossier, e.name), relatif));
      else trouves.push(relatif);
    }
    return trouves;
  };

  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const chemin = path.join(dossier, e.name);
      if (e.name.startsWith('__next.')) {
        for (const relatif of fichiersDe(chemin)) {
          const plat = `${e.name}.${relatif.split(path.sep).join('.')}`;
          copyFileSync(path.join(chemin, relatif), path.join(dossier, plat));
          poses++;
        }
      }
      parcourir(chemin);
    }
  };

  parcourir(sortie);
  return poses;
}

/** Remet ce qu'une exécution interrompue aurait laissé de côté. */
function recuperer() {
  if (!existsSync(abri)) return;
  for (const relatif of A_ECARTER) {
    const garde = path.join(abri, relatif);
    const place = path.join(racine, relatif);
    if (existsSync(garde) && !existsSync(place)) {
      console.log(`  récupéré : ${relatif}`);
      deplacer(garde, place);
    }
  }
  for (const { fichier } of RETOUCHES) {
    const garde = path.join(abri, fichier);
    if (existsSync(garde)) {
      console.log(`  récupéré : ${fichier}`);
      deplacer(garde, path.join(racine, fichier));
    }
  }
  if (readdirSync(abri).length === 0) rmSync(abri, { recursive: true, force: true });
}

recuperer();

// Les types engendrés par `next dev` décrivent encore le BackOffice, que
// `tsconfig.json` ramasse explicitement. Laissés là, ils font échouer la
// vérification sur des routes qu'on vient d'écarter. Ils se régénèrent seuls.
rmSync(path.join(racine, '.next', 'dev', 'types'), { recursive: true, force: true });

const ecartes = [];
const retouches = [];
try {
  for (const relatif of A_ECARTER) {
    const place = path.join(racine, relatif);
    if (!existsSync(place)) continue;
    deplacer(place, path.join(abri, relatif));
    ecartes.push(relatif);
  }
  for (const { fichier, de, vers } of RETOUCHES) {
    const place = path.join(racine, fichier);
    const contenu = readFileSync(place, 'utf8');
    // Si la ligne a bougé, on s'arrête net : une retouche appliquée de travers
    // produirait une vitrine fausse sans rien dire.
    if (!contenu.includes(de)) {
      throw new Error(`${fichier} : la ligne à retoucher a changé.\n  attendu : ${de}`);
    }
    mkdirSync(path.dirname(path.join(abri, fichier)), { recursive: true });
    copyFileSync(place, path.join(abri, fichier));
    writeFileSync(place, contenu.replace(de, vers));
    retouches.push(fichier);
  }

  console.log(`Écarté   : ${ecartes.join(', ')}`);
  console.log(`Retouché : ${retouches.join(', ')}\n`);

  const r = spawnSync('npx', ['next', 'build'], {
    cwd: racine,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, EXPORT_STATIQUE: '1' },
  });
  if (r.status !== 0) {
    process.exitCode = r.status ?? 1;
  } else {
    // `distDir` détourne aussi la sortie de l'export : le site atterrit dans
    // `.next-statique/`, à côté des rouages de construction. On le remet à
    // l'endroit convenu, et on efface ce qu'une exécution précédente y avait
    // laissé — une page supprimée dans l'éditeur ne doit pas survivre dans un
    // ancien fichier.
    const sortie = path.join(racine, 'out');
    rmSync(sortie, { recursive: true, force: true });
    renameSync(path.join(racine, '.next-statique'), sortie);
    const doubles = aplatirCharges(sortie);
    console.log(`\nVitrine écrite dans out/ (${doubles} charges de navigation aplaties)`);
  }
} finally {
  for (const fichier of retouches) {
    const garde = path.join(abri, fichier);
    if (existsSync(garde)) deplacer(garde, path.join(racine, fichier));
  }
  for (const relatif of ecartes.reverse()) {
    const garde = path.join(abri, relatif);
    if (existsSync(garde)) deplacer(garde, path.join(racine, relatif));
  }
  if (existsSync(abri) && readdirSync(abri).length === 0) {
    rmSync(abri, { recursive: true, force: true });
  }
  console.log('\nParties serveur remises en place.');
}
