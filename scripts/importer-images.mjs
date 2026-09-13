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
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

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

const client = new pg.Client({ connectionString: process.env.DATABASE_URI });
await client.connect();

let ajoutees = 0;
let ignorees = 0;

for (const [nom, image] of Object.entries(IMAGES)) {
  if (image.missing || !image.base) {
    console.log(`  absente   ${nom}`);
    continue;
  }

  const principal = `${image.base}-${image.widths[image.widths.length - 1]}.webp`;
  const { rowCount } = await client.query('SELECT 1 FROM medias WHERE fichier = $1', [principal]);
  if (rowCount) {
    ignorees++;
    continue;
  }

  const tailles = image.widths.map((largeur) => ({
    largeur,
    fichier: `${image.base}-${largeur}.webp`,
  }));
  const plusGrande = image.widths[image.widths.length - 1];

  await client.query(
    `INSERT INTO medias (fichier, alt, type_mime, largeur, hauteur, octets, tailles, a_remplacer)
     VALUES ($1, $2, 'image/webp', $3, $4, 0, $5, true)`,
    [
      principal,
      ALT[nom] ?? `À décrire — emplacement ${nom}`,
      plusGrande,
      Math.round(plusGrande / image.ratio),
      JSON.stringify(tailles),
    ],
  );
  ajoutees++;
}

console.log(`\n${ajoutees} image(s) ajoutée(s), ${ignorees} déjà connue(s).`);
console.log('Toutes sont marquées « à remplacer » : ce sont encore les visuels Pexels.');
await client.end();
