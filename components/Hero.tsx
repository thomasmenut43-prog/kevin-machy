'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { PhotoPleinEcran } from './Photo';
import type { ImageName } from '@/lib/images.generated';

type HeroProps = {
  wide: ImageName;
  tall: ImageName;
  alt: string;
  children: ReactNode;
};

/**
 * Héros pleine hauteur. L'image est peinte immédiatement — c'est le LCP,
 * elle ne se cache pas derrière une animation d'entrée.
 * Seul élément en parallaxe du site : amplitude volontairement faible,
 * désactivée au clavier tactile, en dessous de 900 px et en mouvement réduit.
 */
export function Hero({ wide, tall, alt, children }: HeroProps) {
  const media = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = media.current;
    if (!el) return;

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)');
    const grand = window.matchMedia('(min-width: 900px)');
    let brut = 0;
    let attente = false;

    const peindre = () => {
      attente = false;
      const h = window.innerHeight;
      const avance = Math.min(brut / h, 1);
      el.style.transform = `translate3d(0, ${(avance * 56).toFixed(2)}px, 0)`;
    };

    const auDefilement = () => {
      brut = window.scrollY;
      if (attente) return;
      attente = true;
      requestAnimationFrame(peindre);
    };

    const brancher = () => {
      if (reduit.matches || !grand.matches) {
        el.style.transform = '';
        window.removeEventListener('scroll', auDefilement);
        return;
      }
      window.addEventListener('scroll', auDefilement, { passive: true });
      auDefilement();
    };

    brancher();
    reduit.addEventListener('change', brancher);
    grand.addEventListener('change', brancher);

    return () => {
      window.removeEventListener('scroll', auDefilement);
      reduit.removeEventListener('change', brancher);
      grand.removeEventListener('change', brancher);
    };
  }, []);

  return (
    <header className="hero">
      <div className="hero__media" ref={media}>
        <PhotoPleinEcran wide={wide} tall={tall} alt={alt} priority />
      </div>
      <div className="hero__ombre" aria-hidden="true" />
      <div className="wrap hero__contenu">{children}</div>
      <span className="hero__defiler" aria-hidden="true">
        Faire défiler
      </span>
    </header>
  );
}
