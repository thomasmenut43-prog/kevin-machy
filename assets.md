# assets.md — Inventaire des images

Répertoire source des fichiers de marque : `/public/assets/`
Images encodées pour le site : `/public/img/` — générées par `npm run images`, jamais éditées à la main.
Dernière mise à jour : 2026-09-03.

---

## 1. Actifs réels de Kevin Machy

| Fichier | Dimensions | Poids | Nature | Usage |
|---|---|---|---|---|
| `kevin-machy-logo.svg` | viewBox 1773,82 × 547,4 | 12 Ko | Logo original récupéré sur le site actuel : monogramme **KM** (serif à contraste fort, fûts biseautés), bois de cerf, signature « KEVIN MACHY » en capitales très espacées. | Source de référence. Non utilisé tel quel : 16 de ses 24 tracés n'ont pas de classe et héritaient d'un noir par défaut. |
| `logo-clair.svg` | idem | 12 Ko | **Variante claire dérivée du SVG original** : les formes noires passent en `#E9E5DE`, les reliefs blancs (œil du cerf, contre-forme du A, reflet du bois) en `#0A0A0B`. | En-tête et pied de page. |
| `kevin-machy-logo.png` | 300 × 93 | 8 Ko | Logo bitmap, noir sur transparent. | Repli d'archive. Trop basse définition pour un affichage écran — non utilisé. |
| `kevin-portrait.png` / `.webp` | 576 × 768 (3:4) | 221 / 16 Ko | **Vrai portrait de Kevin** : noir et blanc, très basse lumière, fond noir pur, bras croisés, casquette au bois de cerf. | Page À propos (`apropos-portrait`) et section « Le photographe » de l'accueil (`home-apropos`). Le fond noir se fond dans la page — l'image est posée sans cadre ni ombre. |
| `app/icon.png`, `app/apple-icon.png` | 512 / 180 | — | **Favicon dérivé du monogramme KM**, détouré au pixel près depuis le SVG et centré sur `#0A0A0B`. | Onglet et écran d'accueil. |

**Constat directeur** — l'autoportrait de Kevin est en noir et blanc basse lumière sur fond noir, et son monogramme est un didone à fort contraste. Les deux seuls actifs de marque existants pointaient déjà vers le registre retenu : sombre, contrasté, sobre. La direction « Chambre noire » ne fait que suivre ce que sa marque disait déjà d'elle-même.

**À réclamer à Kevin**
- Une version 2× de son portrait (1152 × 1536) — l'actuelle est juste pour un affichage plein cadre sur écran dense.
- Le logo en version vectorielle propre, avec un `fill` explicite sur tous les tracés.

---

## 2. Photographies : la sélection de Kevin

**Les images de substitution Pexels ont été retirées.** Le site tourne
désormais sur les photographies de Kevin, versées depuis son dossier
« Photos du site » le 24 septembre 2026.

Ce dossier contenait 80 fichiers matriciels. Le tri en a écarté 25 : treize qui
ne sont pas des photographies (logos de clients, captures d'écran, fiches
commerciales, une attestation de formation, une image générée par IA), sept
simulations d'accrochage murale — un canapé, un cadre — qui sont des visuels
produit sans emplacement sur le site, et cinq doublons exacts.

**46 photographies ont été versées** dans `.cache/raw` sous des noms lisibles
(`km-wed-`, `km-por-`, `km-iris-`, `km-kevin-`). Le tableau des
emplacements ci-dessous dit laquelle va où.

### Ce qui manque encore

**La définition, pour les formats couchés.** Aucun fichier fourni ne dépasse
1600 px de large : ce sont les copies web de son site actuel, pas ses
originaux — 63 sur 80 portent une marque de réduction dans leur nom
(`-scaled` de WordPress, `_11zon` d'un compresseur en ligne, `_rw_1200`
d'un constructeur de site).

Les 57 emplacements verticaux et carrés s'en contentent. Les 25 emplacements
couchés, non : `heroWide` réclame 2560 px et `wide` 1920 px. Le script
**n'agrandit plus** — il écarte les largeurs que la source ne porte pas et le
dit à chaque passage. La plus grande image du premier écran fait donc 1440 px
au lieu de 2560.

**Une vingtaine d'originaux en 2560 px de large** suffiraient à lever ça, pour
les seuls bandeaux.

**La photographie d'entreprise n'a nulle part où aller.** Onze images fournies
— Darty, Audiosolution, un cabinet médical, une équipe comptable — alors que le
site n'a que trois univers : mariage, portrait, Studio de l'Iris. Soit elles
ont été envoyées par réflexe, soit il manque une section. C'est une question de
cadrage, pas de sélection.

### Emplacements par page

| Page | Emplacements | Format attendu |
|---|---|---|
| **Accueil** | `home-hero-wide` + `home-hero-tall` | Paysage 16/9 ≥ 2560 px, et un recadrage vertical 3/4 pour les téléphones |
| | `home-collection-mariage`, `-portrait`, `-iris` | Portrait 4/5 ≥ 1600 px |
| | `home-selection-01` … `-12` | Mixte, ≥ 2000 px sur le grand côté. **Douze, pas davantage.** |
| **Mariage** | `mariage-hero-wide` + `-tall` | 16/9 ≥ 2560 px + 3/4 |
| | `mariage-approche` | Portrait 4/5 |
| | `mariage-silence` | Paysage 16/9 — la respiration pleine largeur |
| | `mariage-jour-01` … `-07` | Portrait 4/5, un cadre par jalon : préparatifs, cérémonie civile, cérémonie laïque ou religieuse, photos de couple, photos de groupes, vin d'honneur, soirée |
| | `mariage-galerie-01` … `-12` | Mixte ≥ 2000 px |
| **Portrait** | `portrait-hero-wide` + `-tall` | 16/9 + 3/4 |
| | `portrait-silence` | Paysage 16/9 |
| | `portrait-methode-01` … `-03` | Portrait 4/5 — les trois temps de la méthode |
| | `portrait-galerie-01` … `-10` | Portrait dominant ≥ 2000 px |
| | `portrait-tirage` | Paysage 3/2 — le tirage d'art 20 × 30 cm inclus, photographié comme objet |
| **Studio de l'Iris** | `iris-hero-wide` + `-tall`, `iris-oeuvre` | Carré ≥ 3000 px : un iris seul, pleine résolution |
| | `iris-detail-01` … `-06` | Carré ≥ 2400 px — la page vit de la variété chromatique des iris |
| | `iris-duo`, `iris-animal-01`, `-02` | Carré / 3/2 |
| | `iris-support-tableau` | Paysage 3/2 — un tableau Alu-Dibond accroché, en situation |
| | `iris-support-bijou` | Carré — **aucune source : emplacement laissé vide** (voir plus bas) |
| **À propos** | `apropos-portrait` | Disponible — le vrai portrait de Kevin |
| | `apropos-travail` | Paysage 3/2 — Kevin en reportage, photographié par un tiers |
| | `apropos-silence` | Paysage 16/9 |
| **Contact** | `contact-studio` | Paysage 3/2 — le studio du 14 avenue Foch |
| **Partage** | `og-default`, `og-mariage`, `og-portrait`, `og-iris`, `og-apropos`, `og-contact` | 1200 × 630, générés automatiquement à partir des sources |

### Les trois emplacements vides

Un emplacement sans source n'est **jamais** comblé par un visuel générique : le
composant `<Photo>` affiche un cadre nommé portant l'identifiant. Trois
subsistent.

| Emplacement | Ce qu'il faudrait |
|---|---|
| `iris-animal-02` | Un second iris d'animal. Le premier existe — un œil à pupille en fente horizontale, à côté d'un iris humain — et occupe `iris-animal-01`. |
| `iris-support-bijou` | Un bracelet, un collier ou une bague gravés d'un iris, portés, en carré. |
| `contact-studio` | Une vue du studio du 14 avenue Foch, en 3/2. |

---

## 3. Consignes de livraison à transmettre à Kevin

1. **JPEG qualité 90, sRGB**, plus grand côté ≥ 2000 px — ≥ 3000 px pour les iris. La chaîne produit ensuite les AVIF, WebP et JPEG en quatre largeurs.
2. **Pas de filigrane, pas de bordure, pas de cadre incrusté.** Les images sont posées à nu dans la page.
3. **Nommer les fichiers d'après les emplacements** du tableau ci-dessus.
4. **Une description courte par image** pour le texte alternatif : ce qui se passe dans le cadre, pas « photo de mariage ».
5. **Vérifier les autorisations de diffusion** des personnes photographiées.
6. **Arbitrer la sélection.** C'est le point qui compte le plus : douze images fortes valent mieux que quarante correctes. Le prix psychologique se joue là, pas dans la mise en page.

---

## 4. Poids produit

Mesuré le 24 septembre 2026, après la bascule sur les photographies de Kevin.

| Format | Fichiers | Moyenne | Total |
|---|---|---|---|
| AVIF | 214 | 44 Ko | 9,2 Mo |
| WebP | 214 | 62 Ko | 12,9 Mo |
| JPEG | 220 | 81 Ko | 17,5 Mo |

Moins de fichiers qu'avant, et pour une raison qui n'est pas une bonne
nouvelle : les largeurs qu'aucune source ne porte ne sont plus fabriquées.

L'image du premier écran pèse **107 Ko en AVIF à 1440 px** et **61 Ko à
960 px**. La variante 1920 px n'existe plus, faute de source assez grande — sur
un écran dense, le navigateur étire donc celle de 1440. C'est le seul levier
qui compte pour le LCP, et il est tenu de justesse.
