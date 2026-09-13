import 'server-only';
import { createHash } from 'node:crypto';
import { ligne, requete } from './bdd';

/**
 * Mesure d'audience, sans cookie et sans adresse IP enregistrée.
 *
 * Le visiteur est reconnu dans la journée par une empreinte calculée à la
 * volée : `sha256(adresse + navigateur + secret + date)`, tronquée. Trois
 * propriétés en découlent, et ce sont elles qui dispensent le site de bandeau
 * de consentement :
 *
 * - elle ne se stocke jamais en clair, l'adresse n'entre pas en base ;
 * - elle change chaque nuit, donc ne suit personne d'un jour à l'autre ;
 * - elle ne s'inverse pas, le secret du serveur manquant à qui lirait la base.
 *
 * En échange, un visiteur qui revient deux jours de suite compte pour deux. Pour
 * un site vitrine, c'est sans importance, et c'est le bon prix à payer.
 */

const NOMS_EVENEMENTS = ['reservation', 'appel', 'contact', 'acces-clients'] as const;
export type NomEvenement = (typeof NOMS_EVENEMENTS)[number];

export function empreinteVisiteur(adresse: string, navigateur: string) {
  const secret = process.env.CLE_CHIFFREMENT ?? 'sel-de-developpement';
  const jour = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${adresse}|${navigateur}|${secret}|${jour}`).digest('hex').slice(0, 32);
}

/** Le domaine du référent seulement : une adresse complète peut contenir la recherche tapée. */
export function sourceDepuis(referent: string | null, hote: string | null) {
  if (!referent) return 'direct';
  try {
    const domaine = new URL(referent).hostname.replace(/^www\./, '');
    if (!domaine || (hote && domaine === hote.replace(/^www\./, ''))) return 'direct';
    return domaine.slice(0, 120);
  } catch {
    return 'direct';
  }
}

export const estMobile = (navigateur: string) => /Mobi|Android|iPhone|iPad/i.test(navigateur);

export async function enregistrerVisite(v: {
  chemin: string;
  visiteur: string;
  source: string;
  mobile: boolean;
}) {
  await requete(
    `INSERT INTO visites (jour, chemin, visiteur, source, appareil)
     VALUES (current_date, $1, $2, $3, $4)`,
    [v.chemin.slice(0, 300), v.visiteur, v.source, v.mobile ? 'mobile' : 'ordinateur'],
  );
}

export async function enregistrerEvenement(e: {
  nom: string;
  chemin: string;
  visiteur: string;
}) {
  if (!NOMS_EVENEMENTS.includes(e.nom as NomEvenement)) return;
  await requete(
    'INSERT INTO evenements (jour, nom, chemin, visiteur) VALUES (current_date, $1, $2, $3)',
    [e.nom, e.chemin.slice(0, 300), e.visiteur],
  );
}

// —————————————————————————— Lecture ——————————————————————————

export type Jour = { jour: string; visiteurs: number; vues: number };

export type Audience = {
  jours: Jour[];
  visiteurs: number;
  vues: number;
  /** Variation en pourcentage face à la période précédente, `null` si elle est vide. */
  variationVisiteurs: number | null;
  variationVues: number | null;
  sources: { nom: string; vues: number }[];
  pages: { chemin: string; vues: number }[];
  mobile: number;
  ordinateur: number;
  evenements: { nom: string; total: number }[];
};

export async function lireAudience(jours: number): Promise<Audience> {
  // Série complète, trous compris : un jour sans visite doit valoir zéro et non
  // disparaître, sinon la courbe ment sur la forme de la fréquentation.
  const serie = await requete<{ jour: string; visiteurs: string; vues: string }>(
    `SELECT to_char(d.jour, 'YYYY-MM-DD') AS jour,
            count(DISTINCT v.visiteur)::text AS visiteurs,
            count(v.id)::text AS vues
       FROM generate_series(current_date - ($1::int - 1), current_date, '1 day') AS d(jour)
       LEFT JOIN visites v ON v.jour = d.jour
      GROUP BY d.jour
      ORDER BY d.jour`,
    [jours],
  );

  const totaux = await ligne<{ visiteurs: string; vues: string }>(
    `SELECT count(DISTINCT visiteur)::text AS visiteurs, count(*)::text AS vues
       FROM visites WHERE jour > current_date - $1::int`,
    [jours],
  );

  const precedents = await ligne<{ visiteurs: string; vues: string }>(
    `SELECT count(DISTINCT visiteur)::text AS visiteurs, count(*)::text AS vues
       FROM visites
      WHERE jour > current_date - ($1::int * 2) AND jour <= current_date - $1::int`,
    [jours],
  );

  const sources = await requete<{ nom: string; vues: string }>(
    `SELECT source AS nom, count(*)::text AS vues
       FROM visites WHERE jour > current_date - $1::int
      GROUP BY source ORDER BY count(*) DESC LIMIT 8`,
    [jours],
  );

  const pages = await requete<{ chemin: string; vues: string }>(
    `SELECT chemin, count(*)::text AS vues
       FROM visites WHERE jour > current_date - $1::int
      GROUP BY chemin ORDER BY count(*) DESC LIMIT 8`,
    [jours],
  );

  const appareils = await requete<{ appareil: string; vues: string }>(
    `SELECT appareil, count(*)::text AS vues
       FROM visites WHERE jour > current_date - $1::int GROUP BY appareil`,
    [jours],
  );

  const evenements = await requete<{ nom: string; total: string }>(
    `SELECT nom, count(*)::text AS total
       FROM evenements WHERE jour > current_date - $1::int
      GROUP BY nom ORDER BY count(*) DESC`,
    [jours],
  );

  const n = (v: string | undefined) => Number(v ?? 0);
  const variation = (avant: number, apres: number) =>
    avant === 0 ? null : Math.round(((apres - avant) / avant) * 100);

  return {
    jours: serie.map((j) => ({ jour: j.jour, visiteurs: n(j.visiteurs), vues: n(j.vues) })),
    visiteurs: n(totaux?.visiteurs),
    vues: n(totaux?.vues),
    variationVisiteurs: variation(n(precedents?.visiteurs), n(totaux?.visiteurs)),
    variationVues: variation(n(precedents?.vues), n(totaux?.vues)),
    sources: sources.map((s) => ({ nom: s.nom, vues: n(s.vues) })),
    pages: pages.map((p) => ({ chemin: p.chemin, vues: n(p.vues) })),
    mobile: n(appareils.find((a) => a.appareil === 'mobile')?.vues),
    ordinateur: n(appareils.find((a) => a.appareil === 'ordinateur')?.vues),
    evenements: evenements.map((e) => ({ nom: e.nom, total: n(e.total) })),
  };
}

/** Efface les visites de plus de deux ans : on n'a pas besoin d'en garder davantage. */
export async function purgerAudience() {
  await requete("DELETE FROM visites WHERE jour < current_date - 730");
  await requete("DELETE FROM evenements WHERE jour < current_date - 730");
}
