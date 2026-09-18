import 'server-only';
import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata as MetaSharp, type Sharp } from 'sharp';
import { ecrire, estDoublon, ligne, requete, transaction } from './bdd';
import type { Dossier, Media, Taille } from './modeles';

export type { Dossier, Media, Taille } from './modeles';
export { urlMedia } from './modeles';

/**
 * La médiathèque.
 *
 * Les fichiers vivent hors de `public/` et sont servis par une route dédiée.
 * Deux raisons : `public/` est figé à la construction, et une image envoyée
 * après coup n'y serait pas servie de façon fiable ; et les fichiers
 * appartiennent au serveur et à ses sauvegardes, pas au dépôt.
 *
 * Chaque envoi produit quatre largeurs en WebP, comme le fait déjà le script
 * d'encodage du site. Le navigateur choisit celle qu'il lui faut.
 */

export const DOSSIER = path.resolve(process.cwd(), 'medias');
export const LARGEURS = [480, 1024, 1600, 2400] as const;
const OCTETS_MAX = 25 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/tiff'];

type LigneMedia = Omit<Media, 'aRemplacer' | 'dossierId'> & {
  a_remplacer: number | boolean;
  dossier_id: number | null;
};

const versMedia = (l: LigneMedia): Media => ({
  id: l.id,
  fichier: l.fichier,
  alt: l.alt,
  legende: l.legende,
  largeur: l.largeur,
  hauteur: l.hauteur,
  tailles: l.tailles ?? [],
  aRemplacer: Boolean(l.a_remplacer),
  dossierId: l.dossier_id,
});

const CHAMPS = 'id, fichier, alt, legende, largeur, hauteur, tailles, a_remplacer, dossier_id';

export async function listerMedias(limite = 200) {
  const lignes = await requete<LigneMedia>(
    `SELECT ${CHAMPS} FROM medias ORDER BY cree_le DESC LIMIT ${Math.trunc(limite) || 200}`,
  );
  return lignes.map(versMedia);
}

export async function mediaParId(id: number) {
  const l = await ligne<LigneMedia>(`SELECT ${CHAMPS} FROM medias WHERE id = ?`, [id]);
  return l ? versMedia(l) : null;
}

/** Charge plusieurs médias d'un coup, pour ne pas interroger la base par image. */
export async function mediasParIds(ids: number[]) {
  const utiles = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
  if (!utiles.length) return new Map<number, Media>();

  const marqueurs = utiles.map(() => '?').join(', ');
  const lignes = await requete<LigneMedia>(
    `SELECT ${CHAMPS} FROM medias WHERE id IN (${marqueurs})`,
    utiles,
  );
  return new Map(lignes.map((l) => [l.id, versMedia(l)]));
}

export type ResultatEnvoi = { ok: true; media: Media } | { ok: false; message: string };

export async function enregistrerMedia(
  fichier: File,
  alt: string,
  options?: { aRemplacer?: boolean },
): Promise<ResultatEnvoi> {
  if (!alt.trim()) {
    return { ok: false, message: 'Le texte alternatif est obligatoire.' };
  }
  if (!TYPES.includes(fichier.type)) {
    return { ok: false, message: 'Format non accepté. JPEG, PNG, WebP, AVIF ou TIFF.' };
  }
  if (fichier.size > OCTETS_MAX) {
    return { ok: false, message: 'Fichier trop lourd. Vingt-cinq mégaoctets au maximum.' };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());

  // Sharp lit l'image pour de vrai : un fichier qui se prétend JPEG sans en
  // être un échoue ici, avant d'avoir été écrit sur le disque.
  let image: Sharp;
  let meta: MetaSharp;
  try {
    image = sharp(octets, { failOn: 'error' });
    meta = await image.metadata();
  } catch {
    return { ok: false, message: 'Ce fichier n’est pas une image lisible.' };
  }
  if (!meta.width || !meta.height) {
    return { ok: false, message: 'Ce fichier n’est pas une image lisible.' };
  }

  await mkdir(DOSSIER, { recursive: true });

  // Nom tiré au hasard : le nom d'origine peut contenir n'importe quoi, y
  // compris des séquences qui feraient sortir du dossier.
  const base = randomBytes(12).toString('hex');
  const principal = `${base}.webp`;

  await writeFile(
    path.join(DOSSIER, principal),
    await image.clone().rotate().webp({ quality: 82 }).toBuffer(),
  );

  const tailles: Taille[] = [];
  for (const largeur of LARGEURS) {
    if (largeur > meta.width) continue;
    const nom = `${base}-${largeur}.webp`;
    await writeFile(
      path.join(DOSSIER, nom),
      await image.clone().rotate().resize({ width: largeur }).webp({ quality: 80 }).toBuffer(),
    );
    tailles.push({ largeur, fichier: nom });
  }

  const { insertId } = await ecrire(
    `INSERT INTO medias (fichier, alt, type_mime, largeur, hauteur, octets, tailles, a_remplacer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      principal,
      alt.trim().slice(0, 500),
      'image/webp',
      meta.width,
      meta.height,
      octets.length,
      JSON.stringify(tailles),
      options?.aRemplacer ? 1 : 0,
    ],
  );

  const cree = await ligne<LigneMedia>(`SELECT ${CHAMPS} FROM medias WHERE id = ?`, [insertId]);
  if (!cree) return { ok: false, message: 'L’enregistrement a échoué.' };
  return { ok: true, media: versMedia(cree) };
}

export type ResultatAvatar = { ok: true; nom: string } | { ok: false; message: string };

/**
 * La photo de profil d'un compte.
 *
 * Elle n'entre pas dans la médiathèque : celle-ci tient les photographies du
 * site, et une tête dans une galerie de mariages n'a pas de sens. Elle vit
 * dans le même dossier et passe par la même route — deux carrés, 256 et 128 —
 * mais n'est référencée que par la ligne du compte.
 */
export async function enregistrerAvatar(fichier: File): Promise<ResultatAvatar> {
  if (!TYPES.includes(fichier.type)) {
    return { ok: false, message: 'Format non accepté. JPEG, PNG, WebP, AVIF ou TIFF.' };
  }
  if (fichier.size > OCTETS_MAX) {
    return { ok: false, message: 'Fichier trop lourd. Vingt-cinq mégaoctets au maximum.' };
  }

  const octets = Buffer.from(await fichier.arrayBuffer());

  let image: Sharp;
  try {
    image = sharp(octets, { failOn: 'error' });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) throw new Error('illisible');
  } catch {
    return { ok: false, message: 'Ce fichier n’est pas une image lisible.' };
  }

  await mkdir(DOSSIER, { recursive: true });

  // Même longueur de nom que la médiathèque : la route qui sert les fichiers
  // n'accepte que cette forme, et une photo de profil doit y passer aussi.
  const base = randomBytes(12).toString('hex');
  for (const largeur of [256, 128] as const) {
    await writeFile(
      path.join(DOSSIER, `${base}-${largeur}.webp`),
      await image
        .clone()
        .rotate()
        .resize({ width: largeur, height: largeur, fit: 'cover', position: 'attention' })
        .webp({ quality: 82 })
        .toBuffer(),
    );
  }

  return { ok: true, nom: base };
}

/** Efface les fichiers d'une photo de profil remplacée ou retirée. */
export async function effacerAvatar(avatar: string | null) {
  if (!avatar || !/^[a-f0-9]{24}$/.test(avatar)) return;
  for (const largeur of [256, 128] as const) {
    await rm(path.join(DOSSIER, `${avatar}-${largeur}.webp`), { force: true });
  }
}

export async function majMedia(id: number, d: { alt: string; legende: string }) {
  await requete('UPDATE medias SET alt = ?, legende = NULLIF(?, ?) WHERE id = ?', [
    d.alt.trim().slice(0, 500),
    d.legende.trim().slice(0, 500),
    '',
    id,
  ]);
}

/**
 * Les pages qui se servent d'un média.
 *
 * Supprimer une image utilisée laisserait un trou dans une page en ligne, et
 * personne ne s'en apercevrait avant longtemps. On regarde donc avant.
 *
 * Le parcours se fait en mémoire plutôt qu'en SQL : un identifiant d'image peut
 * se trouver à n'importe quelle profondeur d'une section, et une requête JSONB
 * capable de le suivre partout serait bien plus difficile à relire que ces
 * quinze lignes.
 */
export async function utilisationsMedia(id: number) {
  const pages = await requete<{ id: number; titre: string; chemin: string; sections: unknown; brouillon: unknown }>(
    'SELECT id, titre, chemin, sections, brouillon FROM pages',
  );

  const contient = (valeur: unknown): boolean => {
    if (Array.isArray(valeur)) return valeur.some(contient);
    if (!valeur || typeof valeur !== 'object') return false;
    return Object.entries(valeur).some(([cle, v]) =>
      cle === 'image' && typeof v === 'number' ? v === id : contient(v),
    );
  };

  return pages
    .filter((p) => contient(p.sections) || contient(p.brouillon))
    .map((p) => ({ id: p.id, titre: p.titre, chemin: p.chemin }));
}

/** Supprime le média, ses largeurs dérivées et ses fichiers. */
export async function supprimerMedia(id: number) {
  const media = await mediaParId(id);
  if (!media) return;

  // La base d'abord : si l'effacement des fichiers échoue, il restera des
  // octets orphelins, ce qui est sans conséquence. L'inverse laisserait une
  // ligne pointant vers le vide, que les pages afficheraient comme une image
  // cassée.
  await requete('DELETE FROM medias WHERE id = ?', [id]);

  for (const nom of [media.fichier, ...media.tailles.map((t) => t.fichier)]) {
    await rm(path.join(DOSSIER, nom), { force: true }).catch(() => {});
  }
}


// ————————————————————————— Dossiers —————————————————————————

/**
 * Les dossiers de la médiathèque.
 *
 * Un seul niveau : ranger des photographies par chantier n'appelle pas une
 * arborescence, et une arborescence appellerait un explorateur de fichiers.
 * Le compte d'images voyage avec le dossier — c'est ce qui permet d'afficher
 * « Mariages (34) » sans une requête par dossier.
 */
export async function listerDossiers(): Promise<Dossier[]> {
  const lignes = await requete<{ id: number; nom: string; images: number; parent_id: number | null }>(
    `SELECT d.id, d.nom, d.parent_id, count(m.id) AS images
       FROM dossiers_medias d
       LEFT JOIN medias m ON m.dossier_id = d.id
      GROUP BY d.id, d.nom, d.parent_id
      ORDER BY d.nom`,
  );
  return lignes.map((l) => ({ id: l.id, nom: l.nom, images: l.images, parentId: l.parent_id }));
}

export async function creerDossier(
  nom: string,
  parentId: number | null = null,
): Promise<{ id?: number; erreur?: string }> {
  const propre = nom.trim().slice(0, 60);
  if (!propre) return { erreur: 'Donnez un nom au dossier.' };

  try {
    // L'identifiant revient avec la création : l'écran ouvre aussitôt le champ
    // de renommage sur le dossier tout neuf, et il faut savoir lequel.
    const { insertId } = await ecrire(
      'INSERT INTO dossiers_medias (nom, parent_id) VALUES (?, ?)',
      [propre, parentId],
    );
    return { id: insertId };
  } catch (erreur) {
    // Deux dossiers du même nom seraient impossibles à distinguer.
    if (estDoublon(erreur)) {
      return { erreur: 'Un dossier porte déjà ce nom.' };
    }
    throw erreur;
  }
}

/**
 * Crée un dossier sans nom choisi, et rend son identifiant.
 *
 * Le nom d'attente se décide ici, au plus près de la base : calculé dans
 * l'écran, deux clics rapprochés viseraient le même et le second échouerait
 * sur une erreur que personne n'a demandée. La seule erreur possible de
 * `creerDossier` sur un nom non vide est la collision : on passe au suivant.
 */
export async function creerDossierNomLibre(parentId: number | null = null) {
  for (let n = 1; n <= 50; n++) {
    const resultat = await creerDossier(n === 1 ? 'Nouveau dossier' : `Nouveau dossier ${n}`, parentId);
    if (!resultat.erreur) return resultat;
  }
  return { erreur: 'Trop de dossiers sans nom. Renommez-en un avant d’en créer un autre.' };
}

export async function renommerDossier(id: number, nom: string) {
  const propre = nom.trim().slice(0, 60);
  if (!propre) return { erreur: 'Donnez un nom au dossier.' };

  try {
    await requete('UPDATE dossiers_medias SET nom = ? WHERE id = ?', [propre, id]);
    return {};
  } catch (erreur) {
    if ((erreur as { code?: string }).code === '23505') {
      return { erreur: 'Un dossier porte déjà ce nom.' };
    }
    throw erreur;
  }
}

/** Le dossier disparaît, ses images non : elles retournent au fonds commun. */
/**
 * Supprime un dossier, et libère ce qu'il contenait.
 *
 * PostgreSQL détachait tout seul : ses clés étrangères remettaient à `NULL` les
 * sous-dossiers et les images. MySQL refuse cette règle sur `parent_id`, dont
 * dépend la colonne qui tient l'unicité des noms — le détachement se fait donc
 * ici, en trois temps et dans une transaction : les sous-dossiers remontent à
 * la racine, les images retournent aux non rangées, puis le dossier part.
 */
export async function supprimerDossier(id: number) {
  await transaction(async (_q, e) => {
    await e('UPDATE dossiers_medias SET parent_id = NULL WHERE parent_id = ?', [id]);
    await e('UPDATE medias SET dossier_id = NULL WHERE dossier_id = ?', [id]);
    await e('DELETE FROM dossiers_medias WHERE id = ?', [id]);
  });
}

export async function rangerMedia(id: number, dossierId: number | null) {
  await requete('UPDATE medias SET dossier_id = ? WHERE id = ?', [dossierId, id]);
}


/**
 * Déplace un dossier dans un autre.
 *
 * Le garde-fou compte : sans lui, glisser un dossier dans son propre
 * sous-dossier détacherait la branche entière de l'arbre — elle existerait
 * encore en base, mais plus aucun chemin n'y mènerait.
 */
export async function deplacerDossier(id: number, parentId: number | null) {
  if (id === parentId) return { erreur: 'Un dossier ne peut pas se contenir lui-même.' };

  if (parentId) {
    const tous = await requete<{ id: number; parent_id: number | null }>(
      'SELECT id, parent_id FROM dossiers_medias',
    );
    const parents = new Map(tous.map((d) => [d.id, d.parent_id]));
    for (let n: number | null = parentId; n; n = parents.get(n) ?? null) {
      if (n === id) return { erreur: 'Ce dossier est déjà à l’intérieur de celui-là.' };
    }
  }

  await requete('UPDATE dossiers_medias SET parent_id = ? WHERE id = ?', [parentId, id]);
  return {};
}

/**
 * Duplique un dossier, ses sous-dossiers et ses photographies.
 *
 * Une copie véritable : les fichiers sont réécrits sur le disque, et les
 * images obtenues sont indépendantes. C'est ce que fait un explorateur de
 * fichiers — et c'est pourquoi l'écran prévient du nombre d'images avant de
 * lancer l'opération : deux cents photographies dupliquées, ce sont deux cents
 * fichiers de plus à sauvegarder.
 */
export async function dupliquerDossier(id: number, parentId?: number | null): Promise<number> {
  const source = await ligne<{ nom: string; parent_id: number | null }>(
    'SELECT nom, parent_id FROM dossiers_medias WHERE id = ?',
    [id],
  );
  if (!source) return 0;

  const cible = parentId === undefined ? source.parent_id : parentId;
  const nom = parentId === undefined ? `${source.nom} (copie)`.slice(0, 60) : source.nom;

  const copie = await ecrire('INSERT INTO dossiers_medias (nom, parent_id) VALUES (?, ?)', [
    nom,
    cible,
  ]);
  if (!copie.insertId) return 0;

  const images = await requete<LigneMedia>(`SELECT ${CHAMPS} FROM medias WHERE dossier_id = ?`, [id]);
  let copiees = 0;

  for (const l of images) {
    const media = versMedia(l);
    const base = randomBytes(12).toString('hex');

    // Le fichier principal, puis chaque largeur : les noms changent, les
    // octets non.
    const principal = `${base}${path.extname(media.fichier)}`;
    await copyFile(path.join(DOSSIER, media.fichier), path.join(DOSSIER, principal)).catch(() => {});

    const tailles: Taille[] = [];
    for (const t of media.tailles) {
      const nomTaille = `${base}-${t.largeur}${path.extname(t.fichier)}`;
      await copyFile(path.join(DOSSIER, t.fichier), path.join(DOSSIER, nomTaille)).catch(() => {});
      tailles.push({ largeur: t.largeur, fichier: nomTaille });
    }

    await requete(
      `INSERT INTO medias (fichier, alt, legende, largeur, hauteur, tailles, a_remplacer,
                           dossier_id, type_mime, octets)
       SELECT ?, alt, legende, largeur, hauteur, ?, a_remplacer, ?, type_mime, octets
         FROM medias WHERE id = ?`,
      [principal, JSON.stringify(tailles), copie.insertId, media.id],
    );
    copiees++;
  }

  // Les sous-dossiers suivent, avec leur contenu.
  const enfants = await requete<{ id: number }>(
    'SELECT id FROM dossiers_medias WHERE parent_id = ?',
    [id],
  );
  for (const enfant of enfants) copiees += await dupliquerDossier(enfant.id, copie.insertId);

  return copiees;
}

/** Le nombre d'images d'un dossier et de tout ce qu'il contient. */
export async function compterRecursif(id: number) {
  const l = await ligne<{ n: number }>(
    `WITH RECURSIVE branche AS (
       SELECT id FROM dossiers_medias WHERE id = ?
       UNION ALL
       SELECT d.id FROM dossiers_medias d JOIN branche b ON d.parent_id = b.id
     )
     SELECT count(m.id) AS n FROM medias m WHERE m.dossier_id IN (SELECT id FROM branche)`,
    [id],
  );
  return l?.n ?? 0;
}
