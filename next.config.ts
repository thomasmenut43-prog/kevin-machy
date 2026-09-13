import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // L'export statique est abandonné : le BackOffice a besoin d'un serveur, d'une
  // base et d'une authentification (PRD § 2). Le site reste mis en cache page
  // par page, il ne redevient pas dynamique pour autant.
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
