/**
 * Fait entrer les images déjà encodées du site dans la médiathèque.
 *
 * Elles ne sont ni copiées ni ré-encodées : les fichiers de `public/img/`
 * restent où ils sont, et la médiathèque n'enregistre que leur chemin. C'est ce
 * qui permet aux six pages d'origine de passer dans l'éditeur sans dupliquer
 * cinquante-quatre mégaoctets.
 *
 *   npm run importer-images
 *
 * Le script est rejouable : une image déjà connue est laissée telle quelle,
 * texte alternatif compris, pour ne pas écraser ce que Kevin aurait corrigé.
 *
 * Il parlait à PostgreSQL, et ne tournait plus depuis que la base est passée
 * sous MariaDB — il échouait à sa première ligne, sur un paquet `pg` absent.
 * Remis en état en octobre 2026 pour faire entrer les photographies des cinq
 * pages de prestations.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const ligne of readFileSync(path.join(racine, '.env'), 'utf8').split('\n')) {
  const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

// Le manifeste est un fichier TypeScript : on isole l'objet lui-même, sans se
// laisser prendre par la déclaration de type qui le précède.
const manifeste = readFileSync(path.join(racine, 'lib/images.generated.ts'), 'utf8');
const debut = manifeste.indexOf('{', manifeste.indexOf('export const IMAGES'));
const IMAGES = JSON.parse(manifeste.slice(debut, manifeste.lastIndexOf('}') + 1));

// Textes alternatifs relevés dans les pages existantes. Ceux qui manquent
// reçoivent un repère explicite : mieux vaut une description à corriger qu'une
// image muette pour les lecteurs d'écran.
const ALT = JSON.parse(readFileSync(path.join(racine, 'scripts/alt-images.json'), 'utf8'));

// `query` et non `execute` : Hyperdrive refuse les requêtes préparées, et ce
// script doit pouvoir viser la base de production comme celle de développement.
const client = await mysql.createConnection({ uri: process.env.DATABASE_URI, timezone: 'Z' });

/**
 * Les médias déjà connus, rangés par emplacement.
 *
 * **Par emplacement, et non par nom de fichier.** Le fichier principal d'une
 * image est `<emplacement>-<plus grande largeur>.webp`, et cette largeur bouge :
 * elle dépend de la source, puisque le script d'encodage n'agrandit jamais.
 * Remplacer une photographie par une autre, un peu moins définie, suffit à
 * changer le nom.
 *
 * Reconnaître une image à ce nom-là revient donc à ne pas la reconnaître du
 * tout : le script en insérait une seconde, la première restait en base avec
 * des largeurs dont les fichiers n'existaient plus, et les pages continuaient
 * de la viser. Quarante-neuf lignes étaient dans ce cas.
 */
const [lignes] = await client.query('SELECT id, fichier FROM medias');
const parEmplacement = new Map();
for (const l of lignes) {
  const nom = (String(l.fichier).match(/^\/img\/(.+)-\d+\.webp$/) || [])[1];
  if (nom) parEmplacement.set(nom, l);
}

let ajoutees = 0;
let misesAJour = 0;
let inchangees = 0;

for (const [nom, image] of Object.entries(IMAGES)) {
  // Un emplacement sans source reçoit quand même sa ligne, et c'est délibéré.
  //
  // Les pages vivent en base et désignent leurs images par leur identifiant de
  // médiathèque. Sans ligne, la section ne trouve rien et n'affiche **rien** :
  // le cadre nommé disparaît avec elle, et l'image manquante cesse de se voir.
  // Or elle doit se voir — c'est tout l'intérêt du cadre nommé.
  //
  // La ligne pointe donc vers un fichier qui n'existe pas encore. Le rendu ne
  // s'en sert pas : il reconnaît l'emplacement au chemin, lit le manifeste, y
  // voit `missing`, et dessine le cadre. Voir components/sections/Image.tsx.
  const sansSource = image.missing || !image.base;

  const plusGrande = sansSource ? 480 : image.widths[image.widths.length - 1];
  const base = image.base ?? `/img/${nom}`;
  const principal = `${base}-${plusGrande}.webp`;
  const tailles = sansSource
    ? []
    : image.widths.map((largeur) => ({ largeur, fichier: `${base}-${largeur}.webp` }));
  const hauteur = Math.round(plusGrande / image.ratio);

  const connue = parEmplacement.get(nom);

  if (!connue) {
    await client.query(
      `INSERT INTO medias (fichier, alt, type_mime, largeur, hauteur, octets, tailles, a_remplacer)
       VALUES (?, ?, 'image/webp', ?, ?, 0, ?, ?)`,
      [
        principal,
        ALT[nom] ?? `À décrire — emplacement ${nom}`,
        plusGrande,
        hauteur,
        JSON.stringify(tailles),
        sansSource ? 1 : 0,
      ],
    );
    console.log(`  ${sansSource ? 'cadre    ' : 'ajoutée  '} ${nom}`);
    ajoutees += 1;
    continue;
  }

  if (connue.fichier === principal) {
    inchangees += 1;
    continue;
  }

  // Les largeurs ont changé : on remet la ligne à jour **sans toucher au texte
  // alternatif ni à la légende**, que Kevin a pu corriger depuis le BackOffice.
  // L'identifiant ne bouge pas non plus — les sections le visent.
  await client.query(
    'UPDATE medias SET fichier = ?, largeur = ?, hauteur = ?, tailles = ? WHERE id = ?',
    [principal, plusGrande, hauteur, JSON.stringify(tailles), connue.id],
  );
  console.log(`  remise    ${nom.padEnd(24)} ${connue.fichier} → ${principal}`);
  misesAJour += 1;
}

console.log(
  `\n${ajoutees} ajoutée(s), ${misesAJour} remise(s) à jour, ${inchangees} déjà conforme(s).`,
);
await client.end();
