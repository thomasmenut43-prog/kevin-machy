'use client';

import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  /** `voile` : l'image se découvre par un masque qui se lève. Réservé aux photos. */
  mode?: 'glissement' | 'voile';
  /** Décalage en millisecondes, pour un enchaînement discret. */
  retard?: number;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Révélation à l'entrée dans le champ. Un seul observateur par élément,
 * déconnecté dès qu'il a joué : rien ne rejoue au défilement inverse.
 * Le respect de `prefers-reduced-motion` est géré en CSS (globals.css).
 */
export function Reveal({
  children,
  mode = 'glissement',
  retard = 0,
  as: Balise = 'div',
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      el.classList.add('est-visible');
      return;
    }

    const obs = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          entree.target.classList.add('est-visible');
          obs.unobserve(entree.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const attribut = mode === 'voile' ? { 'data-voile': '' } : { 'data-reveal': '' };

  return (
    <Balise
      ref={ref}
      {...attribut}
      className={className}
      style={retard ? ({ ...style, '--retard': `${retard}ms` } as React.CSSProperties) : style}
    >
      {children}
    </Balise>
  );
}
