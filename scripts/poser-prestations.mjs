/**
 * Pose les pages de prestations en base, et les crée si elles n'existent pas.
 *
 *   npm run prestations                 pose les pages
 *   npm run prestations -- --verifier   dit ce qui manque, sans rien écrire
 *
 * `contenu/prestations.json` est produit par `convertir-prestations.mjs`,
 * versionné et relu. Ce script-ci ne décide de rien : il écrit ce que ce
 * fichier contient.
 *
 * Il diffère de `poser-juridique.mjs` sur un point qui justifie un second
 * script plutôt qu'un paramètre : ces six pages **n'existent pas encore**. Il
 * les crée, leur pose leurs métadonnées de référencement, et les publie.
 *
 * ---
 *
 * **Les images se désignent par leur nom d'emplacement, préfixé d'une
 * arobase.** `"@ent-hero-wide"` devient l'identifiant que la médiathèque donne
 * à cet emplacement dans *cette* base. Les identifiants ne sont pas les mêmes
 * en développement et en production : les écrire dans le fichier versionné
 * aurait produit des pages qui affichent les bonnes images ici et n'importe
 * lesquelles là-bas.
 *
 * Un nom introuvable arrête le script. C'est voulu : poser une page dont les
 * images manquent donnerait des cadres nommés en production, et personne ne
 * saurait que c'est un accident plutôt qu'une photo que Kevin doit livrer.
 *
 * Même garde-fou que pour les pages juridiques : une page dont un brouillon
 * est en cours est laissée tranquille.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  for (const ligne of readFileSync(path.join(racine, '.env'), 'utf8').split('\n')) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  // Pas de .env : les variables viennent peut-être de l'environnement.
}

if (!process.env.DATABASE_URI) {
  console.error('DATABASE_URI est absent. Voir .env.exemple.');
  process.exit(1);
}

const verifier = process.argv.includes('--verifier');
const pages = JSON.parse(readFileSync(path.join(racine, 'contenu/prestations.json'), 'utf8'));

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

// ———————————————————————————— Les images, par leur nom ————————————————————————————

const [medias] = await connexion.query('SELECT id, fichier FROM medias');
const parNom = new Map();
for (const m of medias) {
  const nom = (String(m.fichier).match(/^\/img\/(.+)-\d+\.webp$/) || [])[1];
  if (nom) parNom.set(nom, m.id);
}

const introuvables = new Set();

/** Remplace chaque `"@emplacement"` par l'identifiant du média correspondant. */
function resoudre(valeur) {
  if (typeof valeur === 'string') {
    if (!valeur.startsWith('@')) return valeur;
    const nom = valeur.slice(1);
    const id = parNom.get(nom);
    if (id === undefined) introuvables.add(nom);
    return id ?? valeur;
  }
  if (Array.isArray(valeur)) return valeur.map(resoudre);
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(Object.entries(valeur).map(([c, v]) => [c, resoudre(v)]));
  }
  return valeur;
}

const resolues = Object.fromEntries(
  Object.entries(pages).map(([chemin, p]) => [chemin, resoudre(p)]),
);

if (introuvables.size) {
  console.error(`\n  ${introuvables.size} emplacement(s) absent(s) de la médiathèque :`);
  for (const nom of introuvables) console.error(`    ${nom}`);
  console.error('\n  Lancer d’abord : npm run images && npm run importer-images\n');
  await connexion.end();
  process.exit(1);
}

// ———————————————————————————————— Les pages ————————————————————————————————

const aFaire = [];
let posees = 0;

for (const [chemin, p] of Object.entries(resolues)) {
  const [lignes] = await connexion.query(
    'SELECT id, titre, sections, brouillon, meta_titre, meta_description, meta_image FROM pages WHERE chemin = ?',
    [chemin],
  );

  const attendu = JSON.stringify(p.sections);
  const metaImage = p.metaImage ? String(p.metaImage) : null;

  if (!lignes.length) {
    aFaire.push(`/${chemin}/ à créer — ${p.sections.length} sections`);
    if (verifier) continue;
    await connexion.query(
      `INSERT INTO pages (chemin, titre, statut, sections, meta_titre, meta_description, meta_image, publie_le)
       VALUES (?, ?, 'publie', ?, ?, ?, ?, now())`,
      [chemin, p.titre, attendu, p.metaTitre ?? null, p.metaDescription ?? null, metaImage],
    );
    console.log(`  créée          /${chemin}/  ${p.sections.length} sections`);
    posees += 1;
    continue;
  }

  const page = lignes[0];
  const actuel = JSON.stringify(
    typeof page.sections === 'string' ? JSON.parse(page.sections) : page.sections,
  );
  const metaÀJour =
    page.titre === p.titre &&
    page.meta_titre === (p.metaTitre ?? null) &&
    page.meta_description === (p.metaDescription ?? null) &&
    String(page.meta_image ?? '') === String(metaImage ?? '');

  if (actuel === attendu && metaÀJour) {
    console.log(`  déjà en place  /${chemin}/  ${p.sections.length} sections`);
    continue;
  }

  if (page.brouillon) {
    console.error(
      `  ! /${chemin}/ a un brouillon en cours : laissée telle quelle.\n` +
        '    Publier ou abandonner le brouillon dans le BackOffice, puis relancer.',
    );
    process.exitCode = 1;
    continue;
  }

  aFaire.push(`/${chemin}/ à mettre à jour — ${p.sections.length} sections`);
  if (verifier) continue;

  await connexion.query(
    `UPDATE pages SET titre = ?, sections = ?, brouillon = NULL, statut = 'publie',
                      meta_titre = ?, meta_description = ?, meta_image = ?,
                      publie_le = now(), modifie_le = now()
       WHERE id = ?`,
    [p.titre, attendu, p.metaTitre ?? null, p.metaDescription ?? null, metaImage, page.id],
  );
  console.log(`  posée          /${chemin}/  ${p.sections.length} sections`);
  posees += 1;
}

// ———————————————————————————— La barre et le pied ————————————————————————————

/**
 * Six pages qu'aucun lien n'atteint ne servent à rien.
 *
 * La barre de navigation et le pied vivent dans les réglages, avec `NAV` comme
 * repli. Modifier `lib/site.ts` suffit tant que personne n'a enregistré la
 * barre depuis le BackOffice ; sinon la valeur de la base gagne, et les pages
 * restent invisibles.
 *
 * On **insère** l'entrée plutôt que de réécrire le menu : Kevin a pu le
 * réordonner ou renommer une entrée, et ce travail-là lui appartient.
 */
const ENTREE = { chemin: 'prestations', libelle: 'Prestations' };

async function inserer(cle, chemin) {
  const [lignes] = await connexion.query('SELECT valeur FROM reglages WHERE cle = ?', [cle]);
  if (!lignes.length) {
    console.log(`  rien en base   ${cle} — le repli de lib/site.ts suffit`);
    return;
  }

  const brut = lignes[0].valeur;
  const valeur = typeof brut === 'string' ? JSON.parse(brut) : brut;
  const menu = chemin(valeur);
  if (!Array.isArray(menu)) {
    console.log(`  rien en base   ${cle} — pas de menu enregistré`);
    return;
  }
  if (menu.some((l) => l.chemin === ENTREE.chemin)) {
    console.log(`  déjà en place  ${cle} · Prestations`);
    return;
  }

  aFaire.push(`${cle} : ajouter « Prestations »`);
  if (verifier) return;

  // Juste avant « À propos », qui ouvre la partie qui ne vend rien. À défaut,
  // à la fin — mais jamais après « Contact », qui se garde la dernière place.
  const i = menu.findIndex((l) => l.chemin === 'a-propos');
  menu.splice(i === -1 ? Math.max(menu.length - 1, 0) : i, 0, { ...ENTREE });

  await connexion.query('UPDATE reglages SET valeur = ?, modifie_le = now() WHERE cle = ?', [
    JSON.stringify(valeur),
    cle,
  ]);
  console.log(`  posée          ${cle} · Prestations`);
  posees += 1;
}

await inserer('navigation', (v) => v.menu);
await inserer('pied', (v) => v.site?.menu);

await connexion.end();

if (verifier) {
  if (aFaire.length) {
    console.error(`\n  ${aFaire.length} page(s) à poser :`);
    for (const m of aFaire) console.error(`    ${m}`);
    console.error('\n  Pour les poser : npm run prestations\n');
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log('\nLes pages de prestations sont à jour.');
  }
} else {
  console.log(posees ? `\n${posees} page(s) posée(s).` : '\nRien à faire.');
}
