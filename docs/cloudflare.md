# Faire tourner l'application sur Cloudflare Workers

L'application peut désormais **se construire** pour Cloudflare Workers :

```bash
npx opennextjs-cloudflare build     # → .open-next/worker.js
```

Elle n'y tourne pas encore complètement. Ce document dit ce qui a été levé, ce
qui reste, et dans quel ordre.

## Pourquoi

L'hébergement mutualisé du client refuse les applications Node. Cloudflare les
accepte gratuitement, et sa passerelle Hyperdrive sait joindre une base MySQL
restée ailleurs — chez Hostinger, en l'occurrence. La vitrine statique
(`docs/vitrine-statique.md`) couvre le site public ; ceci couvre le BackOffice,
qui a besoin d'un serveur quoi qu'il arrive.

## Ce qui a été levé : `sharp`

C'était le **seul** obstacle à la construction. `sharp` est un binaire natif :
il n'existe pas dans un Worker, et tant qu'il était importé, l'application ne
pouvait se poser que sur un vrai serveur Node.

L'encodage est parti dans le navigateur — voir `lib/encoder-images.ts`. Le
serveur ne reçoit plus que du WebP déjà prêt ; il vérifie les octets et les
range. `sharp` reste en dépendance de développement, pour les scripts qui
préparent les images du site.

Deux conséquences assumées :

- **Le TIFF n'est plus accepté.** Aucun navigateur ne le décode.
- **Le recadrage d'une photo de profil est centré**, là où `sharp` visait la
  zone la plus « intéressante ».

Et une garantie qu'il fallait remplacer : le serveur ne décodant plus les
images, il ne peut plus constater qu'un fichier est bien ce qu'il prétend. Il
vérifie donc la signature `RIFF…WEBP`, et refuse une largeur qui ne serait pas
l'une des siennes — sans quoi un nom de fichier choisi par l'appelant écrirait
où bon lui semble.

## Ce qui a été levé : le disque

`lib/medias.ts` écrivait sur le disque et la route des médias l'y relisait. Ça
**compilait** sous `nodejs_compat`, mais aurait échoué à l'exécution : un
Worker n'a pas de disque.

Les deux passent désormais par un **coffre** (`lib/coffre.ts`) : quatre
opérations — écrire, lire, effacer, copier — et deux mises en œuvre. Le disque
reste le choix par défaut et sert au développement comme à tout hébergement
qui soit un vrai serveur ; le guichet de Hostinger prend le relais quand
`COFFRE=hostinger`.

Chacune est chargée à la demande, sans quoi la version Workers embarquerait
`node:fs` et la version Node un client dont elle n'a que faire.

**R2 avait été écrit, puis retiré.** Il exige une carte bancaire sur le compte
même pour sa part offerte, et Hostinger offre dix fois plus d'espace déjà payé.
Surtout, les images y sont servies par Apache et ne passent plus par le Worker :
Cloudflare compte chaque requête, et une page de vingt photographies en vaudrait
vingt-et-une. La mise en place est décrite dans `hostinger/LISEZ-MOI.md`.

## Ce qui a été levé : la base

Un Worker est éphémère. Joindre MySQL directement lui coûterait, à chaque
invocation, une poignée de main TCP puis TLS puis l'authentification — plus de
cent seize millisecondes avant la première requête. Hyperdrive tient des
connexions déjà ouvertes près de la base et les prête.

Il rend une adresse ordinaire, que `mysql2` sait utiliser telle quelle : c'est
pourquoi rien d'autre ne change. `lib/bdd.ts` va la chercher quand
`BASE=hyperdrive`, et lit `DATABASE_URI` partout ailleurs.

Un détail qui compte : la réserve de connexions garde désormais **une promesse**
et non un objet. Deux requêtes simultanées sur un serveur qui démarre en
ouvriraient chacune une sans ça.

## Ce qui reste

**Deux gestes dans les interfaces, que le code ne peut pas faire.**

L'accès distant de Hostinger n'accepte qu'**une adresse ou `%`**, et Hyperdrive
sort par les plages de Cloudflare : c'est donc `%`. Un port MySQL ouvert sur
Internet se fait balayer en permanence, et la prochaine faille du moteur
devient directement exploitable — c'est le vrai coût de ce choix, et il ne se
règle pas par un mot de passe.

Puis la passerelle se crée, et donne l'identifiant à poser dans
`wrangler.jsonc` :

```bash
npx wrangler hyperdrive create kevin-machy-base   --connection-string="mysql://UTILISATEUR:MOTDEPASSE@srv926.hstgr.io:3306/BASE"
```

**Le déménagement des fichiers existants.** Le guichet sait écrire chez
Hostinger, mais personne n'y a encore versé ce qui dort dans `medias/`. À faire
le jour du basculement, pas avant.

## Le cache

Sans réglage, chaque visite recalculerait la page : le Worker interrogerait la
base, rendrait le HTML, et recommencerait au visiteur suivant. Les pages
portent déjà `revalidate = 300` — encore faut-il dire à Cloudflare **où**
garder ce qui a été calculé.

| pièce | où | à quoi ça sert |
|---|---|---|
| `incrementalCache` | KV | garde les pages déjà rendues |
| `tagCache` | D1, `kevin-machy-etiquettes` | **c'est ce qui fait marcher « Publier »** |
| `queue` | `direct` | refait une page périmée dans la foulée |

Le registre d'étiquettes mérite un mot. Quand Kevin publie, l'éditeur appelle
`revalidatePath`. Pour savoir quelles pages en cache cela concerne, il faut
avoir noté ce que chacune contient — c'est ce registre. Sans lui, le bouton
Publier resterait sans effet visible pendant cinq minutes.

Pour la file, `direct` suffit : l'autre voie passe par des objets durables,
utiles quand les régénérations se bousculent, ce qui suppose un trafic que ce
site n'aura pas. Une pièce de moins à entretenir.

KV plutôt que R2, là encore pour éviter la carte bancaire. Son gigaoctet offert
dépasse largement ce que pèsent les pages d'un site vitrine.

Les ressources sont créées, leurs identifiants sont dans `wrangler.jsonc` :

| | |
|---|---|
| Hyperdrive | `5ec15d5b93d84f13ae16e4f44889027b` |
| KV | `713636edcb6c4cf69bcb66c5e30e587b` |
| D1 | `6d19748f-0f9a-498c-bf7d-9f4a679086df` |

## Les types des liaisons

`worker-configuration.d.ts` est **engendré**, pas écrit à la main :

```bash
npx wrangler types     # à relancer après toute modification de wrangler.jsonc
```

Il apporte au passage un typage plus strict du `Request` des Workers —
`json()` n'y rend plus `any`. C'est un gain de justesse, mais il oblige à
typer les corps qu'on lisait à l'aveugle.

## Un détail d'atelier

**La construction pour Workers ne passe pas sous Windows** sans le mode
développeur : OpenNext crée des liens symboliques, que Windows refuse aux
comptes ordinaires. *Paramètres → Confidentialité et sécurité → Espace
développeurs*, ou construire en intégration continue, sous Linux — ce qui sera
de toute façon le cas en production.

## Déployer : toujours reconstruire

```bash
npm run deployer
```

Ce script fait deux choses dans l'ordre, et l'ordre est tout : il refabrique
`.open-next/` à partir des sources, **puis** l'envoie.

`wrangler deploy` seul n'est pas un déploiement du code : c'est un envoi du
dernier paquet construit. Appelé après une correction non recompilée, il
renvoie l'ancien code sans rien signaler — la commande réussit, la version
change, et la panne qu'on vient de corriger persiste. Deux correctifs ont été
« déployés » ainsi avant qu'on s'en aperçoive.

Ce qui a tranché : lire le paquet réellement envoyé.

```bash
npx wrangler deploy --dry-run --outdir=.paquet
```

Il fabrique, sans rien envoyer, le fichier exact que Cloudflare reçoit — celui
dont les numéros de ligne apparaissent dans les piles d'erreur. `.open-next/worker.js`
n'en est que l'enveloppe, et ses quarante lignes ne correspondent à rien de ce
qui tourne là-bas.

## Hyperdrive ne prépare pas les requêtes

`mysql2` sait parler à la base de deux façons, et Hyperdrive n'en relaie
qu'une.

| | |
|---|---|
| `execute()` | prépare la requête côté base (`COM_STMT_PREPARE`) — **refusé** |
| `query()` | envoie la requête assemblée et échappée — accepté |

Le refus est explicite dans les journaux du Worker — *« Hyperdrive does not
currently support MySQL COM_STMT_PREPARE messages »* — mais invisible depuis le
navigateur, qui n'obtient qu'un 500 sans corps. Toute page lisant la base
tombait ; celles qui redirigeaient avant de lire semblaient fonctionner, ce qui
égarait le diagnostic.

`lib/bdd.ts` utilise donc `query()` **partout**, et non seulement sur
Cloudflare : `execute()` étant le plus strict des deux, garder les deux chemins
aurait laissé passer en développement des requêtes refusées en ligne.

La protection contre l'injection SQL est inchangée — c'est `mysql2` qui
échappe les valeurs, et il le fait pour le dialecte qu'il a en face.

## Pour lire une erreur en ligne

Le Worker n'envoie qu'un 500 nu. Le message est dans ses journaux :

```bash
npx wrangler tail --format json
```

Les piles sont minifiées, mais leurs numéros de ligne désignent le paquet que
`--dry-run` reconstruit à l'identique. C'est ainsi que les deux pannes ci-dessus
ont été nommées.

## Le déploiement automatique

Depuis `.github/workflows/deploiement.yml` : toute fusion vers `main` met le
site en ligne. `npm run deployer` reste là pour les envois à la main — un
correctif urgent, une vérification.

L'ordre des étapes est le garde-fou : base à jour → types → construction →
envoi. La première qui échoue arrête tout, et rien ne part.

### Les trois secrets, côté GitHub

*Settings → Secrets and variables → Actions → New repository secret*

| Nom | Ce que c'est |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Le droit de déployer. Modèle **Edit Cloudflare Workers**, compte *Kevin Machy* uniquement. |
| `CLOUDFLARE_ACCOUNT_ID` | L'identifiant du compte — `npx wrangler whoami` le donne. |
| `DATABASE_URI` | La base de Kevin chez Hostinger, la même adresse que dans le `.env` local. |

Le jeton Cloudflare n'est montré **qu'une fois**, à sa création. Perdu, il ne
se retrouve pas : on en fabrique un autre et on révoque l'ancien.

### La base est lue, jamais modifiée

Le déploiement construit contre la vraie base, parce que le contenu du site y
vit : construit contre une base vide, il produirait un site vide.

Il ne fait que lire. Les migrations ne sont **pas** appliquées
automatiquement — `npm run migrer -- --verifier` se contente de dire si la base
a pris du retard, et arrête le déploiement si c'est le cas. Ce mode ne crée
même pas la table de suivi : il peut être lancé contre la base du client sans y
laisser de trace.

C'est un choix. MariaDB ne sait pas revenir en arrière sur une modification de
structure : une migration fautive appliquée toute seule toucherait les vraies
photos et les vrais tarifs avant que quiconque l'ait vue tourner. Le jour où le
déploiement s'arrête là, sauvegarder la base, puis :

```bash
npm run migrer
```

### Les variables figées à la construction

`NEXT_PUBLIC_BASE_MEDIAS` et `NEXT_PUBLIC_URL_SITE` sont **inscrites dans le
code au moment de la construction**, pas lues à l'exécution — c'est ce que veut
dire le préfixe. Les déclarer dans `wrangler.jsonc` ne suffit pas : elles
doivent aussi être dans l'environnement qui construit.

D'où une valeur en deux endroits, qui doivent rester d'accord :

| | `wrangler.jsonc` | `deploiement.yml` |
|---|---|---|
| `NEXT_PUBLIC_BASE_MEDIAS` | pour l'exécution | pour la construction |

Oubliée à la construction, elle ne casse rien de visible : les photos repassent
simplement par le Worker au lieu d'Apache, et chacune consomme une des cent
mille requêtes quotidiennes. C'est le genre de panne qui ne se voit pas — d'où
ces deux paragraphes.

En développement elle reste **vide**, et c'est voulu : les images passent alors
par la route `/medias/`, qui les lit sur le disque d'à côté.

## Rentrer dans le BackOffice quand le mot de passe est perdu

Il n'y a pas de « mot de passe oublié » dans l'application, et c'est un choix :
un tel formulaire suppose une boîte mail joignable, et ouvre une porte de
secours que personne ne surveille. Les comptes se comptent sur une main, et
leurs titulaires se joignent au téléphone.

Le revers, c'est qu'un mot de passe perdu enferme dehors — les empreintes
scrypt ne se remontent pas, et on ne change le sien qu'une fois entré. D'où
`scripts/mot-de-passe.mjs`, qui écrit directement en base.

```bash
npm run mot-de-passe                      # liste les comptes
npm run mot-de-passe -- kevin@machy.fr    # en redéfinit un
```

Il vise la base de `DATABASE_URI`, donc celle du docker-compose par défaut.
Pour la base en ligne, poser la variable le temps de la commande — sous
PowerShell, en une ligne qui ne laisse rien derrière elle :

```powershell
$env:DATABASE_URI = "mysql://u750876317_kevinmachy:$(Read-Host 'Mot de passe de la base')@srv926.hstgr.io:3306/u750876317_kevinmachy"; npm run mot-de-passe; $env:DATABASE_URI = $null
```

Redéfinir un mot de passe **ferme les sessions ouvertes** du compte. Un mot de
passe qu'on remplace parce qu'on l'a perdu peut aussi l'avoir été parce qu'il a
fuité : laisser vivre les sessions existantes ne changerait rien pour qui les
détient.
