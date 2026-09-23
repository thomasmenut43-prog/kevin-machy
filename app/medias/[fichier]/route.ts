import { coffre } from '@/lib/coffre';

/**
 * Sert un fichier de la médiathèque.
 *
 * Le nom demandé est filtré par une expression stricte avant tout accès au
 * stockage. Sans ce filtre, un nom contenant « .. » permettrait de lire
 * n'importe quel fichier du serveur, et c'est la faille la plus courante sur
 * ce genre de route.
 *
 * Elle ne sait plus où vivent les fichiers : le coffre s'en charge, sur le
 * disque ou dans R2 selon l'hébergement. C'est ce qui permet à cette route de
 * tourner dans un Worker, qui n'a pas de disque.
 */
const NOM_VALIDE = /^[a-f0-9]{24}(?:-\d{3,4})?\.webp$/;

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ fichier: string }> },
) {
  const { fichier } = await params;
  if (!NOM_VALIDE.test(fichier)) {
    return new Response('Introuvable', { status: 404 });
  }

  const lu = await (await coffre()).lire(fichier);
  if (!lu) return new Response('Introuvable', { status: 404 });

  return new Response(lu.corps, {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(lu.octets),
      // Le nom de fichier est tiré au hasard et ne change jamais : on peut
      // mettre en cache aussi longtemps que possible.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
