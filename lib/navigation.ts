import 'server-only';
import { ligne, poserReglage, requete, jsonDeLaBase } from './bdd';
import { lireEntreprise } from './entreprise';
import { LIENS, NAV, SITE } from './site';
import type { Navigation } from './modeles';

export type { Navigation, LienNav } from './modeles';

/**
 * La barre de navigation du site.
 *
 * Elle n'appartient à aucune page : c'est la même en haut de toutes. Elle est
 * donc rangée une fois pour toutes dans les réglages, et non dans les sections
 * d'une page — sinon il faudrait la remettre à jour six fois à chaque
 * changement, et les six finiraient par diverger.
 *
 * L'éditeur l'épingle malgré tout en tête du rail, sur chaque page : c'est là
 * qu'on la cherche quand on veut la modifier.
 */

const CLE = 'navigation';

export const NAV_PAR_DEFAUT: Navigation = {
  logoActif: true,
  logoImage: null,
  menu: NAV.map((n) => ({ chemin: n.href.replace(/^\/|\/$/g, ''), libelle: n.label })),
  telephoneActif: true,
  // Vides à dessein : la lecture les remplit avec ceux de l'entreprise. Y
  // recopier les constantes du code figerait le numéro au premier
  // enregistrement de la barre.
  telephone: '',
  accesActif: true,
  accesLibelle: 'Accès clients',
  accesLien: '',
};

/**
 * Lit la barre, libellés résolus.
 *
 * Un lien dont le libellé n'a pas été personnalisé prend le titre de sa page :
 * renommer une page dans l'éditeur renomme donc son entrée de menu, sans que
 * Kevin ait à y penser. Et une page supprimée disparaît du menu plutôt que d'y
 * laisser un lien mort.
 *
 * Le téléphone et le lien d'accès clients laissés vides prennent ceux de
 * l'entreprise : sans cela, le numéro de l'en-tête serait une copie figée de
 * celui des Paramètres, et le changer à un endroit laisserait l'autre faux.
 */
export async function lireNavigation(): Promise<Navigation> {
  const [enregistre, pages, entreprise] = await Promise.all([
    ligne<{ valeur: Partial<Navigation> }>('SELECT valeur FROM reglages WHERE cle = ?', [CLE]),
    requete<{ chemin: string; titre: string }>(
      "SELECT chemin, titre FROM pages WHERE statut = 'publie'",
    ),
    lireEntreprise(),
  ]);

  const nav = { ...NAV_PAR_DEFAUT, ...(jsonDeLaBase(enregistre?.valeur) ?? {}) };
  const titres = new Map(pages.map((p) => [p.chemin, p.titre]));

  return {
    ...nav,
    telephone: nav.telephone || entreprise.telephone,
    accesLien: nav.accesLien || entreprise.liens.accesClients,
    menu: (nav.menu ?? [])
      .filter((l) => titres.has(l.chemin))
      .map((l) => ({ chemin: l.chemin, libelle: l.libelle?.trim() || titres.get(l.chemin)! })),
  };
}

/** Ce que l'éditeur enregistre. Nettoyé ici : rien n'arrive de confiance. */
export async function ecrireNavigation(entrant: Partial<Navigation>) {
  const pages = await requete<{ chemin: string }>('SELECT chemin FROM pages');
  const connus = new Set(pages.map((p) => p.chemin));

  const texte = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const vus = new Set<string>();

  const propre: Navigation = {
    logoActif: entrant.logoActif !== false,
    logoImage: Number.isInteger(entrant.logoImage) ? (entrant.logoImage as number) : null,
    // Une page ne peut figurer qu'une fois : deux entrées identiques ne
    // seraient pas un menu, mais une erreur de manipulation.
    menu: (Array.isArray(entrant.menu) ? entrant.menu : [])
      .filter((l) => l && connus.has(String(l.chemin)) && !vus.has(String(l.chemin)) && vus.add(String(l.chemin)))
      .slice(0, 8)
      .map((l) => ({ chemin: String(l.chemin), libelle: texte(l.libelle, 40) })),
    telephoneActif: entrant.telephoneActif !== false,
    telephone: texte(entrant.telephone, 30),
    accesActif: entrant.accesActif !== false,
    accesLibelle: texte(entrant.accesLibelle, 30) || 'Accès clients',
    accesLien: /^https?:\/\//i.test(String(entrant.accesLien ?? ''))
      ? texte(entrant.accesLien, 300)
      : '',
  };

  await poserReglage(CLE, propre);

  return propre;
}
