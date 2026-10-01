/**
 * Ce que devient chaque adresse de l'ancien site.
 *
 * `dronezvous.com` portait dix-neuf pages indexées, construites et optimisées
 * sur plusieurs années. Les abandonner sans rien dire, c'est jeter ce
 * référencement : Google met des mois à retirer des pages mortes, pendant
 * lesquels il envoie des visiteurs sur des erreurs.
 *
 * Une redirection **permanente** transmet au contraire l'ancienneté et les
 * liens entrants vers la nouvelle adresse. C'est le seul mécanisme qui conserve
 * ce qui a été acquis.
 *
 * Elles ne s'appliquent qu'aux requêtes arrivant sur l'ancien domaine : tant
 * que `dronezvous.com` ne désigne pas le Worker, cette table ne fait rien.
 * Elle peut donc être écrite et relue longtemps avant la bascule.
 *
 * ---
 *
 * **Toute redirection doit mener à une page qui traite du même sujet.** Google
 * considère une redirection vers un contenu sans rapport — l'accueil, le plus
 * souvent — comme une page introuvable déguisée, et ne transmet rien. Mieux
 * vaut alors assumer l'erreur : au moins elle est honnête, et le classement
 * s'éteint au lieu de pourrir.
 *
 * C'est pourquoi cette table est incomplète, et c'est volontaire. Voir
 * `SANS_EQUIVALENT` plus bas.
 */
export const REDIRECTIONS: ReadonlyArray<{ de: string; vers: string; note?: string }> = [
  { de: '/', vers: '/' },

  // ——— Les trois univers que le nouveau site reprend
  { de: '/photographe-mariage-haute-loire/', vers: '/mariage/' },
  { de: '/photographe-portrait-haute-loire/', vers: '/portrait/' },
  { de: '/photographies-diris/', vers: '/studio-de-l-iris/' },

  // ——— Pages de service
  { de: '/a-propos-kevin-machy-photographe-et-pilote-de-drone/', vers: '/a-propos/' },
  { de: '/contact-photographe-haute-loire/', vers: '/contact/' },

  // ——— Juridique
  {
    de: '/cgv/',
    vers: '/conditions-generales-de-vente/',
  },
  {
    // L'ancienne page cumulait mentions légales **et** politique de
    // confidentialité. Le nouveau site les sépare : on envoie vers les mentions,
    // qui portent le même titre, et la page de confidentialité est accessible
    // depuis le pied.
    de: '/mentions-legales/',
    vers: '/mentions-legales/',
  },
  {
    // Rapprochement le plus honnête : les deux parlent du traitement des
    // données. Ce n'est pas un équivalent exact, mais un visiteur qui cherche
    // l'un trouve l'autre.
    de: '/politique-de-cookies-ue/',
    vers: '/politique-de-confidentialite/',
  },

  // ——— Deux rapprochements assumés
  {
    // « Photographe de mariage, portrait & entreprise en Haute-Loire » : une
    // page chapeau qui présentait les trois métiers. L'accueil fait la même
    // chose sur le nouveau site.
    de: '/photographe-professionnel-haute-loire/',
    vers: '/',
    note: 'page chapeau, sans équivalent dédié',
  },
  {
    // 1 442 mots de témoignages. Le nouveau site les a intégrés à l'accueil,
    // dans « Ce sont eux qui en parlent le mieux », plutôt qu'en page séparée.
    de: '/temoignages/',
    vers: '/',
    note: 'devenu une section de l’accueil',
  },
];

/**
 * Les adresses qu'on ne sait pas où envoyer.
 *
 * Elles ne sont pas oubliées : elles sont listées ici pour qu'on ne puisse pas
 * les oublier. Chacune correspond à une activité que Kevin vend aujourd'hui et
 * dont le nouveau site ne parle pas.
 *
 * Tant que la décision n'est pas prise, elles répondront « page introuvable ».
 * C'est désagréable, mais moins trompeur que de les renvoyer vers l'accueil :
 * un visiteur qui cherchait un photobooth n'a rien à faire sur une page de
 * mariage, et Google ne transmettrait rien de toute façon.
 */
export const SANS_EQUIVALENT: ReadonlyArray<{ adresse: string; sujet: string; mots: number }> = [
  { adresse: '/photographe-corporate-haute-loire/', sujet: 'photographie d’entreprise', mots: 1075 },
  { adresse: '/drone-btp-suivi-chantier/', sujet: 'inspection par drone, suivi de chantier', mots: 845 },
  { adresse: '/location-de-photobooth/', sujet: 'location de photobooth', mots: 944 },
  { adresse: '/formation-photographie-haute-loire/', sujet: 'formation à la photographie', mots: 780 },
  { adresse: '/photos-a-vendre/', sujet: 'tirages d’art en édition limitée', mots: 747 },
  { adresse: '/blog/', sujet: 'le blog', mots: 672 },
  {
    adresse: '/kevin-machy-laureat-du-wedding-award-2025/',
    sujet: 'article — lauréat du Wedding Award 2025',
    mots: 940,
  },
  {
    adresse: '/photographie-diris-pourquoi-cette-tendance-cartonne-en-2025/',
    sujet: 'article — la photographie d’iris',
    mots: 1106,
  },
];
