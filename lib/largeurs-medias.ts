/**
 * Les formats produits à l'envoi d'une image.
 *
 * Ils vivaient dans `lib/medias.ts`, qui est marqué `server-only` : le
 * navigateur ne pouvait donc pas les lire. Or c'est lui qui encode désormais,
 * et les deux côtés doivent s'accorder au pixel près — sinon le serveur
 * refuserait une largeur que le navigateur vient de produire.
 *
 * Ce fichier n'importe rien : il est lisible des deux côtés.
 */

/** Les réductions rangées à côté de chaque image de la médiathèque. */
export const LARGEURS = [480, 1024, 1600, 2400] as const;

/** Les deux carrés d'une photo de profil. */
export const COTES_AVATAR = [256, 128] as const;

/**
 * Ce que le formulaire accepte.
 *
 * Le TIFF n'y est plus : aucun navigateur ne le décode, et c'est lui qui
 * encode maintenant. `sharp` le lisait, mais `sharp` n'est plus là.
 */
export const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

/** Vingt-cinq mégaoctets par image, comme avant. */
export const OCTETS_MAX = 25 * 1024 * 1024;
