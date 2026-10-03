/**
 * Vérifie que chaque classe de module CSS référencée existe vraiment.
 *
 *   node scripts/verifier-styles.mjs
 *
 * Un module CSS se lit `s.maClasse`. Si `.maClasse` n'existe pas dans la
 * feuille, l'expression vaut `undefined`, React n'écrit aucun attribut, et
 * l'élément s'affiche **sans style** — sans erreur, sans avertissement, sans
 * rien dans la console.
 *
 * C'est arrivé : les cartes de la section « Collections » ont perdu leur mise
 * en page le jour où l'accueil est passé du JSX à l'éditeur. Les styles étaient
 * restés dans la feuille de l'ancienne page, que plus rien n'importait. Le
 * numéro, le titre, la description et le lien se suivaient sur une seule ligne
 * sous une image pleine largeur, sur quatre sections du site, et personne ne
 * l'a vu avant que Kevin le signale.
 *
 * La construction ne pouvait pas l'attraper : `undefined` est une valeur
 * parfaitement valide pour `className`. Il fallait un contrôle écrit exprès.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IGNORES = new Set(['node_modules', '.next', '.open-next', '.git', '.cache', '.wrangler']);

const sources = [];
(function parcourir(dossier) {
  for (const nom of readdirSync(dossier)) {
    if (IGNORES.has(nom)) continue;
    const complet = path.join(dossier, nom);
    if (statSync(complet).isDirectory()) parcourir(complet);
    else if (/\.tsx?$/.test(nom)) sources.push(complet);
  }
})(racine);

/** Les noms de classe définis par une feuille, `.maClasse` en début de règle. */
function classesDe(feuille) {
  const texte = readFileSync(feuille, 'utf8');
  const noms = new Set();
  for (const m of texte.matchAll(/(^|[\s,>+~{}])\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) noms.add(m[2]);
  return noms;
}

/**
 * Ce que le contrôle laisse passer, et pourquoi.
 *
 * Quatre éléments du BackOffice s'affichent sans style : la barre de sélection
 * de la médiathèque, son alerte, son bouton de suppression et la boîte
 * d'actions sur un dossier. C'est réel, et c'est relevé ici le 3 octobre 2026
 * plutôt que corrigé à la volée : écrire ces règles demande de décider à quoi
 * ces éléments doivent ressembler, ce qui est un autre travail qu'une
 * correction de mise en page.
 *
 * Retirer une ligne d'ici fait échouer le contrôle tant que la classe n'existe
 * pas. C'est le but : la dette reste visible, et elle ne grossit pas.
 */
const CONNUES = new Set([
  'mediatheque.module.css:barreChoix',
  'mediatheque.module.css:barreAlerte',
  'mediatheque.module.css:barreDanger',
  'mediatheque.module.css:dossierActions',
]);

let references = 0;
const manquantes = [];
const tolerees = [];

for (const source of sources) {
  const code = readFileSync(source, 'utf8');

  for (const [, alias, chemin] of code.matchAll(
    /import\s+(\w+)\s+from\s+['"]([^'"]+\.module\.css)['"]/g,
  )) {
    const feuille = chemin.startsWith('@/')
      ? path.join(racine, chemin.slice(2))
      : path.resolve(path.dirname(source), chemin);

    if (!sources.length || !readFileSync) continue;
    let definies;
    try {
      definies = classesDe(feuille);
    } catch {
      manquantes.push({ source, feuille: chemin, classe: '(feuille introuvable)' });
      continue;
    }

    // Un alias d'une seule lettre peut être masqué par une variable de boucle :
    // dans `(p, i) => p.texte`, `p` est l'élément parcouru, pas la feuille
    // importée sous ce nom. On écarte l'alias dès qu'il sert aussi de paramètre
    // quelque part dans le fichier — mieux vaut un contrôle muet qu'un contrôle
    // qui crie à tort, parce qu'on finit par ne plus l'écouter.
    const masque = new RegExp(`\\(\\s*${alias}\\s*[,)]`).test(code);
    if (masque) continue;

    // `alias.maClasse`, mais pas `alias.maClasse(` qui serait un appel.
    const motif = new RegExp(`\\b${alias}\\.([a-zA-Z_][a-zA-Z0-9_]*)\\b(?!\\s*\\()`, 'g');
    for (const [, classe] of code.matchAll(motif)) {
      references += 1;
      if (definies.has(classe)) continue;
      const cle = `${path.basename(feuille)}:${classe}`;
      if (CONNUES.has(cle)) tolerees.push(cle);
      else manquantes.push({ source: path.relative(racine, source), feuille: chemin, classe });
    }
  }
}

if (manquantes.length) {
  console.error(`\n${manquantes.length} classe(s) référencée(s) mais absente(s) :\n`);
  for (const m of manquantes) {
    console.error(`  ${m.source}`);
    console.error(`    ${m.feuille} → .${m.classe}\n`);
  }
  console.error(
    'Une classe absente ne lève aucune erreur : l’élément s’affiche sans style.\n',
  );
  process.exit(1);
}

console.log(`${references} classes de modules CSS référencées, toutes définies.`);
if (tolerees.length) {
  console.log(
    `${new Set(tolerees).size} manquante(s) connue(s) et tolérée(s) — voir CONNUES, en tête de ce fichier.`,
  );
}
