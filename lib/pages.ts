import 'server-only';
import { PAR_TYPE } from '@/cms/catalogue';
import type { Champ } from '@/cms/schema';
import { ligne, requete, transaction } from './bdd';
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
  hors_indexation: boolean;
  modifie_le: Date;
  publie_le: Date | null;
};

const versPage = (l: LignePage): Page => ({
  id: l.id,
  chemin: l.chemin,
  titre: l.titre,
  statut: l.statut,
  sections: l.sections ?? [],
  brouillon: l.brouillon,
  metaTitre: l.meta_titre,
  metaDescription: l.meta_description,
  metaImage: l.meta_image,
  horsIndexation: l.hors_indexation,
  modifieLe: l.modifie_le,
  publieLe: l.publie_le,
});

const CHAMPS = `id, chemin, titre, statut, sections, brouillon,
                meta_titre, meta_description, meta_image, hors_indexation, modifie_le, publie_le`;

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
  const l = await ligne<LignePage>(`SELECT ${CHAMPS} FROM pages WHERE id = $1`, [id]);
  return l ? versPage(l) : null;
}

/** La version publiée. C'est elle, et elle seule, que voient les visiteurs. */
export async function pagePublieeParChemin(chemin: string) {
  const l = await ligne<LignePage>(
    `SELECT ${CHAMPS} FROM pages WHERE chemin = $1 AND statut = 'publie'`,
    [chemin],
  );
  return l ? versPage(l) : null;
}

export async function cheminsPublies(options?: { indexablesSeulement?: boolean }) {
  const lignes = await requete<{ chemin: string }>(
    `SELECT chemin FROM pages
      WHERE statut = 'publie' ${options?.indexablesSeulement ? 'AND hors_indexation = false' : ''}
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
  return ligne<LignePage>(
    `INSERT INTO pages (titre, chemin) VALUES ($1, $2) RETURNING ${CHAMPS}`,
    [donnees.titre.trim(), normaliserChemin(donnees.chemin)],
  ).then((l) => (l ? versPage(l) : null));
}

/**
 * Enregistre le brouillon. Le site en ligne ne bouge pas : c'est toute la
 * différence entre travailler et publier.
 */
export async function enregistrerBrouillon(id: number, sections: Section[]) {
  await requete(
    'UPDATE pages SET brouillon = $2, modifie_le = now() WHERE id = $1',
    [id, JSON.stringify(nettoyerSections(sections))],
  );
}

/**
 * Publie le brouillon : il devient ce que voient les visiteurs, et l'état
 * précédent part dans l'historique.
 */
export async function publier(id: number, auteurId: number) {
  return transaction(async (q) => {
    const [avant] = await q<LignePage>('SELECT sections, titre FROM pages WHERE id = $1', [id]);
    if (!avant) throw new Error('Page introuvable.');

    // On archive l'état qui part, pas celui qui arrive : revenir en arrière
    // doit ramener ce qui était en ligne avant cette publication.
    await q(
      'INSERT INTO versions (page_id, titre, sections, auteur_id) VALUES ($1, $2, $3, $4)',
      [id, avant.titre, JSON.stringify(avant.sections ?? []), auteurId],
    );

    await q(
      `UPDATE pages
          SET sections = COALESCE(brouillon, sections),
              brouillon = NULL,
              statut = 'publie',
              publie_le = now(),
              modifie_le = now()
        WHERE id = $1`,
      [id],
    );

    // On garde les cinquante dernières : au-delà, plus personne ne remonte.
    await q(
      `DELETE FROM versions
        WHERE page_id = $1
          AND id NOT IN (SELECT id FROM versions WHERE page_id = $1 ORDER BY cree_le DESC LIMIT 50)`,
      [id],
    );
  });
}

export async function depublier(id: number) {
  await requete(`UPDATE pages SET statut = 'brouillon', modifie_le = now() WHERE id = $1`, [id]);
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
  await requete(
    `UPDATE pages
        SET titre = $2, chemin = $3, meta_titre = NULLIF($4, ''),
            meta_description = NULLIF($5, ''), meta_image = NULLIF($6, ''),
            hors_indexation = $7, modifie_le = now()
      WHERE id = $1`,
    [
      id,
      d.titre.trim(),
      normaliserChemin(d.chemin),
      d.metaTitre,
      d.metaDescription,
      d.metaImage.trim(),
      d.horsIndexation,
    ],
  );
}

export async function supprimerPage(id: number) {
  await requete('DELETE FROM pages WHERE id = $1', [id]);
}

export async function listerVersions(pageId: number) {
  return requete<{ id: number; titre: string; cree_le: Date; auteur: string | null }>(
    `SELECT v.id, v.titre, v.cree_le, u.nom AS auteur
       FROM versions v
       LEFT JOIN utilisateurs u ON u.id = v.auteur_id
      WHERE v.page_id = $1
      ORDER BY v.cree_le DESC`,
    [pageId],
  );
}

/** Remet une version d'avant dans le brouillon, sans rien publier. */
export async function restaurerVersion(pageId: number, versionId: number) {
  const v = await ligne<{ sections: Section[] }>(
    'SELECT sections FROM versions WHERE id = $1 AND page_id = $2',
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
