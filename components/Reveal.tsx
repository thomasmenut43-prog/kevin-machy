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
      // Déclenché **avant** que l'élément entre dans l'écran, pas après.
      //
      // La marge basse était négative — il fallait être 12 % à l'intérieur pour
      // que la révélation commence. On voyait donc l'animation se jouer, ce qui
      // ressemblait à une lenteur de chargement alors que c'en était l'inverse :
      // une mise en scène, arrivée trop tard.
      //
      // Positive, elle étend le bas de l'écran de 25 % : l'animation démarre
      // pendant que l'élément monte encore, et elle est finie quand le regard
      // l'atteint. Le navigateur, lui, a commencé à télécharger l'image bien
      // avant — son propre seuil de chargement différé est de l'ordre d'un
      // millier de pixels, largement devant cette marge.
      { rootMargin: '0px 0px 25% 0px', threshold: 0 },
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
