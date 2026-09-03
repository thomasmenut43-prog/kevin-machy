# Kevin Machy — site

Refonte complète du site de Kevin Machy, photographe et Artisan d'Art au Puy-en-Velay.
Direction artistique **« Chambre noire »** : fond quasi noir, une image par écran, hiérarchie
portée par l'échelle typographique et le vide.

- **Stack** — Next.js 16 (App Router), TypeScript, CSS Modules, export statique.
- **Typographies** — Bodoni Moda (Google Fonts) en titres, Switzer (Fontshare) auto-hébergé en texte.
- **Palette** — fond `#0A0A0B`, encre `#E9E5DE`, accent cuivre `#B9784F` (moins de 5 % de la surface).

---

## Démarrer

```bash
npm install
npm run images   # encode les images dans public/img (≈ 2 min)
npm run dev      # http://localhost:3000
```

`npm run build:full` enchaîne l'encodage des images et la construction du site.
La sortie statique est écrite dans `out/` : elle se déploie telle quelle sur Vercel,
Netlify, ou n'importe quel hébergement de fichiers.

---

## Avant la mise en ligne — cinq points

1. **Remplacer toutes les photographies.** Les images actuelles viennent de Pexels et ne sont
   pas le travail de Kevin. Voir [`assets.md`](assets.md) pour la liste des emplacements et
   [`CREDITS-IMAGES.md`](CREDITS-IMAGES.md) pour leur provenance. **Le site n'est pas
   publiable avant ce remplacement.**
2. **Renseigner le domaine** dans `lib/site.ts` (`SITE.url`). Il sert aux URL canoniques, à
   l'Open Graph, au sitemap et aux données structurées.
3. **Confirmer l'adresse du studio.** `14 avenue Foch, 43000 Le Puy-en-Velay` est relevé sur
   la page Studio de l'Iris du site actuel ; le code postal a été complété. À valider avec Kevin.
4. **Brancher le formulaire de contact** (voir ci-dessous).
5. **Vérifier l'adresse e-mail.** Elle est encore en `@dronezvous.com`, ce qui ne colle plus
   avec le positionnement. À arbitrer avec Kevin en même temps que le domaine.

---

## Remplacer une photographie

1. Déposer le fichier JPEG (sRGB, qualité 90, plus grand côté ≥ 2000 px) dans `.cache/raw/`.
2. Dans `scripts/build-images.mjs`, pointer l'emplacement voulu vers ce fichier :
   ```js
   { name: 'mariage-hero-wide', profile: 'heroWide', src: R('mon-fichier.jpg') },
   ```
3. `npm run images`.
4. Mettre à jour le texte alternatif dans la page concernée (`app/…/page.tsx`) : il doit
   décrire ce qui se passe dans le cadre, jamais « photo de mariage ».

Un emplacement dont la source est absente (`src: null`) n'est **pas** remplacé par un visuel
générique : le composant `<Photo>` affiche un cadre nommé avec l'identifiant de l'emplacement.
C'est le cas aujourd'hui de `iris-support-bijou`.

**Profils disponibles** — `heroWide` (16/9), `heroTall` (3/4, écrans étroits), `wide` (3/2),
`tall` (4/5), `square` (1/1), `portraitBook` (2/3). Chacun produit quatre largeurs en AVIF,
WebP et JPEG, plus un manifeste typé (`lib/images.generated.ts`).

---

## Formulaire de contact

Le site étant statique, il n'y a pas de serveur pour recevoir les envois. Deux chemins :

- **Sans configuration** : le formulaire ouvre la messagerie du visiteur avec un message
  prérempli. Cela fonctionne partout, mais reste rugueux.
- **Avec un point de collecte** : définir `NEXT_PUBLIC_CONTACT_ENDPOINT` (Formspree, Basin,
  une fonction Vercel…). Le formulaire enverra alors un POST JSON avec les champs `nom`,
  `email`, `projet`, `date`, `telephone`, `message`, `consentement`.

```bash
# .env.local
NEXT_PUBLIC_CONTACT_ENDPOINT=https://formspree.io/f/xxxxxxx
```

Les liens existants vers l'accès client (pic-time) et la prise de rendez-vous (SumUp) sont
conservés tels quels dans `lib/site.ts`.

---

## Structure

```
app/                    une page par route, métadonnées et données structurées incluses
components/             Photo, Hero, Gallery (+ visionneuse), Reveal, Header, Footer, Faq, ContactForm
lib/site.ts             toutes les données factuelles : tarifs, coordonnées, liens, FAQ
lib/images.generated.ts manifeste des images — généré, ne pas modifier à la main
styles/                 motifs partagés entre les pages intérieures
scripts/                récupération des photos, encodage, captures de contrôle
contenu-source.md       extraction verbatim du site actuel + intention de chaque bloc
assets.md               inventaire des images et emplacements manquants
```

**Toute donnée factuelle vit dans `lib/site.ts`.** Un tarif ne se modifie qu'à cet endroit.
Rien ne doit y entrer qui ne figure pas dans `contenu-source.md`.

---

## Animation

Quatre moments animés par page, pas un de plus :

1. l'entrée du texte du héros, échelonnée ;
2. la parallaxe du héros — le seul élément en parallaxe du site, désactivé sous 900 px ;
3. l'apparition des titres et paragraphes de section ;
4. le voile qui se lève sur les images, échelonné dans les galeries.

Durées de 300 à 700 ms, translation de 12 à 24 px, aucune rotation, aucun zoom au défilement.
`prefers-reduced-motion: reduce` désactive toutes les transitions de position ; il ne reste
que des fondus de 300 ms. Le curseur dédié n'apparaît que sur les galeries, où il annonce une
action réelle — agrandir l'image — et jamais au doigt ni au clavier.

---

## Vérifications automatisées

```bash
node scripts/audit.mjs     # 39 contrôles : débordement, menu, visionneuse, alt, h1, métadonnées
node scripts/shots.mjs         # planches de contrôle desktop dans .cache/shots
node scripts/shots.mjs --mobile
```

Le serveur de développement doit tourner pour les deux.
