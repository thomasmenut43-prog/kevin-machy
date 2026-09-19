import type { NextConfig } from 'next';

/**
 * Deux constructions, une seule application.
 *
 * Par défaut, tout est bâti pour un serveur : le site **et** le BackOffice, qui
 * a besoin d'une base, d'une session et d'actions serveur.
 *
 * Avec `EXPORT_STATIQUE=1`, seule la vitrine est bâtie, en fichiers figés.
 * `scripts/exporter.mjs` écarte alors les parties qui exigent un serveur —
 * c'est lui qu'il faut lancer, pas `next build` directement.
 */
const statique = process.env.EXPORT_STATIQUE === '1';

const nextConfig: NextConfig = {
  // Un répertoire de construction distinct : sans lui, les deux constructions
  // se partagent `.next`, et les types que Next y engendre décrivent encore le
  // BackOffice que l'export vient d'écarter. La vérification échoue alors sur
  // des routes absentes, pour une raison qui n'a rien à voir avec le code.
  ...(statique ? { output: 'export' as const, distDir: '.next-statique' } : {}),
  trailingSlash: true,
  // Les images du site sont pré-encodées en AVIF/WebP/JPEG par
  // scripts/build-images.mjs. Celles de la médiathèque sont encodées à l'envoi
  // et servies par app/medias/[fichier].
  images: { unoptimized: true },
  reactStrictMode: true,

  experimental: {
    serverActions: {
      // Les envois de la médiathèque passent par une action serveur, plafonnée
      // à 1 Mo par défaut. On l'ouvre à la taille acceptée côté application,
      // plus la marge que le format multipart ajoute à chaque envoi.
      bodySizeLimit: '26mb',
    },
  },
};

export default nextConfig;
