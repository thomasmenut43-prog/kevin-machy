import type { NextConfig } from 'next';
import { REDIRECTIONS } from './lib/redirections';

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

  /**
   * L'ancien domaine renvoie vers le nouveau, adresse par adresse.
   *
   * `has` restreint la règle aux requêtes qui arrivent **sur `dronezvous.com`** :
   * sans cette condition, `/cgv/` redirigerait aussi depuis `kevinmachy.fr`, où
   * cette adresse n'a jamais existé.
   *
   * `permanent` émet un 308 — un 301 qui préserve la méthode. C'est lui qui
   * transmet l'ancienneté et les liens entrants ; un 302 ne transmettrait rien.
   *
   * Tant que `dronezvous.com` ne désigne pas le Worker, aucune de ces règles ne
   * se déclenche. Elles attendent la bascule sans rien faire.
   *
   * L'export statique n'a pas de serveur pour les appliquer : on les omet, ce
   * qui évite un avertissement à chaque construction de la vitrine figée.
   */
  ...(statique
    ? {}
    : {
        async redirects() {
          return REDIRECTIONS.map(({ de, vers }) => ({
            source: de,
            destination: `https://kevinmachy.fr${vers}`,
            permanent: true,
            has: [{ type: 'host' as const, value: 'dronezvous.com' }],
          }));
        },
      }),

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
