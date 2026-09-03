import { IMAGES, type ImageName, type ImageRecord } from '@/lib/images.generated';

type PhotoProps = {
  name: ImageName;
  /** Description de ce qui se passe dans le cadre. Jamais « photo de mariage ». */
  alt: string;
  /** Indispensable : sans `sizes`, le navigateur télécharge trop grand. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Ratio d'affichage si le cadre diffère du ratio de l'image encodée. */
  ratio?: number;
};

function srcSet(rec: ImageRecord, ext: string) {
  return rec.widths.map((w) => `${rec.base}-${w}.${ext} ${w}w`).join(', ');
}

/**
 * Sert une image pré-encodée : AVIF, repli WebP, repli JPEG.
 * Dimensions explicites pour éviter tout décalage de mise en page.
 */
export function Photo({ name, alt, sizes, priority = false, className, ratio }: PhotoProps) {
  const rec: ImageRecord = IMAGES[name];
  const cadre = ratio ?? rec.ratio;

  if (rec.missing || !rec.base) {
    return (
      <div
        className={['photo-absente', className].filter(Boolean).join(' ')}
        style={{ aspectRatio: cadre }}
        role="img"
        aria-label={alt}
      >
        <span>Image à fournir</span>
        <code>{name}</code>
      </div>
    );
  }

  const largeur = rec.widths[rec.widths.length - 1];
  const hauteur = Math.round(largeur / rec.ratio);
  const repli = rec.widths[Math.min(1, rec.widths.length - 1)];

  return (
    <picture className={['photo', className].filter(Boolean).join(' ')} style={{ aspectRatio: cadre }}>
      <source type="image/avif" srcSet={srcSet(rec, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(rec, 'webp')} sizes={sizes} />
      <img
        src={`${rec.base}-${repli}.jpg`}
        srcSet={srcSet(rec, 'jpg')}
        sizes={sizes}
        width={largeur}
        height={hauteur}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  );
}

/**
 * Variante plein écran : recadrage large en desktop, recadrage vertical
 * en dessous de 768 px — un 16/9 rogné dans un écran de téléphone perd le sujet.
 */
export function PhotoPleinEcran({
  wide,
  tall,
  alt,
  priority = false,
}: {
  wide: ImageName;
  tall: ImageName;
  alt: string;
  priority?: boolean;
}) {
  const large: ImageRecord = IMAGES[wide];
  const haut: ImageRecord = IMAGES[tall];

  if (large.missing || !large.base) {
    return (
      <div className="photo-absente" style={{ height: '100%' }} role="img" aria-label={alt}>
        <span>Image à fournir</span>
        <code>{wide}</code>
      </div>
    );
  }

  const petitEcran = '(max-width: 767px)';
  const hautDispo = !haut.missing && haut.base;

  return (
    <picture>
      {hautDispo ? (
        <>
          <source media={petitEcran} type="image/avif" srcSet={srcSet(haut, 'avif')} sizes="100vw" />
          <source media={petitEcran} type="image/webp" srcSet={srcSet(haut, 'webp')} sizes="100vw" />
          <source media={petitEcran} type="image/jpeg" srcSet={srcSet(haut, 'jpg')} sizes="100vw" />
        </>
      ) : null}
      <source type="image/avif" srcSet={srcSet(large, 'avif')} sizes="100vw" />
      <source type="image/webp" srcSet={srcSet(large, 'webp')} sizes="100vw" />
      <img
        src={`${large.base}-${large.widths[1]}.jpg`}
        srcSet={srcSet(large, 'jpg')}
        sizes="100vw"
        width={large.widths[large.widths.length - 1]}
        height={Math.round(large.widths[large.widths.length - 1] / large.ratio)}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'async'}
      />
    </picture>
  );
}
