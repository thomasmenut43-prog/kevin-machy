/**
 * Le point de cadrage d'une image placée dans une section.
 *
 * Les photos remplissent leur cadre (`object-fit: cover`) : un portrait posé
 * dans un bandeau large est rogné en haut et en bas, toujours **au centre**.
 * Constaté le 25 novembre 2026 : Kevin voyait des têtes coupées et ne pouvait
 * rien y faire.
 *
 * Il désigne désormais, dans l'éditeur, le point qui doit rester visible — un
 * visage, une main, un regard. Le rognage se fait autour de ce point.
 *
 * Le point appartient à **l'emplacement**, pas à la photo : la même image peut
 * être cadrée sur un visage dans un bandeau et laissée entière ailleurs. Il est
 * rangé à côté du champ image, sous le nom `<champ>Cadrage` (`imageCadrage`,
 * `imageEtroiteCadrage`…), dans le JSON de la section — aucune colonne, aucune
 * migration.
 *
 * Ce fichier n'importe rien du serveur : l'éditeur et le site s'en servent.
 */

/** Un point en pourcentage de la largeur et de la hauteur, de 0 à 100. */
export type Cadrage = { x: number; y: number };

/** Le nom du réglage qui accompagne un champ image. */
export const cleCadrage = (champ: string) => `${champ}Cadrage`;

/** Le centre : ce qu'on obtient sans rien régler. */
export const CENTRE: Cadrage = { x: 50, y: 50 };

/**
 * Lit un cadrage venu de n'importe où — le navigateur, la base — et ne garde
 * qu'un point valide, arrondi à l'unité. Tout le reste vaut « pas de réglage ».
 */
export function lireCadrage(valeur: unknown): Cadrage | null {
  if (!valeur || typeof valeur !== 'object') return null;
  const { x, y } = valeur as { x?: unknown; y?: unknown };
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const borner = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  return { x: borner(x), y: borner(y) };
}

/** La valeur CSS de `object-position`, ou rien quand l'image reste centrée. */
export function positionCss(valeur: unknown): string | undefined {
  const c = lireCadrage(valeur);
  if (!c || (c.x === CENTRE.x && c.y === CENTRE.y)) return undefined;
  return `${c.x}% ${c.y}%`;
}
