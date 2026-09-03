'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Photo } from './Photo';
import { Reveal } from './Reveal';
import { IMAGES, type ImageName, type ImageRecord } from '@/lib/images.generated';
import s from './Gallery.module.css';

export type ItemGalerie = { name: ImageName; alt: string };

type GalerieProps = {
  items: readonly ItemGalerie[];
  /** Libellé du curseur de galerie. Doit annoncer une action. */
  action?: string;
  legende?: (index: number) => string | null;
};

function srcSet(rec: ImageRecord, ext: string) {
  return rec.widths.map((w) => `${rec.base}-${w}.${ext} ${w}w`).join(', ');
}

export function Gallery({ items, action = 'Voir' }: GalerieProps) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const curseur = useRef<HTMLDivElement>(null);
  const declencheur = useRef<HTMLButtonElement | null>(null);

  // Curseur dédié : positionné hors du cycle de rendu React, pour ne rien
  // déclencher à chaque mouvement de souris.
  useEffect(() => {
    const el = zone.current;
    const rond = curseur.current;
    if (!el || !rond) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let attente = false;
    let x = 0;
    let y = 0;

    const peindre = () => {
      attente = false;
      rond.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const auMouvement = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (attente) return;
      attente = true;
      requestAnimationFrame(peindre);
    };

    const entrer = () => rond.setAttribute('data-visible', 'true');
    const sortir = () => rond.setAttribute('data-visible', 'false');

    el.setAttribute('data-curseur', 'true');
    el.addEventListener('mousemove', auMouvement);
    el.addEventListener('mouseenter', entrer);
    el.addEventListener('mouseleave', sortir);

    return () => {
      el.removeEventListener('mousemove', auMouvement);
      el.removeEventListener('mouseenter', entrer);
      el.removeEventListener('mouseleave', sortir);
    };
  }, []);

  const fermer = useCallback(() => {
    setOuvert(null);
    declencheur.current?.focus();
  }, []);

  const deplacer = useCallback(
    (pas: number) => setOuvert((i) => (i === null ? null : (i + pas + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    if (ouvert === null) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
      if (e.key === 'ArrowRight') deplacer(1);
      if (e.key === 'ArrowLeft') deplacer(-1);
    };
    document.addEventListener('keydown', auClavier);
    return () => {
      document.body.style.overflow = precedent;
      document.removeEventListener('keydown', auClavier);
    };
  }, [ouvert, fermer, deplacer]);

  return (
    <>
      <div className={s.galerie} ref={zone}>
        {items.map((item, i) => (
          <Reveal key={item.name} mode="glissement" retard={(i % 3) * 90} className={s.element} as="div">
            <button
              type="button"
              className={s.declencheur}
              onClick={(e) => {
                declencheur.current = e.currentTarget;
                setOuvert(i);
              }}
            >
              <Photo
                name={item.name}
                alt={item.alt}
                sizes="(min-width: 860px) 42vw, 100vw"
              />
              <span className="visuellement-cache">Agrandir : {item.alt}</span>
            </button>
          </Reveal>
        ))}
      </div>

      <div className={s.curseur} ref={curseur} data-visible="false" aria-hidden="true">
        {action}
      </div>

      {ouvert !== null ? (
        <Visionneuse
          items={items}
          index={ouvert}
          onFermer={fermer}
          onDeplacer={deplacer}
        />
      ) : null}
    </>
  );
}

function Visionneuse({
  items,
  index,
  onFermer,
  onDeplacer,
}: {
  items: readonly ItemGalerie[];
  index: number;
  onFermer: () => void;
  onDeplacer: (pas: number) => void;
}) {
  const boite = useRef<HTMLDivElement>(null);

  // La visionneuse n'est montée qu'après un clic : `document` existe toujours,
  // il n'y a donc pas de rendu serveur à attendre avant d'ouvrir le portail.
  useEffect(() => {
    boite.current?.focus();
  }, []);

  const item = items[index];
  const rec: ImageRecord = IMAGES[item.name];

  return createPortal(
    <div
      className={s.visionneuse}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} sur ${items.length}`}
      ref={boite}
      tabIndex={-1}
    >
      <div className={s.visionneuseBarre}>
        <span className={s.compteur}>
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button type="button" className={s.fermer} onClick={onFermer}>
          Fermer
        </button>
      </div>

      <div className={s.scene}>
        <button type="button" className={`${s.fleche} ${s.flecheG}`} onClick={() => onDeplacer(-1)}>
          <span aria-hidden="true">←</span>
          <span className="visuellement-cache">Image précédente</span>
        </button>

        {rec.missing || !rec.base ? (
          <div className="photo-absente" role="img" aria-label={item.alt}>
            <span>Image à fournir</span>
            <code>{item.name}</code>
          </div>
        ) : (
          <picture>
            <source type="image/avif" srcSet={srcSet(rec, 'avif')} sizes="90vw" />
            <source type="image/webp" srcSet={srcSet(rec, 'webp')} sizes="90vw" />
            <img
              src={`${rec.base}-${rec.widths[rec.widths.length - 1]}.jpg`}
              srcSet={srcSet(rec, 'jpg')}
              sizes="90vw"
              width={rec.widths[rec.widths.length - 1]}
              height={Math.round(rec.widths[rec.widths.length - 1] / rec.ratio)}
              alt={item.alt}
            />
          </picture>
        )}

        <button type="button" className={`${s.fleche} ${s.flecheD}`} onClick={() => onDeplacer(1)}>
          <span aria-hidden="true">→</span>
          <span className="visuellement-cache">Image suivante</span>
        </button>
      </div>

      <p className={s.visionneuseLegende}>{item.alt}</p>
    </div>,
    document.body,
  );
}
