# assets.md — Inventaire des images

Répertoire source des fichiers de marque : `/public/assets/`
Images encodées pour le site : `/public/img/` — générées par `npm run images`, jamais éditées à la main.
Dernière mise à jour : 2026-10-04.

---

## 1. Actifs réels de Kevin Machy

| Fichier | Dimensions | Poids | Nature | Usage |
|---|---|---|---|---|
| `kevin-machy-logo.svg` | viewBox 1773,82 × 547,4 | 12 Ko | Logo original récupéré sur le site actuel : monogramme **KM** (serif à contraste fort, fûts biseautés), bois de cerf, signature « KEVIN MACHY » en capitales très espacées. | Source de référence. Non utilisé tel quel : 16 de ses 24 tracés n'ont pas de classe et héritaient d'un noir par défaut. |
| `logo-clair.svg` | idem | 12 Ko | **Variante claire dérivée du SVG original** : les formes noires passent en `#E9E5DE`, les reliefs blancs (œil du cerf, contre-forme du A, reflet du bois) en `#0A0A0B`. | En-tête et pied de page. |
| `kevin-machy-logo.png` | 300 × 93 | 8 Ko | Logo bitmap, noir sur transparent. | Repli d'archive. Trop basse définition pour un affichage écran — non utilisé. |
| `kevin-portrait.png` / `.webp` | 576 × 768 (3:4) | 221 / 16 Ko | **Portrait de Kevin** récupéré sur son ancien site : noir et blanc, très basse lumière, fond noir pur, casquette au bois de cerf. | **Archive.** Il a servi `apropos-portrait`, `home-apropos` et `og-apropos` jusqu'au 4 octobre 2026, en les bridant à 480 px. Remplacé par `.cache/raw/km-kevin-portrait.jpg`, de la même séance, en 4178 × 6267. |
| `app/icon.png`, `app/apple-icon.png` | 512 / 180 | — | **Favicon dérivé du monogramme KM**, détouré au pixel près depuis le SVG et centré sur `#0A0A0B`. | Onglet et écran d'accueil. |

**Constat directeur** — l'autoportrait de Kevin est en noir et blanc basse lumière sur fond noir, et son monogramme est un didone à fort contraste. Les deux seuls actifs de marque existants pointaient déjà vers le registre retenu : sombre, contrasté, sobre. La direction « Chambre noire » ne fait que suivre ce que sa marque disait déjà d'elle-même.

**À réclamer à Kevin**
- ~~Une version 2× de son portrait~~ — obtenue le 3 octobre 2026, et bien au-delà : 4178 × 6267.
- Le logo en version vectorielle propre, avec un `fill` explicite sur tous les tracés.

La livraison du 3 octobre contenait deux autres actifs de marque, laissés de
côté pour l'instant : un **monogramme KM en pastille ronde** (1254 × 1254, PNG
blanc sur noir) que le site n'utilise nulle part, et un `favicon-kevin-machy.svg`
à comparer au favicon actuel, dérivé du monogramme, avant toute substitution.

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

**La définition, pour les formats couchés — en partie réglée.** La première
sélection ne dépassait pas 1600 px de large : c'étaient les copies web de son
site actuel, pas ses originaux — 63 sur 80 portaient une marque de réduction
dans leur nom (`-scaled` de WordPress, `_11zon` d'un compresseur en ligne,
`_rw_1200` d'un constructeur de site).

Les emplacements verticaux et carrés s'en contentaient. Les couchés, non :
`heroWide` réclame 2560 px et `wide` 1920 px. Le script **n'agrandit plus** —
il écarte les largeurs que la source ne porte pas et le dit à chaque passage.

La livraison du 3 octobre a apporté les originaux de dix-neuf de ces
photographies, et le second versement les a substituées (voir plus bas). Treize
emplacements y ont gagné, dont les trois bandeaux de tête.

Sur les cent douze emplacements du site, neuf sont des cadres nommés, sans
source. Des cent trois qui en ont une, **trente-sept restent bridés** faute
d'original — contre cinquante avant ce versement.

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
| **Contact** | `contact-studio` | Paysage 3/2 — le studio du 7 avenue Charles Dupuy |
| **Partage** | `og-default`, `og-mariage`, `og-portrait`, `og-iris`, `og-apropos`, `og-contact` | 1200 × 630, générés automatiquement à partir des sources |

### Les prestations reprises de l'ancien site

Vingt et une photographies ont été récupérées sur `dronezvous.com` en octobre
2026, avant son extinction : ce sont celles de Kevin, publiées sur ses pages
entreprise, drone, photobooth et formation. Le script qui les a téléchargées est
`.cache/recuperer-photos.mjs`, et les originaux sont dans `.cache/raw/` sous
leurs noms `km-ent-*`, `km-drone-*`, `km-photobooth-*`, `km-formation-*`.

Trois fichiers de ces pages n'ont **pas** été repris : une image engendrée par
IA et une capture d'écran, qui n'ont rien à faire là, et trois logos de clients
— une marque appartient à son titulaire, pas au photographe qui a travaillé pour
elle.

Quatre emplacements ne portent que leurs plus petites largeurs, faute de source
plus grande chez WordPress : `ent-accueil` (768 px), `photobooth-invites`,
`photobooth-hero-wide` et `prestations-photobooth`. Le script l'annonce à chaque
passage.

### La livraison du 3 octobre 2026

Kevin a transmis un lot de photographies pleine définition — jusqu'à
12 000 × 8 000 px. Elles remplacent les originaux récupérés sur WordPress, que
l'ancien site avait rapetissés, et comblent un emplacement vide.

| Emplacement | Avant | Après |
|---|---|---|
| `ent-hero-wide`, `ent-hero-tall`, `ent-portrait`, `ent-magasin`, `ent-accueil` | sources WordPress, dont une de 768 px | originaux, de 2 362 à 5 432 px |
| `ent-nb` | un portrait en 2 048 px | un autre portrait, en 3 641 px |
| `ent-equipe` | deux collaboratrices | **une équipe de six**, 6 006 px |
| `ent-metier` | — | **nouveau** : un audioprothésiste au travail |
| `photobooth-hero-wide`, `photobooth-invites` | 1 152 et 1 772 px | deux vraies prises, 6 000 × 4 000 |
| `photobooth-tirage` | — | **nouveau** : le tirage qu'un invité emporte |
| `iris-hero-wide` | source courte | un iris en 12 000 × 8 000 |
| `iris-animal-02` | **vide** | l'iris d'un chien à côté de celui de sa maîtresse |

Deux photographies livrées n'ont pas été retenues : « Portes Ouvertes », qui est
un reportage d'entreprise et aurait raconté quelque chose de faux sur la page
drone, et « Ambrine et John — Vin d'honneur », qui n'est pas une prise de
photobooth.

### Le second versement — les originaux des photographies déjà en place

La première passe n'avait lu cette livraison que comme une source d'images
**nouvelles**. Elle contenait aussi, sans que leur nom le dise, les originaux de
photographies déjà sur le site : les dossiers de Kevin portent des noms de
séance (`Posing - Kevin-4`, `Cabinet Médical-14`, `Anais et Simon-17`), pas des
noms d'emplacement.

Les deux lots ont donc été rapprochés **par empreinte perceptuelle** — une
signature de l'image elle-même, insensible au renommage, au recadrage léger et à
la recompression. Trente-deux correspondances, dont douze identiques à l'octet.
Chaque paire a ensuite été relue à l'œil, en planche de comparaison : même
photographie dans tous les cas.

Dix-neuf sources ont été remplacées par leur original. Les anciennes sont
conservées dans `.cache/raw-avant-originaux/`, parce que `.cache` n'est pas
versionné et que c'est le seul filet.

| Ce qui a gagné en définition | Avant | Après |
|---|---|---|
| `home-hero-wide`, `mariage-silence` | 1440 px | **2560 px** |
| `portrait-hero-wide`, `portrait-silence` | 1440 px | **2560 px** |
| `home-selection-01/05/12`, `mariage-galerie-01/09`, `portrait-galerie-04` | 1280 px | 1920 px |
| `mariage-galerie-12`, `iris-detail-04` | 720 px | 1440 px |
| `mariage-jour-05` | 720 px | 1280 px |

Les six autres sources remplacées alimentaient déjà des emplacements au plafond
de leur profil : elles ne changent pas les largeurs produites, seulement la
finesse du rééchantillonnage.

Un point de vigilance tenu : « Ambrine et John — Vin d'honneur » reste écartée de
la page photobooth, pour la raison dite plus haut. C'est son emplacement
**mariage** qui reçoit l'original — `km-wed-vin-honneur`, un vin d'honneur
photographié, ce qu'elle est.

Le recadrage a été revérifié après coup : `attention` se recalcule sur la
nouvelle source, et un cadrage pouvait glisser. Les vingt-neuf rendus distincts
ont été comparés avant/après — aucun sujet déplacé, aucune coupe nouvelle.

### Les photographies inédites — neuf retenues sur quarante et une

Le même rapprochement a isolé **quarante et une photographies que le site ne
montrait nulle part**. Aucune ne comble un cadre nommé : les neuf emplacements
vides attendent exactement ce que cette livraison n'apporte pas.

Elles ont donc servi à **allonger les galeries**, jamais à remplacer un choix
déjà fait. Mariage passe de douze à dix-huit images, portrait de dix à treize.

| Emplacement | Ce qu'il apporte à la galerie |
|---|---|
| `mariage-galerie-13` | La cérémonie elle-même, en noir et blanc — la galerie n'en montrait aucune. |
| `mariage-galerie-14` | La mariée de dos devant une fenêtre, dos de dentelle ouvert. |
| `mariage-galerie-15` | Un détail : la boutonnière du marié. La galerie en était pauvre. |
| `mariage-galerie-16` | Un groupe au complet dans un pré — le seul groupe au sol, les autres sont au drone. |
| `mariage-galerie-17` | Les mariés dans un escalier, en clair-obscur dur. |
| `mariage-galerie-18` | Une enfant qui cache son visage pendant la cérémonie. |
| `portrait-galerie-11` | Un visage encadré par deux mains, regard direct. |
| `portrait-galerie-12` | Une femme assise sur fond gris — une lumière plus claire que le reste de la page. |
| `portrait-galerie-13` | Un couple devant une porte bleue, en extérieur : la galerie n'avait aucun couple. |

**Trois portraits seulement, et non quatre.** Le quatrième candidat montrait la
femme en dentelle noire, qui tient déjà `portrait-galerie-02` et `-09`. Une
troisième image d'elle aurait allongé la page sans l'élargir.

Les galeries vivent en base : `scripts/poser-galeries.mjs` y inscrit ces
identifiants, par ajout en fin de liste et sans jamais retirer. Il est
idempotent et branché sur « Corrections de contenu ».

**Ce qui reste inutilisé, et pourquoi :**

| Laissé de côté | Nombre | Raison |
|---|---|---|
| Mariage et portrait | 13 | Bonnes, mais les galeries doublaient. Elles restent disponibles. |
| Grossesse | 3 | Thème que le site ne vend pas — à cadrer avec Kevin. Deux des trois portent un filigrane KM visible. |
| Famille | 1 | Même raison. |
| Entreprise | 5 | Dont « Portes Ouvertes », déjà écartée en septembre. |
| Iris | 3 | Exports web de 600 à 900 px : les emplacements iris réclament 1440 px, elles n'amélioreraient rien. |
| Non-photographies | 3 | Le monogramme en pastille, un logo « Signature Mariage », l'attestation de formation. |

### Les sept tirages d'art — toujours à fournir

L'ancien site illustrait ses six tirages d'art par des **maquettes** : le même
salon gris, le même canapé, le même cadre au mur, et l'œuvre dedans. Dans une
source de 1080 px, la photographie n'occupe que 490 × 327 px — en dessous de la
plus petite largeur que ce site produit.

**La livraison du 3 octobre contenait les mêmes maquettes**, dans un dossier
« Tableau a vendre » : même salon, même format 1080 × 1080, une centaine de
kilo-octets. Ce ne sont pas les photographies. Ce qu'il faut, ce sont les
fichiers d'origine — ceux qui ont servi à fabriquer ces maquettes.

Les recadrer donnerait des images molles ; les garder entières afficherait six
fois un salon de banque d'images sur la page d'un photographe. Ce sont donc des
cadres nommés, et Kevin a les originaux — ce sont ses photographies.

| Emplacement | Ce qu'il faudrait |
|---|---|
| `tirage-lac-bleu` | « Lac Bleu d'Automne » — le lac Bleu vu du ciel, automne 2023, Haute-Loire. |
| `tirage-ocean` | « Océan d'Été » — vue aérienne d'une plage, été 2023, Portugal. |
| `tirage-coucher` | « Coucher d'Été ». |
| `tirage-voiles` | « Toutes voiles dehors ». |
| `tirage-pont-amours` | « Pont des Amours ». |
| `tirage-pont-face` | « Pont d'en face ». |
| `prestations-tirages` | La carte du sommaire des prestations. L'une des six fait l'affaire, en 4/5. |

Format carré pour les six œuvres, 4/5 pour la carte. **L'œuvre seule, sans cadre
ni mise en situation** — c'est la page qui l'encadre.

### Les trois emplacements vides

Un emplacement sans source n'est **jamais** comblé par un visuel générique : le
composant `<Photo>` affiche un cadre nommé portant l'identifiant. Trois
subsistent.

| Emplacement | Ce qu'il faudrait |
|---|---|
| `iris-animal-02` | Un second iris d'animal. Le premier existe — un œil à pupille en fente horizontale, à côté d'un iris humain — et occupe `iris-animal-01`. |
| `iris-support-bijou` | Un bracelet, un collier ou une bague gravés d'un iris, portés, en carré. |
| `contact-studio` | Une vue du studio du 7 avenue Charles Dupuy, en 3/2. |

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
