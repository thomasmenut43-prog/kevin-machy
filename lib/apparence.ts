/**
 * Les réglages que Kevin peut toucher sur chaque titre, chaque texte et chaque
 * section, et rien de plus.
 *
 * Le principe tient en une phrase : **on ne propose que des valeurs déjà
 * réglées**. Une taille est un cran de l'échelle typographique du site, pas un
 * nombre de pixels ; une couleur est une pastille de la palette, pas une
 * pipette. C'est ce qui permet de donner les clés sans que le site s'abîme —
 * une taille en pixels bruts casserait l'affichage mobile sur le premier écran
 * non prévu, et deux gris trop proches rendraient un texte illisible.
 *
 * Ce fichier est partagé par le BackOffice, qui construit les listes de choix,
 * et par le site, qui applique les valeurs. Une seule source, donc aucune
 * dérive possible entre ce qu'on propose et ce qu'on sait afficher.
 */

/** Les sept crans de l'échelle typographique, du plus discret au plus grand. */
export const TAILLES = {
  petit: { label: 'Petit', variable: '--t-petit' },
  corps: { label: 'Corps de texte', variable: '--t-corps' },
  chapo: { label: 'Chapô', variable: '--t-lede' },
  sousTitre: { label: 'Sous-titre', variable: '--t-h4' },
  titre3: { label: 'Titre de niveau 3', variable: '--t-h3' },
  titre2: { label: 'Titre de niveau 2', variable: '--t-h2' },
  geant: { label: 'Géant', variable: '--t-hero' },
} as const;

/**
 * La palette du site. Chaque cran est déjà éprouvé sur le fond sombre : le
 * contraste est tenu, y compris pour l'ivoire discret, réservé aux mentions.
 */
export const COULEURS = {
  encre: { label: 'Ivoire', variable: '--encre' },
  encreAttenuee: { label: 'Ivoire atténué', variable: '--encre-2' },
  encreDiscrete: { label: 'Ivoire discret', variable: '--encre-3' },
  cuivre: { label: 'Cuivre', variable: '--cuivre' },
  noir: { label: 'Noir', variable: '--noir' },
} as const;

/**
 * Les deux polices du site, toutes deux hébergées chez Kevin.
 *
 * Ajouter une police suppose de l'installer sur le serveur : une police tirée
 * en direct de Google exposerait l'adresse IP des visiteurs, ce que la CNIL
 * sanctionne. C'est pour cela que la liste est courte et fermée.
 */
export const POLICES = {
  titre: { label: 'Bodoni — titres', variable: '--pile-titre' },
  texte: { label: 'Switzer — texte', variable: '--pile-texte' },
} as const;

/** Les trois noirs de la direction « chambre noire ». Aucune autre teinte de fond. */
export const FONDS = {
  noir: { label: 'Noir', variable: '--noir' },
  noirProfond: { label: 'Noir profond', variable: '--noir-profond' },
  noirEleve: { label: 'Noir relevé', variable: '--noir-eleve' },
} as const;

/** Le rythme vertical du site. Trois valeurs, jamais une marge au pixel. */
export const ESPACEMENTS = {
  normal: { label: 'Normal', variable: '--section' },
  serre: { label: 'Serré', variable: '--section-serree' },
  aucun: { label: 'Aucun', variable: null },
} as const;

export const ALIGNEMENTS = {
  gauche: { label: 'À gauche', valeur: 'left' },
  centre: { label: 'Centré', valeur: 'center' },
  droite: { label: 'À droite', valeur: 'right' },
} as const;

export type Fond = keyof typeof FONDS;
export type Espacement = keyof typeof ESPACEMENTS;
export type Taille = keyof typeof TAILLES;
export type Couleur = keyof typeof COULEURS;
export type Police = keyof typeof POLICES;
export type Alignement = keyof typeof ALIGNEMENTS;

/** Ce que le BackOffice enregistre pour un élément de texte. */
export type Apparence = {
  taille?: Taille | null;
  police?: Police | null;
  couleur?: Couleur | 'personnalisee' | null;
  couleurLibre?: string | null;
  alignement?: Alignement | null;
};

/** Les listes de choix, au format attendu par les champs `choix` du catalogue. */
export const choix = <T extends Record<string, { label: string }>>(table: T) =>
  Object.entries(table).map(([value, { label }]) => ({ label, value }));

/** Une couleur en hexadécimal à trois, six ou huit chiffres. */
export const COULEUR_LIBRE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Traduit les réglages en styles. Tout passe par les variables du site : un
 * réglage laissé vide n'écrit rien et l'élément garde l'apparence prévue par
 * sa section.
 */
export function styleApparence(a?: Apparence | null): React.CSSProperties {
  if (!a) return {};
  const style: Record<string, string> = {};

  if (a.taille && a.taille in TAILLES) {
    style.fontSize = `var(${TAILLES[a.taille].variable})`;
  }
  if (a.police && a.police in POLICES) {
    style.fontFamily = `var(${POLICES[a.police].variable})`;
  }
  if (a.couleur === 'personnalisee') {
    // Relu ici aussi : la validation du BackOffice ne protège pas d'une valeur
    // entrée par l'API, et une couleur non conforme n'a rien à faire dans du CSS.
    if (a.couleurLibre && COULEUR_LIBRE.test(a.couleurLibre)) style.color = a.couleurLibre;
  } else if (a.couleur && a.couleur in COULEURS) {
    style.color = `var(${COULEURS[a.couleur as Couleur].variable})`;
  }
  if (a.alignement && a.alignement in ALIGNEMENTS) {
    style.textAlign = ALIGNEMENTS[a.alignement].valeur;
  }

  return style as React.CSSProperties;
}

/** Ce que le BackOffice enregistre pour la section elle-même. */
export type ReglagesSection = {
  fond?: Fond | null;
  espacement?: Espacement | null;
  masquee?: boolean | null;
};

/** Fond et rythme vertical d'une section. */
export function styleSection(r?: ReglagesSection | null): React.CSSProperties {
  if (!r) return {};
  const style: Record<string, string> = {};

  if (r.fond && r.fond in FONDS) {
    style.background = `var(${FONDS[r.fond].variable})`;
  }
  if (r.espacement && r.espacement in ESPACEMENTS) {
    const variable = ESPACEMENTS[r.espacement].variable;
    style.paddingBlock = variable ? `var(${variable})` : '0';
  }

  return style as React.CSSProperties;
}
