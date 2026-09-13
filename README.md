# Kevin Machy — site

Refonte complète du site de Kevin Machy, photographe et Artisan d'Art au Puy-en-Velay.
Direction artistique **« Chambre noire »** : fond quasi noir, une image par écran, hiérarchie
portée par l'échelle typographique et le vide.

- **Stack** — Next.js 16 (App Router), TypeScript, CSS Modules, PostgreSQL. Le BackOffice est
  écrit ici, de bout en bout : aucun CMS tiers.
- **Typographies** — Bodoni Moda (Google Fonts) en titres, Switzer (Fontshare) auto-hébergé en texte.
- **Palette** — fond `#0A0A0B`, encre `#E9E5DE`, accent cuivre `#B9784F` (moins de 5 % de la surface).

---

## Démarrer

```bash
npm install
cp .env.exemple .env   # rien à compléter en local, les valeurs par défaut suffisent
npm run base           # lance PostgreSQL et la boîte aux lettres de développement
npm run migrer         # crée les tables
npm run images         # encode les images dans public/img (≈ 2 min)
npm run dev            # http://localhost:3000
```

Le site public est sur `/`, le BackOffice sur `/admin`. Au premier lancement, `/admin` propose
de créer un compte : **le tout premier créé est automatiquement administrateur**, sinon
personne ne pourrait en créer d'autres.

`npm run base:stop` arrête la base sans rien perdre, `npm run base:reinit` efface tout et
repart à zéro.

**Les e-mails partent dans une boîte locale**, jamais sur Internet : tout ce que le site envoie
se lit sur [http://localhost:8025](http://localhost:8025). Dans Réglages → E-mails, pointer le
serveur sur `localhost`, port `1025`, chiffrement « aucun », et n'importe quels identifiants.

---

## Architecture

Une seule application sert le site public et le BackOffice, sur le même serveur et la même
base. Kevin ne se connecte qu'à son domaine, à aucun service tiers.

```
app/(frontend)/    le site public, six pages, toujours pré-rendues
app/(backoffice)/  le BackOffice : connexion, tableau de bord, éditeur
app/robots.ts      ces deux-là doivent rester à la racine de `app`,
app/sitemap.ts     Next ne les reconnaît pas ailleurs
cms/schema.ts      le langage qui décrit une section
cms/catalogue.ts   les treize sections du catalogue
lib/apparence.ts   tailles, couleurs, polices autorisées — source unique
lib/bdd.ts         accès PostgreSQL
lib/auth.ts        mots de passe, sessions, rôles
migrations/        le schéma, un fichier SQL par étape
docker-compose.yml PostgreSQL de développement, même version que le serveur visé
```

**Le site public reste statique à la construction** : les six pages sont pré-rendues, seules
les routes d'administration sont dynamiques. `npm run build` l'affiche dans son tableau de
routes, et c'est le contrôle à faire après toute modification de la configuration.

### Le BackOffice est écrit ici

Aucun CMS tiers. L'authentification, les sessions, le schéma et les écrans sont dans ce dépôt.
Trois décisions valent d'être connues avant d'y toucher, et elles sont commentées dans
`lib/auth.ts` :

- le mot de passe n'est jamais stocké, seulement une empreinte scrypt avec un sel par compte ;
- la session est une ligne en base, pas un jeton autoportant : la révoquer coupe l'accès
  immédiatement ;
- le cookie porte le jeton, la base n'en garde que l'empreinte.

### E-mails

Kevin saisit lui-même ses réglages SMTP dans le BackOffice : rien n'est codé en dur, ni
serveur, ni identifiants, ni adresse. Trois points valent d'être connus.

- **Le mot de passe est chiffré en AES-256-GCM** avant d'entrer en base, avec la clé
  `CLE_CHIFFREMENT` de l'environnement. Il n'est jamais réaffiché, ni renvoyé au navigateur :
  il se remplace, il ne se relit pas. Perdre la clé oblige seulement à ressaisir le mot de passe.
- **La demande de contact est enregistrée avant d'être envoyée.** Une panne du serveur d'envoi
  ne fait donc perdre aucun client : la demande attend dans l'onglet Messages, et son échec
  d'acheminement y est signalé.
- **Le formulaire est la seule porte ouverte du site.** Trois protections le gardent : un champ
  piège invisible, un délai minimal avant envoi, et une limite par adresse IP. Le compteur vit en
  mémoire : il faudra le déplacer en base le jour où le site tournera sur plusieurs machines.

### Migrations

Un fichier SQL par étape dans `migrations/`, joué une fois, dans une transaction. Le nom du
fichier sert de clé : **ne jamais renommer ni modifier une migration déjà appliquée**, en créer
une nouvelle. `npm run migrer` le vérifie et refuse de continuer sinon.

---

## Déploiement

**Il n'y en a plus pour l'instant, et c'est volontaire.** Le site n'est plus un export statique :
le BackOffice réclame un serveur qui exécute du code, une base PostgreSQL et une
authentification. Un hébergement mutualisé ne sait rien en faire, il faut un VPS.

L'ancien envoi FTP vers Hostinger a donc été retiré. `.github/workflows/construction.yml` se
contente désormais de vérifier que `main` compile, base de test à l'appui.

Le déploiement sera rebranché après la démonstration à Kevin et l'ouverture des accès.

**Les images encodées (`public/img/`) sont versionnées** — la CI ne les régénère pas, car les
sources vivent dans `.cache/raw/`, ignoré par git. Après toute modification de
`scripts/build-images.mjs`, relancer `npm run images` en local et committer le résultat.

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

## Simulateur de tarifs iris

Le sélecteur « nombre d'humains / nombre d'animaux » de la page Iris est rebranché dans
`components/SimulateurIris.tsx`.

**Le tarif dépend du nombre total d'iris photographiés**, pas de la répartition entre humains
et animaux : la page de réservation ne vend que « 1 Iris », « 2 Iris », etc. Les deux compteurs
servent au visiteur à compter, pas au calcul. La grille vit dans `IRIS_GRILLE.parIris`
(`lib/site.ts`) et vient telle quelle de sumupbookings.com/kevin-photographe :

| Iris | Prix | Durée |
|---|---|---|
| 1 | 49 € | 30 min |
| 2 | 79 € | 45 min |
| 3 | 99 € | 1 h |
| 4 | 129 € | 1 h 15 |
| 5 | 159 € | 1 h 30 |

Comportement :

- au-delà de cinq iris → « Sur devis », avec un lien vers le contact ;
- grille vidée → la page retombe sur « À partir de 49 € » et masque les compteurs. **Aucun
  tarif n'est deviné ni interpolé** ;
- le total ne descend jamais sous un sujet photographié.

Accessible : boutons étiquetés, montant et durée annoncés dans une zone `aria-live`,
navigation clavier.

**À maintenir en même temps que SumUp.** Si Kevin change ses prix sur sa page de réservation,
`IRIS_GRILLE.parIris` doit suivre — sinon le site annonce un tarif que la réservation ne
pratique plus.

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
