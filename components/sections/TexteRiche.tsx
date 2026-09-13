import Link from 'next/link';
import type { BlocTexte, Fragment } from '@/lib/texteRiche';

/**
 * Affiche un texte riche.
 *
 * Chaque fragment devient une balise choisie ici, jamais une chaîne interprétée
 * comme du HTML : `dangerouslySetInnerHTML` n'apparaît nulle part, et c'est
 * volontaire. Ce que Kevin tape reste du texte, quoi qu'il tape.
 */
export function TexteRiche({
  doc,
  className,
  champ = 'texte',
}: {
  doc?: unknown;
  className?: string;
  /** Le champ d'où vient ce texte : l'aperçu s'en sert pour ouvrir le bon
      réglage quand Kevin clique dessus. */
  champ?: string;
}) {
  if (!Array.isArray(doc) || doc.length === 0) return null;
  const blocs = doc as BlocTexte[];

  const rendu: React.ReactNode[] = [];
  let i = 0;

  while (i < blocs.length) {
    const bloc = blocs[i];

    if (bloc.type === 'liste' || bloc.type === 'listeNumerotee') {
      // Les puces qui se suivent forment une seule liste : sinon le navigateur
      // affiche une suite de listes d'un élément, mal espacées.
      const type = bloc.type;
      const items: BlocTexte[] = [];
      while (i < blocs.length && blocs[i].type === type) items.push(blocs[i++]);

      const Balise = type === 'listeNumerotee' ? 'ol' : 'ul';
      rendu.push(
        <Balise key={`l${i}`} className={type === 'liste' ? 'liste-pointee' : undefined}>
          {items.map((item, n) => (
            <li key={n}>
              <Fragments fragments={item.fragments} />
            </li>
          ))}
        </Balise>,
      );
      continue;
    }

    rendu.push(
      <p key={i}>
        <Fragments fragments={bloc.fragments} />
      </p>,
    );
    i++;
  }

  return (
    <div className={className} data-champ={champ}>
      {rendu}
    </div>
  );
}

function Fragments({ fragments }: { fragments?: Fragment[] }) {
  if (!fragments?.length) return null;

  return (
    <>
      {fragments.map((f, i) => {
        let contenu: React.ReactNode = f.texte;
        if (f.gras) contenu = <strong key="g">{contenu}</strong>;
        if (f.italique) contenu = <em key="i">{contenu}</em>;

        if (f.lien) {
          const externe = /^https?:\/\//i.test(f.lien);
          return externe ? (
            <a key={i} className="lien" href={f.lien} target="_blank" rel="noopener noreferrer">
              {contenu}
            </a>
          ) : (
            <Link key={i} className="lien" href={f.lien}>
              {contenu}
            </Link>
          );
        }

        return <span key={i}>{contenu}</span>;
      })}
    </>
  );
}
