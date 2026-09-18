/**
 * Ce que le site affiche quand sa base ne répond pas.
 *
 * Le contenu des pages vit en base depuis la conversion : sans elle, il n'y a
 * rien à montrer. Trois issues étaient possibles — une erreur 500 brute, une
 * construction qui s'arrête, ou cette page. On choisit celle-ci, pour deux
 * raisons.
 *
 * D'abord un visiteur ne doit jamais tomber sur une trace d'exécution. Ensuite
 * une construction lancée sans base — un environnement de démonstration, un
 * déploiement monté avant la base — doit pouvoir aboutir : elle produira ce
 * cadre, remplacé par le vrai contenu dès que la base répond, sans qu'il faille
 * reconstruire (voir `revalidate` sur les pages).
 *
 * La page se déclare hors indexation là où elle est rendue : Google ne doit
 * pas garder en mémoire un site « en cours d'installation ».
 */
export function SiteIndisponible() {
  return (
    <section className="wrap section">
      <div style={{ maxWidth: '40ch' }}>
        <h1 className="titre-section">Le site revient dans un instant</h1>
        <p className="corps" style={{ marginTop: '1rem' }}>
          Ses pages ne sont pas joignables pour le moment. Ce n’est pas votre connexion, et rien
          n’est perdu : réessayez dans quelques minutes.
        </p>
      </div>
    </section>
  );
}

/** Les métadonnées de cette page-là : jamais d'indexation d'un site en attente. */
export const METADONNEES_INDISPONIBLE = {
  title: 'Le site revient dans un instant',
  robots: { index: false, follow: false },
} as const;
