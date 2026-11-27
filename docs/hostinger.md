# Revenir chez Hostinger

Le site a quitté Hostinger le 3 octobre 2026 parce que le forfait de Kevin
refusait Node.js (voir `cloudflare.md`). Le 25 novembre 2026, Kevin a pris
l'offre qui l'accepte. Ce document dit comment ramener le site **sans que rien
ne se voie**, et comment revenir en arrière si besoin.

Pourquoi revenir : un Worker Cloudflare ne peut ouvrir aucune connexion vers le
courrier de Hostinger (`cloudflare.md`, « Un Worker ne joint pas une adresse de
Cloudflare »). Servi depuis Hostinger, le site peut lire et écrire dans la boîte
de Kevin — ce qu'exige un onglet E-mails digne de ce nom.

## Ce qui ne bouge pas

- **La base**, déjà chez Hostinger. Les deux sites, l'ancien et le nouveau,
  lisent la même pendant toute la transition.
- **Les photos**, déjà chez Hostinger, sur `medias.dronezvous.com`.
- **Le courrier** : MX, SPF, Resend, rien ne change.
- **Le domaine et sa zone DNS**, qui restent chez Cloudflare. Les redirections
  de `kevinmachy.fr` et de `www` sont des règles Cloudflare : elles continuent.

## Vérifié avant de commencer

Le 25 novembre 2026, le site construit par `next build` puis lancé par
`next start`, sans rien de Cloudflare, a passé les 61 contrôles de
`scripts/audit.mjs`. Le code n'avait rien à changer : `BASE` absent, il lit
`DATABASE_URI` ; `COFFRE=hostinger`, il range les photos par le guichet comme
aujourd'hui.

Un seul écart, qui tient à l'outil de contrôle et pas au site : en production,
Next précharge les pages vers lesquelles pointent les liens, et Playwright
attend parfois ces préchargements indéfiniment quand il recharge une page.
`waitUntil: 'networkidle'` se bloque alors sur la page du Studio de l'Iris.
Le serveur, lui, répond en deux millisecondes, et le site actuel fait de même.

## Le serveur de construction de Hostinger est ancien

Premier essai, le 27 novembre 2026 : la base s'ouvrait, mais la construction
s'arrêtait net. La bibliothèque système du serveur (glibc < 2.29) est trop
vieille pour le compilateur natif de Next 16, qui se rabat alors sur sa version
WebAssembly. Celle-ci a deux limites :

- elle ne sait pas lire un `next.config.ts` qui importe un autre fichier
  TypeScript — d'où `next.config.mjs` et `lib/redirections.mjs`, en JavaScript ;
- elle ne fait pas tourner Turbopack — d'où `next build --webpack` dans
  `construire:hostinger`. Cloudflare, lui, garde Turbopack.

Pour reproduire ces conditions sur un poste : `NEXT_TEST_WASM=1` force Next à
prendre la version WebAssembly.

## ⚠ Le piège n° 1 : les photos sont dans le dossier du vieux WordPress

L'ancien WordPress occupe toujours le site `dronezvous.com` du forfait. Or le
sous-domaine des photos a pour racine **un dossier de ce site** :

    /home/…/domains/dronezvous.com/jeton-medias.txt     ← le jeton du guichet
    /home/…/domains/dronezvous.com/public_html/          ← le vieux WordPress
    /home/…/domains/dronezvous.com/public_html/medias/  ← toutes les photos envoyées

**Supprimer le site `dronezvous.com` dans hPanel effacerait toutes les photos
de la médiathèque et le jeton du guichet.** Or c'est le geste qui vient
naturellement pour libérer le domaine. Ne rien supprimer : la façon de libérer
`dronezvous.com` se décide en regardant hPanel, avant la bascule (étape 2.1).

## Phase 1 — Installer à côté

Aucun effet visible : Cloudflare continue de servir le site.

### 1.1 L'application

hPanel → **Sites web → Ajouter un site → Application web Node.js**, importée
depuis GitHub :

| Réglage | Valeur |
|---|---|
| Dépôt | `thomasmenut43-prog/kevin-machy`, branche `main` |
| Cadre | Next.js |
| Node.js | 22 (ou 24) — `package.json` exige au moins 22 |
| Construction | `npm run construire:hostinger` |
| Démarrage | `npm start` |

`construire:hostinger` refuse de construire si la base a des migrations en
retard, comme le faisait le déploiement vers Cloudflare.

Hostinger donne une adresse provisoire. Noter aussi, dans la page de
l'application, les **limites de mémoire et de processus** de l'offre.

### 1.2 Les variables d'environnement

| Nom | Valeur |
|---|---|
| `DATABASE_URI` | `mysql://UTILISATEUR:MOTDEPASSE@HÔTE:3306/BASE` — voir 1.3. Essayer `localhost` comme hôte, sinon `srv926.hstgr.io` |
| `CLE_CHIFFREMENT` | une **nouvelle** clé : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_URL_SITE` | `https://dronezvous.com` |
| `NEXT_PUBLIC_BASE_MEDIAS` | `https://medias.dronezvous.com` |
| `COFFRE` | `hostinger` |
| `GUICHET_MEDIAS` | `https://medias.dronezvous.com/guichet-medias.php` |
| `JETON_MEDIAS` | le contenu de `domains/dronezvous.com/jeton-medias.txt` (gestionnaire de fichiers) |
| `INDEXATION` | `ouverte` |

**Ne pas poser `BASE`** : à `hyperdrive`, le site chercherait la passerelle de
Cloudflare.

`INDEXATION=ouverte` dès l'adresse provisoire, et c'est délibéré : chaque page
déclare `https://dronezvous.com` comme adresse canonique, donc l'adresse
provisoire ne prend la place de rien. L'inverse — la fermer puis oublier de la
rouvrir à la bascule — retirerait le vrai site de Google.

**Pourquoi une nouvelle clé de chiffrement.** Celle du site actuel n'existe que
chez Cloudflare, qui ne la réaffiche pas. Deux valeurs en base en dépendent : la
clé d'envoi Resend et, si elle est branchée, celle des avis Google. Le nouveau
site ne pourra pas les lire : elles se ressaisissent à la bascule (2.4), pas
avant — ressaisies sur le nouveau site, elles deviendraient illisibles pour
l'ancien, qui sert encore les visiteurs.

### 1.3 Le mot de passe de la base

Il n'existe en clair nulle part (secret GitHub, secret Hyperdrive, et Hostinger
ne le réaffiche pas). Pour le donner à l'application, il faut en choisir un
nouveau, et le donner **dans la même minute** au site actuel :

1. hPanel → Bases de données → `u750876317_kevinmachy` → changer le mot de passe ;
2. GitHub → Settings → Secrets → `DATABASE_URI` : la nouvelle adresse complète ;
3. GitHub → Actions → **« Mot de passe de la base vers Cloudflare »** → Run
   workflow. Il vérifie d'abord que l'adresse ouvre la base, puis la donne à
   Hyperdrive ;
4. la même adresse dans `DATABASE_URI` de l'application Hostinger.

Les connexions qu'Hyperdrive tient déjà ouvertes survivent au changement :
MariaDB ne coupe pas une session authentifiée. Le site actuel ne voit rien si
les étapes 1 à 3 se suivent. À faire à une heure creuse quand même.

### 1.4 Les essais, sur l'adresse provisoire

**La base est celle du vrai site.** Tout ce qui s'enregistre ici apparaît chez
les visiteurs à la prochaine mise à jour de leurs pages. Donc :

- pages publiques, anciennes adresses (`/photographe-mariage-haute-loire/` →
  `/mariage/`), page introuvable ;
- BackOffice : se connecter, ouvrir l'éditeur **sans enregistrer** ;
- médiathèque : envoyer une photo d'essai, vérifier qu'elle s'affiche, la
  supprimer ;
- formulaire de contact : un message d'essai, puis le supprimer. Sa
  notification échouera, c'est attendu (clé de chiffrement, voir 1.2) ;
- la mémoire consommée, dans hPanel, après quelques pages.

Si un bouton du BackOffice répond « Invalid Server Actions request », le
mandataire de Hostinger réécrit l'en-tête `Host` : poser l'adresse en cause
dans `experimental.serverActions.allowedOrigins` de `next.config.mjs` —
l'adresse exacte, jamais un joker du type `*.hostingersite.com`, qui ouvrirait
la porte à n'importe quel site hébergé là.

## Phase 2 — La bascule

De nuit, un quart d'heure, Kevin prévenu de ne pas toucher au BackOffice.

### 2.1 Libérer `dronezvous.com` chez Hostinger — sans rien supprimer

Voir le piège n° 1. Deux pistes, à trancher devant hPanel :

- **Déplacer d'abord les photos** hors de `domains/dronezvous.com/` (le
  sous-domaine `medias` devenant son propre site), vérifier qu'elles répondent,
  puis seulement retirer le WordPress — après l'avoir sauvegardé ;
- **ou ne pas toucher au WordPress** : l'application garde un sous-domaine à
  elle, et Cloudflare lui envoie `dronezvous.com` en réécrivant l'en-tête
  `Host` (règle d'origine). Il faut alors ajouter `dronezvous.com` à
  `allowedOrigins`.

### 2.2 Rattacher le domaine à l'application

hPanel → l'application → domaine `dronezvous.com`. Relever l'adresse IP que
Hostinger indique.

### 2.3 Cloudflare

1. Workers & Pages → `kevin-machy` → Domaines → retirer `dronezvous.com` ;
2. aussitôt, DNS → enregistrement `A` `@` → l'IP de Hostinger, **proxifié**
   (nuage orange) : le certificat HTTPS des visiteurs reste celui de
   Cloudflare, sans attendre celui de Hostinger ;
3. SSL/TLS → mode **Complet** (*Full*). En *Flexible*, Hostinger redirigerait
   vers HTTPS et la page tournerait en boucle.

Entre 1 et 2, le domaine ne résout plus : quelques secondes. C'est le même
piège qu'à l'aller, dans l'autre sens (Cloudflare refuse qu'un domaine de
Worker et un enregistrement `A` coexistent).

### 2.4 Ressaisir les clés

BackOffice → Réglages → E-mails : la clé Resend, puis **« Envoyer un test »**.
Même chose pour les avis Google s'ils sont branchés. Un message de contact
arrivé entre la bascule et cette étape est en base : le bouton « Renvoyer la
notification » le rattrape.

### 2.5 Vérifier

- `curl -sI https://dronezvous.com/` : la réponse ne vient plus du Worker ;
- les pages, les photos, une ancienne adresse, `robots.txt` (doit dire `Allow`) ;
- le formulaire de contact, de bout en bout ;
- le BackOffice : les sessions sont en base et le domaine n'a pas changé,
  Kevin reste connecté.

## Revenir en arrière

Cinq minutes, tant que le Worker existe :

1. Cloudflare → DNS → supprimer l'enregistrement `A` `@` ;
2. Workers & Pages → `kevin-machy` → Domaines → rajouter `dronezvous.com` ;
3. Réglages → E-mails → ressaisir la clé Resend (le Worker ne lit pas celle
   chiffrée par la nouvelle clé).

## Phase 3 — Après deux semaines sans retour en arrière

- Retirer le déploiement vers Cloudflare (`deploiement.yml`,
  `mise-en-ligne.yml`, `hyperdrive.yml`). D'ici là, il continue de mettre le
  Worker à jour à chaque fusion : c'est ce qui garde le retour en arrière à
  cinq minutes.
- Le workflow « Corrections de contenu » redéploie le Worker : sur Hostinger,
  les pages se rafraîchissent seules (`revalidate = 300`) ou à la reconstruction
  qui suit chaque fusion.
- Supprimer le Worker, son KV, sa base D1 et la passerelle Hyperdrive.
- **Refermer l'accès distant à la base** (aujourd'hui ouvert à `%` pour
  Hyperdrive et GitHub Actions) : c'est le vrai gain de sécurité du retour.
  Seuls les workflows qui écrivent en base en ont encore besoin
  (`corrections.yml`, `acces.yml`) — à revoir avant de fermer.
