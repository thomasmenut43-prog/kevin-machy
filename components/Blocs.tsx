import Link from 'next/link';
import type { ReactNode } from 'react';
import { Photo, PhotoPleinEcran } from './Photo';
import { Reveal } from './Reveal';
import { TEMOIGNAGES } from '@/lib/site';
import type { ImageName } from '@/lib/images.generated';

/** En-tête de section : numéro, surtitre, titre, et un chapô facultatif à droite. */
export function EnteteSection({
  numero,
  surtitre,
  titre,
  chapo,
  large = false,
}: {
  numero: string;
  surtitre: string;
  titre: ReactNode;
  chapo?: ReactNode;
  large?: boolean;
}) {
  return (
    <Reveal as="header" className="entete-section">
      <div>
        <p className="surtitre">
          <span className="surtitre__num">{numero}</span>
          <span>{surtitre}</span>
        </p>
        <h2 className={`h2 ${large ? 'h2-large' : ''}`} style={{ marginTop: 'clamp(20px, 2.4vw, 32px)' }}>
          {titre}
        </h2>
      </div>
      {chapo ? <div className="corps">{chapo}</div> : null}
    </Reveal>
  );
}

/**
 * Bandeau photographique pleine largeur, révélé par un voile qui se lève.
 * Un seul par section : c'est une respiration, pas un motif.
 */
export function Bande({
  wide,
  tall,
  alt,
  legende,
}: {
  wide: ImageName;
  tall: ImageName;
  alt: string;
  legende?: string;
}) {
  return (
    <div>
      <Reveal mode="voile" className="bande bande-haute">
        <PhotoPleinEcran wide={wide} tall={tall} alt={alt} />
      </Reveal>
      {legende ? (
        <div className="wrap" style={{ marginTop: '1rem' }}>
          <p className="legende">{legende}</p>
        </div>
      ) : null}
    </div>
  );
}

/** Appel à l'action, toujours précédé d'un moment de noir. */
export function AppelAction({
  titre,
  texte,
  actions,
}: {
  titre: ReactNode;
  texte: ReactNode;
  actions: { href: string; label: string; externe?: boolean; fantome?: boolean }[];
}) {
  return (
    <>
      <div className="silence" aria-hidden="true" />
      <section className="wrap section-serree">
        <Reveal>
          <h2 className="h2 h2-large">{titre}</h2>
          <div className="corps" style={{ marginTop: 'clamp(20px, 2.4vw, 30px)' }}>
            {texte}
          </div>
          <div className="actions" style={{ marginTop: 'clamp(32px, 4vw, 48px)' }}>
            {actions.map((a) =>
              a.externe ? (
                <a
                  key={a.href + a.label}
                  className={`bouton ${a.fantome ? 'bouton-fantome' : ''}`}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {a.label}
                </a>
              ) : (
                <Link
                  key={a.href + a.label}
                  className={`bouton ${a.fantome ? 'bouton-fantome' : ''}`}
                  href={a.href}
                >
                  {a.label}
                </Link>
              ),
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
}

/** Les trois avis relevés sur le site actuel. Textes non modifiés. */
export function Temoignages() {
  return (
    <ul className="trio">
      {TEMOIGNAGES.map((t, i) => (
        <Reveal key={t.auteur} as="li" retard={i * 110}>
          <figure className="citation">
            <blockquote>« {t.texte} »</blockquote>
            <figcaption>
              <b>{t.auteur}</b>
              {t.contexte}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </ul>
  );
}

/** Image simple accompagnée d'une légende, sans cadre ni ombre. */
export function Figure({
  name,
  alt,
  legende,
  sizes,
  retard = 0,
}: {
  name: ImageName;
  alt: string;
  legende?: string;
  sizes: string;
  retard?: number;
}) {
  return (
    <Reveal as="figure" className="figure" retard={retard}>
      <Photo name={name} alt={alt} sizes={sizes} />
      {legende ? <figcaption className="legende">{legende}</figcaption> : null}
    </Reveal>
  );
}
