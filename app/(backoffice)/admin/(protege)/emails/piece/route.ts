import { utilisateurConnecte } from '@/lib/auth';
import { lirePiece, messageImap } from '@/lib/boite-mail';

export const dynamic = 'force-dynamic';

/**
 * Télécharger une pièce jointe de la boîte de Kevin.
 *
 * Une route et pas une page : l'ossature du BackOffice, qui vérifie la
 * connexion, ne s'applique pas ici. Le contrôle est donc refait en tête.
 *
 * Le contenu vient d'un inconnu. Servi tel quel depuis l'adresse du
 * BackOffice, un fichier HTML joint s'y exécuterait avec la session de Kevin.
 * D'où trois verrous : le fichier est **toujours téléchargé**, jamais affiché ;
 * son type n'est repris que s'il est sans danger ; et la politique `sandbox`
 * interdit tout script même si un navigateur passait outre.
 */
const TYPES_SURS = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif|heic)|text\/plain)$/i;

export async function GET(requete: Request) {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur?.role !== 'administrateur') return new Response('Non autorisé', { status: 403 });

  const p = new URL(requete.url).searchParams;
  const chemin = p.get('dossier') ?? '';
  const uid = Number(p.get('uid'));
  const numero = Number(p.get('n'));
  if (
    !chemin ||
    chemin.length > 200 ||
    /[\r\n]/.test(chemin) ||
    !Number.isInteger(uid) ||
    uid < 1 ||
    !Number.isInteger(numero) ||
    numero < 0
  ) {
    return new Response('Demande invalide', { status: 400 });
  }

  try {
    const piece = await lirePiece(chemin, uid, numero);
    if (!piece) return new Response('Introuvable', { status: 404 });

    const nom = piece.nom.replace(/[\r\n"\\/]/g, '_');
    const ascii = nom.replace(/[^\x20-\x7e]/g, '_');
    return new Response(new Uint8Array(piece.contenu), {
      headers: {
        'Content-Type': TYPES_SURS.test(piece.type) ? piece.type : 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nom)}`,
        'Content-Length': String(piece.contenu.length),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "sandbox; default-src 'none'",
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (erreur) {
    console.error('Boîte mail, pièce jointe :', erreur);
    return new Response(messageImap(erreur), { status: 502 });
  }
}
