/**
 * Les symboles de l'éditeur.
 *
 * Dessinés plutôt qu'empruntés à la police : les caractères comme ✕ ou ↑ sont
 * rendus en emoji par certains systèmes, donc en couleur et à une taille qu'on
 * ne contrôle pas. Des traits en SVG suivent la couleur du texte et gardent la
 * même épaisseur partout.
 *
 * Chaque icône est décorative : c'est le `aria-label` du bouton qui la nomme.
 */

type Props = { className?: string };

const commun = {
  width: 15,
  height: 15,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function Monter({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" />
    </svg>
  );
}

export function Descendre({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M8 3.5v9M4.5 9 8 12.5 11.5 9" />
    </svg>
  );
}

export function Dupliquer({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5A1.5 1.5 0 0 0 9 2H4a2 2 0 0 0-2 2v5a1.5 1.5 0 0 0 1.5 1.5" />
    </svg>
  );
}

export function Poubelle({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M2.5 4h11M6.5 4V2.8A.8.8 0 0 1 7.3 2h1.4a.8.8 0 0 1 .8.8V4" />
      <path d="M12.2 4l-.5 8.3a1.4 1.4 0 0 1-1.4 1.2H5.7a1.4 1.4 0 0 1-1.4-1.2L3.8 4" />
      <path d="M6.6 6.8v4M9.4 6.8v4" />
    </svg>
  );
}

export function Fermer({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function Poignee({ className }: Props) {
  return (
    <svg {...commun} className={className} strokeWidth={1.2}>
      <path d="M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01" strokeWidth={2.2} />
    </svg>
  );
}

export function Ordinateur({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" />
      <path d="M5.5 14h5M8 11.5V14" />
    </svg>
  );
}

export function Telephone({ className }: Props) {
  return (
    <svg {...commun} className={className}>
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.6" />
      <path d="M7 12.6h2" />
    </svg>
  );
}
