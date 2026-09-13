import 'server-only';
import { ligne, requete } from './bdd';
import type { Entreprise } from './modeles';
import { HORAIRES, LIENS, SITE, ZONE } from './site';

export type { Entreprise, Horaire } from './modeles';
export { telephoneInternational, telephoneUri } from './modeles';

/**
 * L'entreprise : ce que Kevin est, où il est, comment on le joint.
 *
 * Ces valeurs vivaient dans `lib/site.ts`, c'est-à-dire dans le code : changer
 * un numéro de téléphone demandait une modification et une reconstruction.
 * Elles vivent désormais en base, et `lib/site.ts` n'en garde que les valeurs
 * par défaut — celles relevées sur le site actuel.
 *
 * Le défaut n'est pas un détail de confort : tant que Kevin n'a rien saisi, le
 * site affiche exactement ce qu'il affichait avant, et une base vide ou
 * injoignable ne le laisse jamais sans coordonnées.
 */

const CLE = 'entreprise';

/** Les valeurs relevées sur le site actuel. Voir `contenu-source.md`. */
export const ENTREPRISE_DEFAUT: Entreprise = {
  nom: SITE.nom,
  role: SITE.role,
  description:
    'Photographe professionnel et Artisan d’Art au Puy-en-Velay. Mariages, portraits et Studio de l’Iris en Haute-Loire et dans la Loire. Des images où vous vous reconnaissez.',
  raisonSociale: '',
  siret: '',
  url: SITE.url,
  adresse: SITE.adresse,
  codePostal: SITE.codePostal,
  ville: SITE.ville,
  region: SITE.region,
  zone: ZONE,
  telephone: SITE.telephone,
  email: SITE.email,
  latitude: String(SITE.geo.lat),
  longitude: String(SITE.geo.lon),
  directeurPublication: SITE.nom,
  hebergeurNom: '',
  hebergeurAdresse: '',
  hebergeurSite: '',
  mediateurNom: '',
  mediateurSite: '',
  liens: {
    accesClients: LIENS.accesClients,
    reservation: LIENS.reservation,
    instagram: LIENS.instagram,
    facebook: LIENS.facebook,
    linkedin: LIENS.linkedin,
    youtube: LIENS.youtube,
    avis: LIENS.avis,
    // Les pages légales vivent désormais sur le site : ces liens pointent chez
    // lui, et non plus vers l'ancien domaine qui s'éteindra.
    mentions: '/mentions-legales/',
    cgv: '/conditions-generales-de-vente/',
    cookies: '/politique-de-confidentialite/',
  },
  horaires: HORAIRES.map((h) => ({ jour: h.jour, ouverture: h.ouverture })),
};

/**
 * Lit l'entreprise, en complétant par les valeurs par défaut.
 *
 * Un champ jamais saisi, ou ajouté après coup au formulaire, retombe sur le
 * défaut plutôt que sur une chaîne vide : le site n'affiche pas de trou.
 */
export async function lireEntreprise(): Promise<Entreprise> {
  let enregistre: Partial<Entreprise> = {};
  try {
    const l = await ligne<{ valeur: Partial<Entreprise> }>(
      'SELECT valeur FROM reglages WHERE cle = $1',
      [CLE],
    );
    enregistre = l?.valeur ?? {};
  } catch {
    // Base injoignable : le site garde ses coordonnées plutôt que de perdre
    // son pied de page. C'est le même parti pris que le menu de l'en-tête.
    return ENTREPRISE_DEFAUT;
  }

  return {
    ...ENTREPRISE_DEFAUT,
    ...enregistre,
    liens: { ...ENTREPRISE_DEFAUT.liens, ...(enregistre.liens ?? {}) },
    horaires:
      enregistre.horaires && enregistre.horaires.length
        ? enregistre.horaires
        : ENTREPRISE_DEFAUT.horaires,
  };
}

export async function majEntreprise(valeurs: Entreprise) {
  await requete(
    `INSERT INTO reglages (cle, valeur, modifie_le) VALUES ($1, $2, now())
     ON CONFLICT (cle) DO UPDATE SET valeur = $2, modifie_le = now()`,
    [CLE, JSON.stringify(valeurs)],
  );
}
