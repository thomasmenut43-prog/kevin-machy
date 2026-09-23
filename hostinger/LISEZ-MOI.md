# Ce qui reste chez Hostinger

L'application tourne sur Cloudflare. Trois choses ne bougent pas d'ici :

| | |
|---|---|
| La boîte mail | `kevin@dronezvous.com` |
| La base de données | `u750876317_kevinmachy`, jointe par Hyperdrive |
| **Les photographies** | et c'est ce dossier qui s'en occupe |

## Pourquoi les images restent ici

Cent gigaoctets déjà payés, contre dix offerts chez Cloudflare — et ces dix-là
exigent une carte bancaire sur le compte, même sans rien dépenser.

Mais l'argument qui emporte n'est pas celui-là. **Les images ne passent plus
par le Worker du tout.** Cloudflare compte chaque requête, et n'en offre que
cent mille par jour : une page de vingt photographies en vaudrait vingt-et-une.
Servies ici, elles n'en coûtent aucune, et Apache rend un fichier figé mieux
qu'un Worker ne le relaierait.

## Mise en place

### 1. Le sous-domaine

Dans hPanel, *Sites web → dronezvous.com → Sous-domaines*, créer
`medias.dronezvous.com`.

Noter le répertoire qu'il donne : c'est là que vivront les images.

### 2. Le jeton

Le guichet n'ouvre qu'à qui présente un secret. Il le lit **un cran au-dessus
de la racine web** — posé à côté des images, il serait téléchargeable par
n'importe qui.

Tirer un secret au hasard, puis le déposer dans le fichier
`jeton-medias.txt`, placé dans le dossier **parent** de la racine du
sous-domaine.

Si ce fichier manque, le guichet refuse tout et répond « non configuré ». C'est
voulu : une porte d'entrée sans serrure ne s'ouvre pas, elle reste fermée.

### 3. Le guichet

Déposer `guichet-medias.php` à la racine du sous-domaine, à côté des images.
Il exige **PHP 8.1 ou plus** (à régler dans *Avancé → Configuration PHP* si
besoin).

Le nom des images étant contraint à vingt-quatre caractères hexadécimaux
suivis de `.webp`, aucune requête ne peut viser le guichet lui-même ni sortir
du dossier.

### 4. Le secret, côté Cloudflare

```bash
npx wrangler secret put JETON_MEDIAS
```

Il ne passe jamais par le dépôt, contrairement aux autres réglages qui vivent
dans `wrangler.jsonc`.

### 5. Les images déjà là

Celles qui dorment dans `medias/` ne se déplacent pas toutes seules. Les
téléverser dans la racine du sous-domaine, par le gestionnaire de fichiers de
hPanel ou par FTP.

### 6. Le jour du basculement DNS

Quand les serveurs de noms passeront chez Cloudflare, il faudra y recréer
`medias` en enregistrement `A` vers l'adresse de Hostinger — `145.14.156.225`.

Le **nuage orange** est ici souhaitable, contrairement aux enregistrements de
courrier : il met les photographies dans le cache de Cloudflare, gratuitement,
et sans consommer la moindre requête de Worker.

## Ce que le guichet sait faire

Trois gestes, et **il ne sait pas lire** — les images sont servies par Apache,
il n'a donc aucune raison de renvoyer quoi que ce soit. C'est autant de
surface en moins.

```
POST ?action=poser&nom=<nom>     corps = les octets
POST ?action=effacer&nom=<nom>
POST ?action=copier&de=<nom>&vers=<nom>
```

Chacun exige l'en-tête `X-Jeton`.

Ce qu'il refuse, et qui a été éprouvé : l'absence de jeton, un jeton faux, un
`GET`, un nom remontant d'un dossier, un nom visant le guichet lui-même, un
corps qui n'est pas du WebP, et une action inconnue.
