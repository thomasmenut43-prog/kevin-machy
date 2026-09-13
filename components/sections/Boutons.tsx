import Link from 'next/link';

type Bouton = { libelle?: string | null; lien?: string | null; fantome?: boolean | null };

/**
 * Les boutons d'une section.
 *
 * Une adresse commençant par http part vers l'extérieur et s'ouvre dans un
 * nouvel onglet ; tout le reste reste dans le site et passe par la navigation
 * interne, qui ne recharge pas la page.
 */
export function Boutons({ boutons }: { boutons?: Bouton[] | null }) {
  const utiles = (boutons ?? []).filter((b) => b?.libelle && b?.lien);
  if (!utiles.length) return null;

  return (
    <div className="actions">
      {utiles.map((b, i) => {
        const classe = `bouton${b.fantome ? ' bouton-fantome' : ''}`;
        const externe = /^https?:\/\//i.test(b.lien!);

        return externe ? (
          <a key={i} className={classe} href={b.lien!} target="_blank" rel="noopener noreferrer">
            {b.libelle}
          </a>
        ) : (
          <Link key={i} className={classe} href={b.lien!}>
            {b.libelle}
          </Link>
        );
      })}
    </div>
  );
}
