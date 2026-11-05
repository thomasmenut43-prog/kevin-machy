/**
 * Ce qu'un script doit faire avant de réécrire une page : la ranger dans
 * l'historique.
 *
 * L'éditeur le fait à chaque publication (`publier()` dans `lib/pages.ts`). Les
 * scripts, eux, écrivaient `pages.sections` directement. Constaté le
 * 5 novembre 2026 : la page d'accueil n'avait que des versions du
 * 13 septembre, alors que les photos, les prestations, les ancres et les liens
 * avaient été posés depuis par script. Restaurer la plus récente ramenait le
 * site de mi-septembre, et rien à l'écran ne le laissait deviner.
 *
 * Désormais l'état qui part est archivé, dans la même transaction que
 * l'écriture : soit les deux passent, soit aucun. La version n'a pas d'auteur
 * (`auteur_id` NULL) ; l'onglet Versions l'affiche comme une mise à jour
 * technique.
 *
 *   await avecHistorique(connexion, page.id, () =>
 *     connexion.query('UPDATE pages SET sections = ? WHERE id = ?', [json, page.id]),
 *   );
 *
 * Seulement pour une page qui existe déjà : une page créée n'a rien à archiver.
 */

/** Le même plafond que l'éditeur : au-delà de cinquante, plus personne ne remonte. */
const VERSIONS_GARDEES = 50;

/**
 * Déballe une colonne JSON jusqu'à trouver un tableau.
 *
 * MariaDB rend ses colonnes JSON en texte, et l'ancien `publier()` en a rangé
 * certaines encodées deux fois. Même logique que `sectionsDeLaVersion` dans
 * `lib/pages.ts`, recopiée ici : les scripts ne chargent pas le code du site.
 */
export function sectionsDeLaBase(brut) {
  let valeur = brut;
  for (let tour = 0; tour < 3 && !Array.isArray(valeur); tour++) {
    if (valeur instanceof Uint8Array) valeur = new TextDecoder().decode(valeur);
    if (typeof valeur !== 'string') break;
    valeur = JSON.parse(valeur);
  }
  if (!Array.isArray(valeur)) throw new Error('Sections illisibles : ce n’est pas un tableau.');
  return valeur;
}

/**
 * Exécute `ecrire` après avoir archivé l'état actuel de la page, le tout dans
 * une transaction. Une erreur annule l'archive comme l'écriture.
 */
export async function avecHistorique(connexion, pageId, ecrire) {
  await connexion.beginTransaction();
  try {
    // `FOR UPDATE` : personne ne publie la page entre notre lecture et notre
    // écriture. Sans ce verrou, l'archive pourrait décrire un état déjà parti.
    const [[page]] = await connexion.query(
      'SELECT titre, sections FROM pages WHERE id = ? FOR UPDATE',
      [pageId],
    );
    if (!page) throw new Error(`Page ${pageId} introuvable : rien n’a été écrit.`);

    await connexion.query(
      'INSERT INTO versions (page_id, titre, sections, auteur_id) VALUES (?, ?, ?, NULL)',
      [pageId, page.titre, JSON.stringify(sectionsDeLaBase(page.sections))],
    );

    const resultat = await ecrire();

    // Même élagage que `publier()`, et la même enveloppe : MySQL refuse de
    // lire la table qu'il efface, et refuse un LIMIT dans un IN.
    await connexion.query(
      `DELETE FROM versions
        WHERE page_id = ?
          AND id NOT IN (
            SELECT id FROM (
              SELECT id FROM versions WHERE page_id = ? ORDER BY cree_le DESC, id DESC LIMIT ?
            ) AS recentes
          )`,
      [pageId, pageId, VERSIONS_GARDEES],
    );

    await connexion.commit();
    return resultat;
  } catch (erreur) {
    await connexion.rollback();
    throw erreur;
  }
}
