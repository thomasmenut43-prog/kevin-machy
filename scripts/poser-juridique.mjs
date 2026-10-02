/**
 * Pose les pages juridiques en base.
 *
 * `contenu/juridique.json` est produit par `scripts/convertir-juridique.mjs`,
 * versionné et relu. Ce script-ci ne décide de rien : il écrit ce que ce
 * fichier contient, et remplit les mentions obligatoires des Paramètres.
 *
 *   npm run juridique                 pose les pages
 *   npm run juridique -- --verifier   dit ce qui manque, sans rien écrire
 *
 * Idempotent : relancé, il ne touche que ce qui diffère. Il tourne donc aussi
 * depuis **Actions → Corrections de contenu**, là où le mot de passe de la
 * base existe en secret — il n'existe en clair nulle part.
 *
 * Deux garde-fous, parce que ce script écrase du contenu :
 *
 * - une page dont un brouillon est en cours est **laissée tranquille**. Un
 *   brouillon veut dire que quelqu'un écrit dedans en ce moment ;
 * - un champ des Paramètres déjà rempli n'est **jamais** remplacé. Le script
 *   comble les trous, il ne corrige pas ce qui a été saisi à la main.
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

/**
 * Les mentions obligatoires qui vivent dans les Paramètres.
 *
 * La section « Identité de l'entreprise » les affiche en haut des pages
 * juridiques, et la loi du 21 juin 2004 en impose la plupart. Elles étaient
 * vides : le site publiait ses mentions légales sans SIRET ni hébergeur.
 *
 * Leur source est l'ancien site pour l'immatriculation et le médiateur ; les
 * deux hébergeurs ont été vérifiés chez eux, voir
 * `scripts/convertir-juridique.mjs`.
 *
 * `hebergeurSite`, `mediateurNom` et `mediateurSite` se saisissent dans le
 * BackOffice mais ne sont affichés nulle part à ce jour. On les remplit quand
 * même : le médiateur, lui, est bien publié — dans le texte des mentions et à
 * l'article 25 des CGV, qui est ce que la loi demande.
 */
const IDENTITE = {
  raisonSociale: 'Kevin Machy — Entrepreneur individuel',
  siret: '904 158 284 00029',
  hebergeurNom: 'Cloudflare, Inc.',
  hebergeurAdresse: '101 Townsend Street, San Francisco, CA 94107, États-Unis',
  hebergeurSite: 'https://www.cloudflare.com',
  mediateurNom: 'M. Dominique Coulon — 37 rue des Chênes, 25480 Miserey-Salines',
  mediateurSite: 'https://www.cc-mediateurconso-bfc.fr/',
};

const juridique = JSON.parse(readFileSync(path.join(racine, 'contenu/juridique.json'), 'utf8'));

const connexion = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

const aFaire = [];
let posees = 0;

// ———————————————————————————————— Les pages ————————————————————————————————

for (const [chemin, { titre, sections }] of Object.entries(juridique)) {
  const [lignes] = await connexion.query(
    'SELECT id, titre, sections, brouillon, statut FROM pages WHERE chemin = ?',
    [chemin],
  );

  if (!lignes.length) {
    console.error(`  ! page /${chemin}/ introuvable — à créer dans le BackOffice`);
    process.exitCode = 1;
    continue;
  }

  const page = lignes[0];
  const attendu = JSON.stringify(sections);
  const actuel = JSON.stringify(
    typeof page.sections === 'string' ? JSON.parse(page.sections) : page.sections,
  );

  if (actuel === attendu && page.titre === titre) {
    console.log(`  déjà en place  /${chemin}/  ${sections.length} sections`);
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

  aFaire.push(`/${chemin}/ ${sections.length} sections`);
  if (verifier) continue;

  await connexion.query(
    `UPDATE pages SET titre = ?, sections = ?, brouillon = NULL, statut = 'publie',
                      publie_le = now(), modifie_le = now()
       WHERE id = ?`,
    [titre, attendu, page.id],
  );
  console.log(`  posée          /${chemin}/  ${sections.length} sections`);
  posees += 1;
}

// —————————————————————————— Les mentions obligatoires ——————————————————————————

const [reglages] = await connexion.query('SELECT valeur FROM reglages WHERE cle = ?', [
  'entreprise',
]);
const brut = reglages[0]?.valeur;
const entreprise = (typeof brut === 'string' ? JSON.parse(brut) : brut) ?? {};

const manquants = Object.entries(IDENTITE).filter(([champ]) => !entreprise[champ]);

if (!manquants.length) {
  console.log('  déjà en place  Paramètres : mentions obligatoires');
} else {
  aFaire.push(`Paramètres : ${manquants.map(([c]) => c).join(', ')}`);
  if (!verifier) {
    const valeur = { ...entreprise };
    for (const [champ, v] of manquants) valeur[champ] = v;
    // `reglages` porte une contrainte d'unicité sur `cle` : un seul ordre
    // suffit, qu'il y ait déjà une ligne ou non.
    await connexion.query(
      `INSERT INTO reglages (cle, valeur) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valeur = VALUES(valeur), modifie_le = now()`,
      ['entreprise', JSON.stringify(valeur)],
    );
    for (const [champ] of manquants) console.log(`  posé           Paramètres · ${champ}`);
    posees += manquants.length;
  }
}

await connexion.end();

if (verifier) {
  if (aFaire.length) {
    console.error(`\n  ${aFaire.length} élément(s) à poser :`);
    for (const m of aFaire) console.error(`    ${m}`);
    console.error('\n  Pour les poser : npm run juridique\n');
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log('\nLes pages juridiques sont à jour.');
  }
} else {
  console.log(posees ? `\n${posees} élément(s) posé(s).` : '\nRien à faire.');
}
