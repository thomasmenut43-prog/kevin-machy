import 'server-only';
import { ligne, poserReglage, requete } from './bdd';
import type { LienNav, PiedDePage } from './modeles';
import { NAV } from './site';

export type { PiedDePage } from './modeles';

/**
 * Le pied de page, réglé depuis l'éditeur.
 *
 * Il était écrit dans le composant : la phrase de présentation, la liste des
 * pages, le bloc des photos d'identité. Changer une virgule demandait une
 * modification du code et une reconstruction du site.
 *
 * Ce qu'il affiche des coordonnées vient, lui, de l'entreprise — une seule
 * saisie, un seul endroit. Ici ne vivent que les textes du pied et les
 * interrupteurs qui décident de ce qu'on montre.
 */

const CLE = 'pied';

/** Le pied tel qu'il était écrit en dur, jusqu'ici. */
export const PIED_PAR_DEFAUT: PiedDePage = {
  signature:
    'Photographe professionnel et Artisan d’Art, basé au Puy-en-Velay. Je photographie surtout des gens.',
  reseauxActifs: true,
  site: {
    titre: 'Le site',
    menu: NAV.map((n) => ({ chemin: n.href.replace(/^\/|\/$/g, ''), libelle: n.label })),
  },
  joindre: {
    titre: 'Me joindre',
    telephone: true,
    email: true,
    acces: true,
    reservation: true,
    adresse: true,
  },
  encadre: {
    actif: true,
    titre: 'Photos d’identité',
    texte:
      'Photos d’identité agréées ANTS pour carte d’identité, passeport, permis de conduire et visa. À partir de 10 € la planche de 6 photos, uniquement sur rendez-vous au Puy-en-Velay.',
    lien: true,
    zone: true,
  },
};

/**
 * Lit le pied, libellés résolus.
 *
 * Comme pour la barre de navigation : un lien sans libellé prend le titre de sa
 * page, et une page dépubliée quitte la liste plutôt que d'y laisser un lien
 * mort. Une base injoignable rend le pied écrit en dur, jamais un pied vide.
 */
export async function lirePied(): Promise<PiedDePage> {
  try {
    const [enregistre, pages] = await Promise.all([
      ligne<{ valeur: Partial<PiedDePage> }>('SELECT valeur FROM reglages WHERE cle = ?', [CLE]),
      requete<{ chemin: string; titre: string }>(
        "SELECT chemin, titre FROM pages WHERE statut = 'publie'",
      ),
    ]);

    const v = enregistre?.valeur ?? {};
    const titres = new Map(pages.map((p) => [p.chemin, p.titre]));
    const menu = (v.site?.menu ?? PIED_PAR_DEFAUT.site.menu)
      .filter((l) => titres.has(l.chemin))
      .map((l) => ({ chemin: l.chemin, libelle: l.libelle?.trim() || titres.get(l.chemin)! }));

    return {
      signature: v.signature ?? PIED_PAR_DEFAUT.signature,
      reseauxActifs: v.reseauxActifs ?? PIED_PAR_DEFAUT.reseauxActifs,
      site: { titre: v.site?.titre || PIED_PAR_DEFAUT.site.titre, menu },
      joindre: { ...PIED_PAR_DEFAUT.joindre, ...(v.joindre ?? {}) },
      encadre: { ...PIED_PAR_DEFAUT.encadre, ...(v.encadre ?? {}) },
    };
  } catch {
    return PIED_PAR_DEFAUT;
  }
}

/** Ce que l'éditeur enregistre. Nettoyé ici : rien n'arrive de confiance. */
export async function ecrirePied(entrant: Partial<PiedDePage>): Promise<PiedDePage> {
  const pages = await requete<{ chemin: string }>('SELECT chemin FROM pages');
  const connus = new Set(pages.map((p) => p.chemin));

  const texte = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const oui = (v: unknown, defaut: boolean) => (typeof v === 'boolean' ? v : defaut);
  const vus = new Set<string>();

  const propre: PiedDePage = {
    signature: texte(entrant.signature, 300),
    reseauxActifs: oui(entrant.reseauxActifs, true),
    site: {
      titre: texte(entrant.site?.titre, 40) || PIED_PAR_DEFAUT.site.titre,
      // Une page ne peut figurer qu'une fois, et seulement si elle existe :
      // un lien de pied de page qui tombe à côté est un lien mort de plus.
      menu: (Array.isArray(entrant.site?.menu) ? entrant.site.menu : ([] as LienNav[]))
        .filter(
          (l) =>
            l && connus.has(String(l.chemin)) && !vus.has(String(l.chemin)) && vus.add(String(l.chemin)),
        )
        .slice(0, 10)
        .map((l) => ({ chemin: String(l.chemin), libelle: texte(l.libelle, 40) })),
    },
    joindre: {
      titre: texte(entrant.joindre?.titre, 40) || PIED_PAR_DEFAUT.joindre.titre,
      telephone: oui(entrant.joindre?.telephone, true),
      email: oui(entrant.joindre?.email, true),
      acces: oui(entrant.joindre?.acces, true),
      reservation: oui(entrant.joindre?.reservation, true),
      adresse: oui(entrant.joindre?.adresse, true),
    },
    encadre: {
      actif: oui(entrant.encadre?.actif, true),
      titre: texte(entrant.encadre?.titre, 60),
      texte: texte(entrant.encadre?.texte, 600),
      lien: oui(entrant.encadre?.lien, true),
      zone: oui(entrant.encadre?.zone, true),
    },
  };

  await poserReglage(CLE, propre);

  return lirePied();
}
