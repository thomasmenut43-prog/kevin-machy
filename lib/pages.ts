import 'server-only';
import { PAR_TYPE } from '@/cms/catalogue';
import type { Champ } from '@/cms/schema';
import { ecrire, ligne, requete, transaction, jsonDeLaBase } from './bdd';
import { nouvelleCle, type Page, type Section } from './modeles';

export type { Page, Section } from './modeles';
export { nouvelleCle } from './modeles';


type LignePage = {
  id: number;
  chemin: string;
  titre: string;
  statut: 'brouillon' | 'publie';
  sections: Section[];
  brouillon: Section[] | null;
  meta_titre: string | null;
  meta_description: string | null;
  meta_image: string | null;
  hors_indexation: number | boolean;
  systeme: number | boolean;
  modifie_le: Date;
  publie_le: Date | null;
};

const versPage = (l: LignePage): Page => ({
  id: l.id,
  chemin: l.chemin,
  titre: l.titre,
  statut: l.statut,
  sections: jsonDeLaBase(l.sections) ?? [],
  brouillon: jsonDeLaBase(l.brouillon),
  metaTitre: l.meta_titre,
  metaDescription: l.meta_description,
  metaImage: l.meta_image,
  horsIndexation: Boolean(l.hors_indexation),
  systeme: Boolean(l.systeme),
  modifieLe: l.modifie_le,
  publieLe: l.publie_le,
});

const CHAMPS = `id, chemin, titre, statut, sections, brouillon,
                meta_titre, meta_description, meta_image, hors_indexation, systeme,
                modifie_le, publie_le`;

// ————————————————————————————— Lecture —————————————————————————————

export async function listerPages() {
  const lignes = await requete<LignePage>(
    `SELECT ${CHAMPS} FROM pages ORDER BY (chemin = '') DESC, chemin`,
  );
  return lignes.map(versPage);
}

/**
 * La page sur laquelle l'éditeur s'ouvre.
 *
 * L'accueil d'abord : c'est la page que Kevin a en tête quand il dit « mon
 * site ». À défaut, la dernière touchée.
 */
export async function pageDEntree() {
  const l = await ligne<LignePage>(
    `SELECT ${CHAMPS} FROM pages ORDER BY (chemin = '') DESC, modifie_le DESC LIMIT 1`,
  );
  return l ? versPage(l) : null;
}

export async function pageParId(id: number) {
  const l = await ligne<LignePage>(`SELECT ${CHAMPS} FROM pages WHERE id = ?`, [id]);
  return l ? versPage(l) : null;
}

/** La version publiée. C'est elle, et elle seule, que voient les visiteurs. */
export async function pagePublieeParChemin(chemin: string) {
  const l = await ligne<LignePage>(
    `SELECT ${CHAMPS} FROM pages WHERE chemin = ? AND statut = 'publie'`,
    [chemin],
  );
  return l ? versPage(l) : null;
}

export async function cheminsPublies(options?: { indexablesSeulement?: boolean }) {
  const lignes = await requete<{ chemin: string }>(
    `SELECT chemin FROM pages
      WHERE statut = 'publie' ${options?.indexablesSeulement ? 'AND hors_indexation = 0' : ''}
      ORDER BY chemin`,
  );
  return lignes.map((l) => l.chemin);
}

// ————————————————————————————— Écriture ————————————————————————————

/**
 * Deux familles d'adresses interdites, et la distinction compte.
 *
 * Les **préfixes techniques** appartiennent au système avec tout ce qu'ils
 * contiennent : rien ne peut vivre sous /admin/ ni sous /medias/.
 *
 * Les **pages du site** ne bloquent qu'elles-mêmes. /portrait/ est écrite en
 * code, donc prise ; mais /portrait/collodion-humide/ est libre, et c'est
 * précisément le genre de page que l'éditeur existe pour créer.
 */
const PREFIXES_RESERVES = ['admin', 'api', 'apercu', 'medias', '_next', 'img', 'assets', 'fonts'];

// Les six pages du site sont passées en base : il ne reste ici que les deux
// fichiers que Next fabrique lui-même à la racine.
const PAGES_DU_CODE = new Set(['robots.txt', 'sitemap.xml']);

export function verifierChemin(chemin: string, options?: { accueil?: boolean }): string | null {
  // L'accueil est la seule page dont l'adresse ne s'écrit pas.
  if (chemin === '' && options?.accueil) return null;
  if (!chemin) return 'Une adresse est obligatoire.';
  if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(chemin)) {
    return 'Lettres minuscules, chiffres, tirets et barres obliques seulement. Par exemple portrait/collodion-humide.';
  }
  if (PREFIXES_RESERVES.includes(chemin.split('/')[0])) {
    return 'Cette adresse est réservée au fonctionnement du site.';
  }
  if (PAGES_DU_CODE.has(chemin)) {
    return 'Cette adresse est réservée au fonctionnement du site.';
  }
  return null;
}

export function normaliserChemin(valeur: string) {
  return valeur.trim().toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
}

export async function creerPage(donnees: { titre: string; chemin: string }) {
  // Pas de RETURNING en MySQL : on insère, puis on relit la ligne créée.
  // `sections` est posé explicitement — la colonne n'a pas de valeur par
  // défaut, MySQL ne sachant pas en donner une à un JSON sur tous ses moteurs.
  const { insertId } = await ecrire(
    `INSERT INTO pages (titre, chemin, sections) VALUES (?, ?, '[]')`,
    [donnees.titre.trim(), normaliserChemin(donnees.chemin)],
  );

  const creee = await ligne<LignePage>(`SELECT ${CHAMPS} FROM pages WHERE id = ?`, [insertId]);
  return creee ? versPage(creee) : null;
}

/**
 * Enregistre le brouillon. Le site en ligne ne bouge pas : c'est toute la
 * différence entre travailler et publier.
 */
export async function enregistrerBrouillon(id: number, sections: Section[]) {
  await requete(
    'UPDATE pages SET brouillon = ?, modifie_le = now() WHERE id = ?',
    [JSON.stringify(nettoyerSections(sections)), id],
  );
}

/**
 * Publie le brouillon : il devient ce que voient les visiteurs, et l'état
 * précédent part dans l'historique.
 */
export async function publier(id: number, auteurId: number) {
  return transaction(async (q) => {
    const [avant] = await q<LignePage>('SELECT sections, titre FROM pages WHERE id = ?', [id]);
    if (!avant) throw new Error('Page introuvable.');

    // On archive l'état qui part, pas celui qui arrive : revenir en arrière
    // doit ramener ce qui était en ligne avant cette publication.
    await q(
      'INSERT INTO versions (page_id, titre, sections, auteur_id) VALUES (?, ?, ?, ?)',
      [id, avant.titre, JSON.stringify(avant.sections ?? []), auteurId],
    );

    await q(
      `UPDATE pages
          SET sections = COALESCE(brouillon, sections),
              brouillon = NULL,
              statut = 'publie',
              publie_le = now(),
              modifie_le = now()
        WHERE id = ?`,
      [id],
    );

    // On garde les cinquante dernières : au-delà, plus personne ne remonte.
    //
    // La sous-requête est enveloppée dans une table dérivée : MySQL refuse de
    // lire la table qu'il est en train d'effacer, et refuse aussi un `LIMIT`
    // dans un `IN`. Cette enveloppe lève les deux objections d'un coup.
    await q(
      `DELETE FROM versions
        WHERE page_id = ?
          AND id NOT IN (
            SELECT id FROM (
              SELECT id FROM versions WHERE page_id = ? ORDER BY cree_le DESC LIMIT 50
            ) AS recentes
          )`,
      [id, id],
    );
  });
}

export async function depublier(id: number) {
  await requete(`UPDATE pages SET statut = 'brouillon', modifie_le = now() WHERE id = ?`, [id]);
}

export async function majReglages(
  id: number,
  d: {
    titre: string;
    chemin: string;
    metaTitre: string;
    metaDescription: string;
    metaImage: string;
    horsIndexation: boolean;
  },
) {
  // Une page système garde son adresse : le pied de page et les redirections
  // pointent dessus, et la renommer les casserait sans rien dire. Le reste —
  // titre, description, indexation — se modifie comme partout ailleurs.
  await requete(
    `UPDATE pages
        SET titre = ?,
            chemin = CASE WHEN systeme THEN chemin ELSE ? END,
            meta_titre = NULLIF(?, ''),
            meta_description = NULLIF(?, ''), meta_image = NULLIF(?, ''),
            hors_indexation = ?, modifie_le = now()
      WHERE id = ?`,
    [
      d.titre.trim(),
      normaliserChemin(d.chemin),
      d.metaTitre,
      d.metaDescription,
      d.metaImage.trim(),
      d.horsIndexation ? 1 : 0,
      id,
    ],
  );
}

/**
 * Supprime une page, sauf si elle est de celles que le site ne peut pas perdre.
 *
 * Le refus est ici, au plus près de la base, et non dans l'écran qui cache le
 * bouton : un écran se contourne, une requête non.
 */
export async function supprimerPage(id: number) {
  await ecrire('DELETE FROM pages WHERE id = ? AND systeme = 0', [id]);
}

export async function listerVersions(pageId: number) {
  return requete<{ id: number; titre: string; cree_le: Date; auteur: string | null }>(
    `SELECT v.id, v.titre, v.cree_le, NULLIF(concat_ws(' ', u.prenom, u.nom), '') AS auteur
       FROM versions v
       LEFT JOIN utilisateurs u ON u.id = v.auteur_id
      WHERE v.page_id = ?
      ORDER BY v.cree_le DESC`,
    [pageId],
  );
}

/** Remet une version d'avant dans le brouillon, sans rien publier. */
export async function restaurerVersion(pageId: number, versionId: number) {
  const v = await ligne<{ sections: Section[] }>(
    'SELECT sections FROM versions WHERE id = ? AND page_id = ?',
    [versionId, pageId],
  );
  if (!v) throw new Error('Version introuvable.');
  await enregistrerBrouillon(pageId, v.sections);
}

// ———————————————————————————— Validation ————————————————————————————

/**
 * Ne garde que ce que le catalogue connaît.
 *
 * Le navigateur envoie ce qu'il veut : une section d'un type inventé, un champ
 * qui n'existe pas, une valeur de dix mégaoctets. Rien de tout cela n'entre en
 * base. C'est la frontière entre l'éditeur et les données.
 */
export function nettoyerSections(sections: unknown): Section[] {
  if (!Array.isArray(sections)) return [];

  return sections.slice(0, 60).flatMap((brute): Section[] => {
    if (!brute || typeof brute !== 'object') return [];
    const s = brute as Partial<Section>;
    const bloc = typeof s.type === 'string' ? PAR_TYPE.get(s.type) : undefined;
    if (!bloc) return [];

    return [{
      cle: typeof s.cle === 'string' && s.cle.length <= 40 ? s.cle : nouvelleCle(),
      type: bloc.type,
      valeurs: nettoyerChamps(bloc.champs, s.valeurs),
    }];
  });
}

function nettoyerChamps(champs: Champ[], valeurs: unknown): Record<string, unknown> {
  const entree = (valeurs ?? {}) as Record<string, unknown>;
  const sortie: Record<string, unknown> = {};

  for (const champ of champs) {
    const v = entree[champ.nom];

    switch (champ.type) {
      case 'texte':
        if (typeof v === 'string') sortie[champ.nom] = v.slice(0, 5000);
        break;
      case 'choix':
        if (typeof v === 'string' && champ.options.some((o) => o.valeur === v)) sortie[champ.nom] = v;
        break;
      case 'booleen':
        if (typeof v === 'boolean') sortie[champ.nom] = v;
        break;
      case 'image':
        if (typeof v === 'number' && Number.isInteger(v) && v > 0) sortie[champ.nom] = v;
        break;
      case 'texteRiche':
        sortie[champ.nom] = nettoyerTexteRiche(v);
        break;
      case 'apparence':
        sortie[champ.nom] = nettoyerApparence(v);
        break;
      case 'groupe':
      case 'repli':
        sortie[champ.nom] = nettoyerChamps(champ.champs, v);
        break;
      case 'liste': {
        const max = champ.maximum ?? 40;
        sortie[champ.nom] = Array.isArray(v)
          ? v.slice(0, max).map((item) => nettoyerChamps(champ.champs, item))
          : [];
        break;
      }
    }
  }

  return sortie;
}

/** Voir lib/texteRiche.ts : aucun HTML ne traverse jamais la frontière. */
function nettoyerTexteRiche(v: unknown) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 200).flatMap((bloc) => {
    if (!bloc || typeof bloc !== 'object') return [];
    const b = bloc as { type?: unknown; fragments?: unknown };
    const type = b.type === 'liste' || b.type === 'listeNumerotee' ? b.type : 'paragraphe';
    const fragments = Array.isArray(b.fragments)
      ? b.fragments.slice(0, 100).flatMap((f) => {
          if (!f || typeof f !== 'object') return [];
          const g = f as { texte?: unknown; gras?: unknown; italique?: unknown; lien?: unknown };
          if (typeof g.texte !== 'string') return [];
          return [{
            texte: g.texte.slice(0, 5000),
            ...(g.gras === true ? { gras: true } : {}),
            ...(g.italique === true ? { italique: true } : {}),
            // Seuls ces schémas d'URL. javascript: est ainsi hors de portée.
            ...(typeof g.lien === 'string' && /^(https?:\/\/|\/|mailto:|tel:)/.test(g.lien)
              ? { lien: g.lien.slice(0, 500) }
              : {}),
          }];
        })
      : [];
    return [{ type, fragments }];
  });
}

function nettoyerApparence(v: unknown) {
  if (!v || typeof v !== 'object') return {};
  const a = v as Record<string, unknown>;
  const garde = (cle: string) => (typeof a[cle] === 'string' ? String(a[cle]).slice(0, 40) : undefined);
  return {
    taille: garde('taille'),
    police: garde('police'),
    couleur: garde('couleur'),
    couleurLibre: garde('couleurLibre'),
    alignement: garde('alignement'),
  };
}


/**
 * Tous les identifiants d'image d'une pile de sections, à n'importe quelle
 * profondeur. Sert à charger les médias d'une page en une seule requête.
 */
export function idsImages(sections: Section[]): number[] {
  const ids: number[] = [];

  const explorer = (valeur: unknown) => {
    if (Array.isArray(valeur)) return valeur.forEach(explorer);
    if (!valeur || typeof valeur !== 'object') return;
    for (const [cle, v] of Object.entries(valeur)) {
      if ((cle === 'image' || cle === 'imageEtroite') && typeof v === 'number') ids.push(v);
      else explorer(v);
    }
  };

  explorer(sections);
  return ids;
}
