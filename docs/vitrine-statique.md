# La vitrine en fichiers statiques

Le site public peut être bâti en HTML figé, sans serveur derrière. Le
BackOffice, lui, ne le peut pas : il lui faut une base, une session et des
écritures. Les deux vivent dans la même application, et c'est cette
cohabitation que ce document explique.

```bash
npm run exporter     # le résultat atterrit dans out/
```

## À quoi ça sert

À faire tenir la vitrine sur un hébergement qui ne sait servir que des
fichiers. L'abonnement mutualisé du client en fait partie : il refuse les
applications Node, mais sert du HTML sans broncher.

Trois bénéfices qui valent indépendamment de l'hébergement retenu :

- un visiteur ne touche plus la base — la page qu'il reçoit est un fichier ;
- une panne du BackOffice ne fait plus tomber le site ;
- il n'y a plus rien à redémarrer, à surveiller, ni à mettre à jour.

## Ce que le script fait, et pourquoi

`output: 'export'` refuse de construire si **une seule** route du projet lui
résiste. Le BackOffice en compte dix. `scripts/exporter.mjs` les écarte donc le
temps de la construction :

| écarté | pourquoi |
|---|---|
| `app/(backoffice)/` | éditeur, médiathèque, réglages, aperçu — tout exige un serveur |
| `app/api/` | les guichets répondent en `POST` |
| `app/medias/` | sert des fichiers depuis le disque |

Elles sont **déplacées, jamais copiées ni modifiées**, et remises par un
`finally` même si la construction échoue. Une interruption brutale les laisse
dans `.export-retire/`, d'où l'exécution suivante les récupère au démarrage.

Une ligne est aussi retouchée : `dynamicParams`. Next veut un booléen écrit en
toutes lettres, donc pas de condition possible — le fichier est mis à l'abri,
modifié, puis remis à l'identique. Si la ligne attendue a changé, le script
s'arrête plutôt que de produire une vitrine fausse en silence.

## Deux pièges rencontrés, et leur remède

**Les types engendrés par `next dev`.** `tsconfig.json` ramasse
`.next/dev/types/`, qui décrit encore le BackOffice. Laissés là, ils font
échouer la vérification sur des routes qu'on vient d'écarter — pour une raison
étrangère au code. Le script les efface ; ils se régénèrent seuls.

**Les charges de navigation.** Suivre un lien du menu ne recharge pas la page :
Next va chercher `…/__next.X.Y.__PAGE__.txt`. Mais l'export les pose en
`…/__next.X/Y/__PAGE__.txt` — mêmes segments, séparateur différent. Sans
doublage, chaque préchargement répond 404 et la navigation retombe sur un
rechargement complet. Le script écrit les deux formes.

## Ce qui change pour le visiteur

**Le formulaire de contact part depuis le navigateur**, plus par une action
serveur : une vitrine figée n'en a pas. La logique — champ piège, délai
minimal, limite par adresse — n'a pas bougé, elle vit dans `lib/contact.ts` et
sert aussi bien la route Node. `lib/guichets.ts` dit à qui parler.

Le prix est réel et assumé : **sans JavaScript, le formulaire ne part plus.**
Un repli affiche alors l'adresse et le téléphone en clair.

Publier cesse aussi d'être immédiat. `revalidate = 300` faisait apparaître une
modification toute seule en cinq minutes ; en statique, « Enregistrer » doit
déclencher une reconstruction. Et `dynamicParams` passant à `false`, une page
nouvelle n'existe qu'après elle.

## Ce qui reste à faire

**Les guichets n'existent pas encore ailleurs.** `NEXT_PUBLIC_GUICHETS` doit
désigner une adresse qui répond à `/api/contact` et `/api/mesure`. Laissée
vide, la vitrine parle à elle-même et n'obtient rien.

**Les images de la médiathèque ne sont pas exportées.** Les pages actuelles
n'en réclament aucune — leurs visuels viennent de `public/img/`, pré-encodés —
mais dès que Kevin enverra les siennes, il faudra les sortir avec le reste.

**Rien ne déploie encore.** `out/` est produit, pas envoyé.
