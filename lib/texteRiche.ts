/**
 * Le texte riche du BackOffice.
 *
 * **Aucun HTML ne traverse jamais la frontière.** Ni à l'enregistrement, ni à
 * l'affichage. Le texte est stocké sous forme de fragments décrits, et le site
 * les transforme en balises lui-même.
 *
 * C'est la décision la plus importante de ce fichier. Stocker du HTML saisi
 * dans un navigateur oblige à le nettoyer avant de le réafficher, et écrire un
 * nettoyeur HTML sûr est un exercice que presque tout le monde rate. Ici la
 * question ne se pose pas : il n'y a rien à nettoyer, puisqu'il n'y a pas de
 * balises. Un `<script>` tapé par mégarde reste le texte « <script> ».
 */

export type Fragment = {
  texte: string;
  gras?: boolean;
  italique?: boolean;
  /** Limité aux schémas sûrs à l'enregistrement : http, https, /, mailto, tel. */
  lien?: string;
};

export type BlocTexte = {
  type: 'paragraphe' | 'liste' | 'listeNumerotee';
  fragments: Fragment[];
};

export type TexteRiche = BlocTexte[];

export const texteRicheVide: TexteRiche = [];

/** `true` si le document ne contient aucun caractère visible. */
export function estVide(doc: unknown): boolean {
  if (!Array.isArray(doc)) return true;
  return !doc.some((b: BlocTexte) => b?.fragments?.some((f) => f?.texte?.trim()));
}

/** Le texte nu, pour les résumés et les descriptions de référencement. */
export function enTexteNu(doc: unknown, maximum = 300): string {
  if (!Array.isArray(doc)) return '';
  const nu = (doc as BlocTexte[])
    .map((b) => (b.fragments ?? []).map((f) => f.texte).join(''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return nu.length > maximum ? `${nu.slice(0, maximum - 1)}…` : nu;
}

/** Un document d'une seule ligne, pour les contenus d'exemple. */
export function paragraphe(texte: string): TexteRiche {
  return [{ type: 'paragraphe', fragments: [{ texte }] }];
}
