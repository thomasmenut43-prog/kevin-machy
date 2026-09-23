/**
 * L'encodage des images, dans le navigateur.
 *
 * Il se faisait sur le serveur, par `sharp`. C'était le choix évident tant que
 * le site tournait sur une machine à nous : `sharp` est rapide, précis, et
 * lit tous les formats.
 *
 * Il est parti pour une raison d'hébergement. `sharp` est un binaire natif :
 * il n'existe ni sur Cloudflare Workers, ni sur aucun hébergement qui ne soit
 * pas un vrai serveur. Tant qu'il était là, l'application ne pouvait se poser
 * que sur un serveur Node — et c'est précisément ce qu'on cherche à ne plus
 * exiger.
 *
 * Le navigateur sait faire la même chose. Il décode l'image, la redresse selon
 * son orientation EXIF, la redimensionne et la réencode en WebP. Le serveur ne
 * reçoit plus que des octets déjà prêts, et n'a plus rien à installer.
 *
 * Deux conséquences assumées :
 *
 * - **Le TIFF n'est plus accepté.** Aucun navigateur ne le décode, là où
 *   `sharp` le faisait. JPEG, PNG, WebP et AVIF continuent de passer.
 * - **Les fichiers produits ne pèsent pas exactement le même poids.** Le
 *   « quality » d'un canvas et celui de `sharp` ne désignent pas le même
 *   réglage. L'écart est faible, la qualité perçue identique.
 *
 * Ce fichier n'importe rien du serveur : il part dans le navigateur.
 */

/** La qualité du WebP, à l'échelle du navigateur (0 à 1). */
const QUALITE_PRINCIPALE = 0.82;
const QUALITE_VARIANTE = 0.8;

export type Variante = { largeur: number; blob: Blob };

export type ImageEncodee = {
  /** Dimensions de l'image redressée, donc celles du fichier principal. */
  largeur: number;
  hauteur: number;
  /** Poids du fichier d'origine, conservé pour la fiche du média. */
  octets: number;
  /** L'image entière, réencodée en WebP. */
  principal: Blob;
  /** Les réductions, une par largeur demandée qui soit plus étroite que l'original. */
  variantes: Variante[];
};

/** Levée quand le fichier n'est pas une image que le navigateur sait lire. */
export class ImageIllisible extends Error {
  constructor() {
    super('Ce fichier n’est pas une image lisible.');
    this.name = 'ImageIllisible';
  }
}

/**
 * Dessine l'image à la taille voulue et rend le WebP correspondant.
 *
 * `OffscreenCanvas` évite de passer par le document, mais tous les navigateurs
 * ne l'ont pas : le repli dessine dans un canvas ordinaire, jamais inséré dans
 * la page.
 */
async function versWebp(image: ImageBitmap, largeur: number, qualite: number): Promise<Blob> {
  const hauteur = Math.max(1, Math.round((image.height * largeur) / image.width));

  if (typeof OffscreenCanvas !== 'undefined') {
    const toile = new OffscreenCanvas(largeur, hauteur);
    const pinceau = toile.getContext('2d');
    if (!pinceau) throw new ImageIllisible();
    pinceau.drawImage(image, 0, 0, largeur, hauteur);
    return toile.convertToBlob({ type: 'image/webp', quality: qualite });
  }

  const toile = document.createElement('canvas');
  toile.width = largeur;
  toile.height = hauteur;
  const pinceau = toile.getContext('2d');
  if (!pinceau) throw new ImageIllisible();
  pinceau.drawImage(image, 0, 0, largeur, hauteur);

  const blob = await new Promise<Blob | null>((resoudre) =>
    toile.toBlob(resoudre, 'image/webp', qualite),
  );
  if (!blob) throw new ImageIllisible();
  return blob;
}

/**
 * Découpe un carré au centre, puis le réduit à la taille voulue.
 *
 * `sharp` visait la zone la plus « intéressante » de l'image. Le navigateur ne
 * sait pas faire ça : on prend le carré central, ce qui convient à une photo
 * de profil cadrée normalement. À l'usage, si un visage se retrouve rogné,
 * c'est qu'il faut recadrer la photo avant de l'envoyer.
 */
async function versCarreWebp(image: ImageBitmap, cote: number): Promise<Blob> {
  const source = Math.min(image.width, image.height);
  const x = (image.width - source) / 2;
  const y = (image.height - source) / 2;

  const dessiner = (pinceau: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D) =>
    pinceau.drawImage(image, x, y, source, source, 0, 0, cote, cote);

  if (typeof OffscreenCanvas !== 'undefined') {
    const toile = new OffscreenCanvas(cote, cote);
    const pinceau = toile.getContext('2d');
    if (!pinceau) throw new ImageIllisible();
    dessiner(pinceau);
    return toile.convertToBlob({ type: 'image/webp', quality: QUALITE_PRINCIPALE });
  }

  const toile = document.createElement('canvas');
  toile.width = cote;
  toile.height = cote;
  const pinceau = toile.getContext('2d');
  if (!pinceau) throw new ImageIllisible();
  dessiner(pinceau);

  const blob = await new Promise<Blob | null>((resoudre) =>
    toile.toBlob(resoudre, 'image/webp', QUALITE_PRINCIPALE),
  );
  if (!blob) throw new ImageIllisible();
  return blob;
}

/** Prépare une photo de profil : un carré par taille demandée. */
export async function encoderAvatar(
  fichier: File,
  cotes: readonly number[],
): Promise<Variante[]> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageIllisible();
  }

  try {
    if (!image.width || !image.height) throw new ImageIllisible();
    const carres: Variante[] = [];
    for (const cote of cotes) {
      carres.push({ largeur: cote, blob: await versCarreWebp(image, cote) });
    }
    return carres;
  } finally {
    image.close();
  }
}

/**
 * Prépare un fichier envoyé par le visiteur de l'éditeur.
 *
 * `imageOrientation: 'from-image'` applique l'orientation EXIF au décodage :
 * c'est ce qui remplace le `.rotate()` de `sharp`. Sans lui, une photo prise
 * en portrait avec un téléphone arriverait couchée.
 */
export async function encoderImage(
  fichier: File,
  largeurs: readonly number[],
): Promise<ImageEncodee> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
  } catch {
    // Un fichier qui se prétend JPEG sans en être un échoue ici, avant d'avoir
    // occupé quoi que ce soit sur le serveur.
    throw new ImageIllisible();
  }

  try {
    if (!image.width || !image.height) throw new ImageIllisible();

    const principal = await versWebp(image, image.width, QUALITE_PRINCIPALE);

    const variantes: Variante[] = [];
    for (const largeur of largeurs) {
      // Agrandir n'apporte rien : on ne produit que des réductions.
      if (largeur > image.width) continue;
      variantes.push({ largeur, blob: await versWebp(image, largeur, QUALITE_VARIANTE) });
    }

    return {
      largeur: image.width,
      hauteur: image.height,
      octets: fichier.size,
      principal,
      variantes,
    };
  } finally {
    // Sans ça, une série d'envois garde en mémoire toutes les images décodées.
    image.close();
  }
}
