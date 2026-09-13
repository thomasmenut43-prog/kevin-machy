import { IMAGES, type ImageName } from '@/lib/images.generated';
import { urlMedia, type Media } from '@/lib/modeles';
import { Photo, PhotoPleinEcran } from '@/components/Photo';

/**
 * Le pont entre la médiathèque et les images déjà encodées du site.
 *
 * Les six pages d'origine s'appuient sur un manifeste d'images pré-encodées en
 * AVIF, WebP et JPEG. La médiathèque, elle, ne connaît que du WebP. Plutôt que
 * de choisir, on reconnaît les images du site à leur chemin et on les rend avec
 * le composant d'origine : elles gardent leurs trois formats, et les envois de
 * Kevin passent par le chemin simple.
 *
 * Sans cela, convertir les pages dans l'éditeur ferait perdre l'AVIF sur
 * soixante-seize images, soit environ trente pour cent de poids en plus.
 */

/** `/img/home-hero-wide-2560.webp` → `home-hero-wide`, si le manifeste la connaît. */
export function nomManifeste(fichier: string): ImageName | null {
  const m = fichier.match(/^\/img\/(.+)-\d+\.webp$/);
  return m && m[1] in IMAGES ? (m[1] as ImageName) : null;
}

type Props = {
  media?: Media | null;
  sizes?: string;
  className?: string;
  /** Réservé à l'image visible sans défiler : une seule par page. */
  prioritaire?: boolean;
  ratio?: number;
};

export function Image({ media, sizes = '100vw', className, prioritaire, ratio }: Props) {
  if (!media) return null;

  const nom = nomManifeste(media.fichier);
  if (nom) {
    return (
      <Photo
        name={nom}
        alt={media.alt}
        sizes={sizes}
        priority={prioritaire}
        className={className}
        ratio={ratio}
      />
    );
  }

  const jeu = media.tailles.length
    ? media.tailles.map((t) => `${urlMedia(t.fichier)} ${t.largeur}w`).join(', ')
    : undefined;

  return (
    <img
      className={className}
      src={urlMedia(media.fichier)}
      srcSet={jeu}
      sizes={jeu ? sizes : undefined}
      width={media.largeur ?? undefined}
      height={media.hauteur ?? undefined}
      alt={media.alt}
      loading={prioritaire ? 'eager' : 'lazy'}
      fetchPriority={prioritaire ? 'high' : undefined}
      decoding="async"
    />
  );
}

/**
 * Image plein écran du héros : cadrage large sur ordinateur, cadrage vertical
 * sous 768 px. Un 16/9 rogné dans un écran de téléphone perd son sujet.
 */
export function ImagePleinEcran({
  large,
  etroite,
  prioritaire,
}: {
  large?: Media | null;
  etroite?: Media | null;
  prioritaire?: boolean;
}) {
  if (!large) return null;

  const nomLarge = nomManifeste(large.fichier);
  const nomEtroite = etroite ? nomManifeste(etroite.fichier) : null;

  if (nomLarge) {
    return (
      <PhotoPleinEcran
        wide={nomLarge}
        tall={nomEtroite ?? nomLarge}
        alt={large.alt}
        priority={prioritaire}
      />
    );
  }

  return <Image media={large} sizes="100vw" prioritaire={prioritaire} />;
}

/**
 * Fabrique un média à partir d'une image du manifeste.
 *
 * Sert le temps de la conversion : les pages encore écrites en code parlent en
 * noms d'emplacement, les sections parlent en médias. Ce passage évite d'avoir
 * deux chemins de rendu à maintenir en parallèle.
 */
export function mediaDepuisManifeste(nom: ImageName, alt: string): Media {
  const rec = IMAGES[nom];
  const largeurs = rec.widths;
  const plusGrande = largeurs[largeurs.length - 1];

  return {
    id: -1,
    fichier: `/img/${nom}-${plusGrande}.webp`,
    alt,
    legende: null,
    largeur: plusGrande,
    hauteur: Math.round(plusGrande / rec.ratio),
    tailles: largeurs.map((largeur) => ({ largeur, fichier: `/img/${nom}-${largeur}.webp` })),
    aRemplacer: true,
  };
}
