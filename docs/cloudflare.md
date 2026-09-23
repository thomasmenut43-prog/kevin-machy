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

## Ce qui reste, dans l'ordre

**1. Les fichiers.** `lib/medias.ts` écrit encore sur le disque
(`node:fs/promises`), et `app/medias/[fichier]/route.ts` les relit de même. Ça
**compile** sous `nodejs_compat` mais échouerait à l'exécution : un Worker n'a
pas de disque. Il faut R2. C'est le prochain chantier, et le plus gros.

**2. La base.** Elle reste chez Hostinger, jointe par Hyperdrive. Deux
préalables que le code ne peut pas résoudre :

- l'accès distant de Hostinger n'accepte qu'**une adresse ou `%`**, et
  Hyperdrive sort par les plages de Cloudflare — donc `%`, avec ce que ça
  suppose de mot de passe solide ;
- la configuration Hyperdrive se crée dans le tableau de bord, et donne un
  identifiant à poser dans `wrangler.jsonc`.

Ensuite seulement `lib/bdd.ts` prendra sa connexion depuis la liaison plutôt
que de `DATABASE_URI`.

**3. Le cache.** `open-next.config.ts` est nu. Le cache incrémental sur R2 et
la référence au Worker lui-même restent à brancher, sans quoi chaque page se
recalcule à chaque visite.

## Un détail d'atelier

**La construction pour Workers ne passe pas sous Windows** sans le mode
développeur : OpenNext crée des liens symboliques, que Windows refuse aux
comptes ordinaires. *Paramètres → Confidentialité et sécurité → Espace
développeurs*, ou construire en intégration continue, sous Linux — ce qui sera
de toute façon le cas en production.
