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
qui soit un vrai serveur ; R2 prend le relais quand `COFFRE=r2`.

Chacune est chargée à la demande, sans quoi la version Workers embarquerait
`node:fs` et la version Node un client R2.

Le seau est à créer avant le premier déploiement :

```bash
npx wrangler r2 bucket create kevin-machy-medias
```

## Ce qui reste

**La base.** Elle reste chez Hostinger, jointe par Hyperdrive. Deux
préalables que le code ne peut pas résoudre :

- l'accès distant de Hostinger n'accepte qu'**une adresse ou `%`**, et
  Hyperdrive sort par les plages de Cloudflare — donc `%`, avec ce que ça
  suppose de mot de passe solide ;
- la configuration Hyperdrive se crée dans le tableau de bord, et donne un
  identifiant à poser dans `wrangler.jsonc`.

Ensuite seulement `lib/bdd.ts` prendra sa connexion depuis la liaison plutôt
que de `DATABASE_URI`.

**Le déménagement des fichiers existants.** Le coffre sait écrire dans R2, mais
personne n'y a encore versé ce qui dort dans `medias/`. À faire le jour du
basculement, pas avant.

## Le cache

Sans réglage, chaque visite recalculerait la page : le Worker interrogerait la
base, rendrait le HTML, et recommencerait au visiteur suivant. Les pages
portent déjà `revalidate = 300` — encore faut-il dire à Cloudflare **où**
garder ce qui a été calculé.

| pièce | où | à quoi ça sert |
|---|---|---|
| `incrementalCache` | R2, seau `kevin-machy-cache` | garde les pages déjà rendues |
| `tagCache` | D1, `kevin-machy-etiquettes` | **c'est ce qui fait marcher « Publier »** |
| `queue` | `direct` | refait une page périmée dans la foulée |

Le registre d'étiquettes mérite un mot. Quand Kevin publie, l'éditeur appelle
`revalidatePath`. Pour savoir quelles pages en cache cela concerne, il faut
avoir noté ce que chacune contient — c'est ce registre. Sans lui, le bouton
Publier resterait sans effet visible pendant cinq minutes.

Pour la file, `direct` suffit : l'autre voie passe par des objets durables,
utiles quand les régénérations se bousculent, ce qui suppose un trafic que ce
site n'aura pas. Une pièce de moins à entretenir.

Trois ressources à créer avant le premier déploiement :

```bash
npx wrangler r2 bucket create kevin-machy-medias
npx wrangler r2 bucket create kevin-machy-cache
npx wrangler d1 create kevin-machy-etiquettes    # recopier l'identifiant rendu
```

Le `database_id` de D1 est un **emplacement à remplir** dans `wrangler.jsonc` :
il n'existe qu'une fois la base créée.

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
