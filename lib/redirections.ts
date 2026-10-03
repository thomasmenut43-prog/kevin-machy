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
 * ---
 *
 * **Le domaine ne change pas ; les adresses, si.** Cette table a d'abord été
 * écrite pour un déménagement vers `kevinmachy.fr` — chaque règle portait alors
 * une condition sur le domaine d'arrivée et une destination absolue. Le
 * déménagement est annulé : le site reste à `dronezvous.com`, et ces règles ne
 * franchissent plus de frontière. Elles traduisent d'anciennes adresses en
 * nouvelles, sur le même domaine.
 *
 * Deux entrées ont disparu à cette occasion : `/` et `/mentions-legales/`
 * existent à l'identique des deux côtés. Les garder aurait fait boucler une
 * page sur elle-même.
 *
 * Tant que `dronezvous.com` ne désigne pas le Worker, ces règles ne servent
 * qu'au domaine provisoire — elles y sont inoffensives, aucune de ces adresses
 * n'existe sur le nouveau site.
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
  // `/mentions-legales/` garde son adresse : l'ancienne page cumulait mentions
  // **et** politique de confidentialité, et le nouveau site les sépare, mais
  // c'est bien aux mentions que l'adresse mène. Rien à rediriger.
  {
    // Rapprochement le plus honnête : les deux parlent du traitement des
    // données. Ce n'est pas un équivalent exact, mais un visiteur qui cherche
    // l'un trouve l'autre.
    de: '/politique-de-cookies-ue/',
    vers: '/politique-de-confidentialite/',
  },

  // ——— Les cinq prestations reprises en octobre 2026
  //
  // Elles étaient dans `SANS_EQUIVALENT` : l'ancien site les vendait, le
  // nouveau n'en parlait pas, et elles auraient répondu « page introuvable »
  // le jour de la bascule. Elles ont désormais chacune leur page.
  { de: '/photographe-corporate-haute-loire/', vers: '/entreprise/' },
  { de: '/drone-btp-suivi-chantier/', vers: '/drone/' },
  { de: '/location-de-photobooth/', vers: '/photobooth/' },
  { de: '/formation-photographie-haute-loire/', vers: '/formation/' },
  { de: '/photos-a-vendre/', vers: '/tirages/' },

  {
    // « Photographe de mariage, portrait & entreprise en Haute-Loire » : une
    // page chapeau qui présentait les métiers. Elle renvoyait vers l'accueil
    // faute de mieux ; `/prestations/` fait exactement le même travail, et
    // Google retrouve donc une page qui traite du même sujet.
    de: '/photographe-professionnel-haute-loire/',
    vers: '/prestations/',
  },

  // ——— Un rapprochement assumé
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
 * les oublier.
 *
 * Elles étaient huit. Les cinq prestations que Kevin vend — entreprise, drone,
 * photobooth, formation, tirages — ont reçu leur page en octobre 2026 et sont
 * passées dans la table ci-dessus. Restent le blog et deux articles : du
 * contenu éditorial, que le nouveau site n'a pas vocation à reprendre tel quel
 * et dont la republication se décide avec Kevin.
 *
 * Tant que la décision n'est pas prise, elles répondront « page introuvable ».
 * C'est désagréable, mais moins trompeur que de les renvoyer vers l'accueil :
 * un visiteur qui cherchait un photobooth n'a rien à faire sur une page de
 * mariage, et Google ne transmettrait rien de toute façon.
 */
export const SANS_EQUIVALENT: ReadonlyArray<{ adresse: string; sujet: string; mots: number }> = [
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
