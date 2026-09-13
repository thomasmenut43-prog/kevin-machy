import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { DOSSIER } from '@/lib/medias';

/**
 * Sert un fichier de la médiathèque.
 *
 * Le nom demandé est filtré par une expression stricte avant tout accès disque.
 * Sans ce filtre, un nom contenant « .. » permettrait de lire n'importe quel
 * fichier du serveur, et c'est la faille la plus courante sur ce genre de route.
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

  const chemin = path.join(DOSSIER, fichier);
  try {
    const info = await stat(chemin);
    if (!info.isFile()) return new Response('Introuvable', { status: 404 });

    const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;
    return new Response(flux, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(info.size),
        // Le nom de fichier est tiré au hasard et ne change jamais : on peut
        // mettre en cache aussi longtemps que possible.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Introuvable', { status: 404 });
  }
}
