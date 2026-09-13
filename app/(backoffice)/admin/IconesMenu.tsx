/**
 * Les symboles du menu.
 *
 * Dessinés au trait, dans la géométrie des bibliothèques d'icônes modernes —
 * celle de shadcn/ui : une grille de 24, un trait de 1,5 et des extrémités
 * arrondies. Les caractères qu'ils remplacent (◱ ▤ ▣ ✉ 🔒) étaient rendus en
 * emoji par certains systèmes : le cadenas s'affichait en couleur, à une
 * taille qu'on ne contrôlait pas, au milieu d'une colonne monochrome.
 *
 * Dessinés ici plutôt qu'installés : une dépendance d'icônes pèse plus lourd
 * que les huit que ce menu utilise.
 */

type Props = { className?: string };

const commun = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Tableau de bord : des panneaux de tailles différentes. */
export function Tableau({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

/** Éditeur de site : une page, sa barre en haut et sa colonne de gauche. */
export function Pages({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </svg>
  );
}

/** Médiathèque : deux images empilées. */
export function Images({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M18 22H4a2 2 0 0 1-2-2V6" />
      <rect x="6" y="2" width="16" height="16" rx="2" />
      <circle cx="12" cy="8" r="1.6" />
      <path d="m22 14-3.1-3.1a2 2 0 0 0-2.8 0L10 17" />
    </svg>
  );
}

/** Messages : une enveloppe. */
export function Enveloppe({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 8.6 5.7a2.5 2.5 0 0 0 2.8 0L22 7" />
    </svg>
  );
}

/** Boutique, non activée : un cadenas fermé. */
export function Cadenas({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Paramètres : la roue dentée, simplifiée à huit dents. */
export function Reglage({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M12 2.6l1.7 2.1 2.6-.7.6 2.6 2.6.6-.7 2.6 2.1 1.7-2.1 1.7.7 2.6-2.6.6-.6 2.6-2.6-.7L12 21.4l-1.7-2.1-2.6.7-.6-2.6-2.6-.6.7-2.6L3.1 12.5l2.1-1.7-.7-2.6 2.6-.6.6-2.6 2.6.7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Se déconnecter : une porte et une flèche qui sort. */
export function Sortie({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  );
}

/** Voir le site : la flèche qui quitte le cadre. */
export function Externe({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M13 3h8v8" />
      <path d="M21 3 11 13" />
      <path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
    </svg>
  );
}
