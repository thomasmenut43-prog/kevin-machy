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
   * Les anciennes adresses renvoient vers les nouvelles.
   *
   * Le site garde son domaine, `dronezvous.com` ; ce sont les chemins qui
   * changent — `/photographe-mariage-haute-loire/` devient `/mariage/`. Ces
   * règles restent donc **relatives** et sans condition de domaine : elles
   * valent partout où le Worker répond.
   *
   * Une version précédente les restreignait à `dronezvous.com` et pointait vers
   * `https://kevinmachy.fr`, du temps où le site devait déménager. Les deux
   * tiennent ensemble ou pas du tout : une destination absolue vers un domaine
   * qui ne sert pas encore le site enverrait les visiteurs dans le vide.
   *
   * `permanent` émet un 308 — un 301 qui préserve la méthode. C'est lui qui
   * transmet l'ancienneté et les liens entrants ; un 302 ne transmettrait rien.
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
            destination: vers,
            permanent: true,
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
