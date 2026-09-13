import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { bodoni, switzer } from '@/lib/fonts';
import './backoffice.css';

/* Disposition racine du BackOffice et de l'aperçu.

   La classe `bo` est posée par chaque écran, pas ici : l'aperçu partage cette
   disposition et doit s'afficher avec les seuls styles du site, sans un pixel
   de l'habillage de l'administration.
   Séparée de celle du site : pas d'en-tête public, pas de pied de page, pas de
   données structurées. On reprend en revanche la palette et les deux polices,
   pour que Kevin reste chez lui en passant de l'un à l'autre. */

export const metadata: Metadata = {
  title: { default: 'BackOffice', template: '%s — BackOffice' },
  // L'administration n'a rien à faire dans un moteur de recherche.
  robots: { index: false, follow: false },
};

export default function DispositionBackOffice({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${bodoni.variable} ${switzer.variable}`}>
      <body>{children}</body>
    </html>
  );
}
