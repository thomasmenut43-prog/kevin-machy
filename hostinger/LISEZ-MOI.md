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

**Fait.** `medias.dronezvous.com`, racine
`/home/u750876317/domains/dronezvous.com/public_html/medias`.

C'est cette racine qui explique le chemin du jeton, deux crans plus haut : un
seul cran tomberait dans `public_html`, que le site principal sert.

### 2. Le jeton

**Fait.** Vérifié depuis l'extérieur : `dronezvous.com/jeton-medias.txt`
répond **404**, il est hors d'atteinte.

Le guichet n'ouvre qu'à qui présente un secret. Il le lit **un cran au-dessus
de la racine web** — posé à côté des images, il serait téléchargeable par
n'importe qui.

Tirer un secret au hasard, puis le déposer dans le fichier
`jeton-medias.txt`, placé dans le dossier **parent** de la racine du
sous-domaine.

Si ce fichier manque, le guichet refuse tout et répond « non configuré ». C'est
voulu : une porte d'entrée sans serrure ne s'ouvre pas, elle reste fermée.

### 3. Le guichet

**Fait.** `guichet-medias.php` est à la racine du sous-domaine, à côté des
images. Il exige **PHP 8.1 ou plus** (à régler dans *Avancé → Configuration PHP* si
besoin).

Le nom des images étant contraint à vingt-quatre caractères hexadécimaux
suivis de `.webp`, aucune requête ne peut viser le guichet lui-même ni sortir
du dossier.

### 4. Le secret, côté Cloudflare

**Fait.**

```bash
npx wrangler secret put JETON_MEDIAS
```

Il ne passe jamais par le dépôt, contrairement aux autres réglages qui vivent
dans `wrangler.jsonc`.

### 5. Les images déjà là

**Fait.** Les dix-sept fichiers de `medias/` ont été déposés par le guichet
lui-même et vérifiés un à un : tous servis, tous identiques à l'octet près.

Pour recommencer un jour, la boucle tient en une ligne — noter le `base64`,
sans lequel la moitié repartirait en `403` :

```bash
for F in medias/*.webp; do
  N=$(basename "$F")
  base64 -w0 "$F" | curl -s -X POST     -H "X-Jeton: $JETON" -H "Content-Type: text/plain" --data-binary @-     "https://medias.dronezvous.com/guichet-medias.php?action=poser&nom=$N"
done
```

### 6. Le jour du basculement DNS

Quand les serveurs de noms passeront chez Cloudflare, il faudra y recréer
`medias` en enregistrement `A` vers l'adresse de Hostinger — `145.14.156.225`.

Le **nuage orange** est ici souhaitable, contrairement aux enregistrements de
courrier : il met les photographies dans le cache de Cloudflare, gratuitement,
et sans consommer la moindre requête de Worker.

## Le pare-feu de l'hébergeur, et pourquoi le corps part en base64

Constaté sur place, et suffisamment déroutant pour mériter d'être écrit.

Un pare-feu applicatif inspecte les corps de requête. Il refuse **certaines
suites d'octets**, sans rapport avec la taille : sur dix-sept images, six
passaient et onze repartaient en `403`, toujours les mêmes, alors qu'un avatar
de 2 226 octets échouait là où une image de 2 744 passait.

La démonstration, en trois requêtes :

| corps envoyé | réponse |
|---|---|
| 10 000 octets de `AAAA…` | **400** — atteint PHP, refusé comme non-WebP |
| le même WebP, brut | **403** — bloqué avant PHP |
| le même WebP, **en base64** | **400** — atteint PHP |

D'où l'encodage. Il coûte un tiers de poids en plus, contre un envoi qui
aboutit à tous les coups plutôt qu'au hasard du contenu.

## Le CDN garde les 404

Un `Server: hcdn` se tient devant le sous-domaine. Demander une image **avant**
de l'avoir déposée fait mémoriser le 404, qui survit quelques minutes au dépôt.

Sans conséquence en usage réel — une image nouvelle porte un nom que personne
n'a jamais demandé. Mais en mise au point, c'est un piège : on croit l'envoi
raté alors que le fichier est bien là. Un paramètre quelconque dans l'adresse
(`?v=123`) contourne le cache et tranche la question.

## Ce que le guichet sait faire

Trois gestes, et **il ne sait pas lire** — les images sont servies par Apache,
il n'a donc aucune raison de renvoyer quoi que ce soit. C'est autant de
surface en moins.

```
POST ?action=poser&nom=<nom>     corps = les octets, en base64
POST ?action=effacer&nom=<nom>
POST ?action=copier&de=<nom>&vers=<nom>
```

Chacun exige l'en-tête `X-Jeton`.

Ce qu'il refuse, et qui a été éprouvé : l'absence de jeton, un jeton faux, un
`GET`, un nom remontant d'un dossier, un nom visant le guichet lui-même, un
corps qui n'est pas du WebP, et une action inconnue.
