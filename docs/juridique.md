# Les pages juridiques

Trois pages, reprises intégralement de l'ancien site en octobre 2026 :

| Page | Contenu | Volume |
| --- | --- | --- |
| `/mentions-legales/` | 9 rubriques | ~700 mots |
| `/politique-de-confidentialite/` | 18 rubriques | ~1 700 mots |
| `/conditions-generales-de-vente/` | 27 articles et une annexe | ~9 500 mots |

Avant cette reprise, le site n'en portait que des résumés d'une page, écrits
comme texte d'attente. Ils disaient vrai mais ne couvraient rien : ni
l'annulation d'un mariage, ni les iris d'animaux, ni les photographies de
mineurs, ni les fichiers RAW, ni le délai de rétractation. Les mentions légales
ne portaient ni SIRET, ni hébergeur, ni médiateur de la consommation — trois
mentions que la loi impose.

## Comment elles sont fabriquées

Deux scripts, séparés exprès.

```bash
node scripts/convertir-juridique.mjs   # HTML de l'ancien site → contenu/juridique.json
npm run juridique                      # contenu/juridique.json → base
npm run juridique -- --verifier        # dit ce qui manque, sans rien écrire
```

Le premier est **local et à usage unique** : il lit `.cache/ancien/*.part.html`,
qui n'est pas versionné. Ce qu'il produit l'est — `contenu/juridique.json` se
relit, se compare d'une version à l'autre, et c'est lui seul qui part en base.

Ce découpage a deux conséquences, et c'est pour elles qu'il existe : la
conversion ne touche jamais la base, et ce qui sera publié a été relu sous sa
forme définitive. Modifier un texte juridique sans pouvoir le relire avant
publication serait la pire façon de s'y prendre.

Le second tourne aussi depuis **Actions → Corrections de contenu**, où le mot de
passe de la base existe en secret — il n'existe en clair nulle part. Cocher la
case « Appliquer » pose les pages **et remet le site en ligne** : écrire en base
ne suffit pas, les pages sont figées à la construction.

## Ce qui a changé par rapport à l'ancien site

Toutes les corrections sont dans `CORRECTIONS` et `PLAN`, en tête de
`scripts/convertir-juridique.mjs`, chacune avec sa raison. En résumé :

| Point | Avant | Après |
| --- | --- | --- |
| Siège social | 13 place du Coudert, 43130 Solignac-sous-Roche | 7 avenue Charles Dupuy, 43000 Le Puy-en-Velay |
| Hébergeur | IONOS | Cloudflare pour les pages, Hostinger pour les photos et la base |
| Site internet | dronezvous.com | kevinmachy.fr |
| Cookies | un bandeau de consentement et 108 cookies | aucun cookie, rubrique réécrite |
| SIRET | gras coupé avant le dernier chiffre | `904 158 284 00029` |
| Lien courriel | `mailto:contact@` sous un texte `kevin@` | `mailto:kevin@` |
| Nom | « Kevin MACHY » | « Kevin Machy », comme partout ailleurs sur le site |

**`kevin@dronezvous.com` n'est pas corrigée.** Le domaine s'éteint comme adresse
de site ; la boîte reste chez Hostinger et reste celle de Kevin.

### Les deux rubriques réécrites

L'ancien site annonçait des cookies, une mesure d'audience tierce et un outil de
gestion du consentement. Ce site n'a aucun des trois : la fréquentation est
mesurée côté serveur, sans cookie et sans conserver d'adresse IP — voir
`lib/audience.ts`. Reprendre ces paragraphes aurait publié une déclaration
fausse, ce qui est exactement ce qu'une politique de confidentialité ne doit pas
faire.

Les deux rubriques concernées — « Cookies » dans les mentions, « 17 — Cookies et
traceurs » dans la politique — décrivent donc ce que le site fait réellement.

### La page de cookies n'est pas reprise

L'ancien site portait `/politique-de-cookies-ue/`, qui décrivait cent huit
cookies. Ce site n'en dépose aucun. La page n'a pas d'équivalent, et
`lib/redirections.ts` l'envoie vers la politique de confidentialité.

### La fiche d'identité remplace deux rubriques

La section « Identité de l'entreprise » du catalogue affiche éditeur, SIRET,
adresse, téléphone, courriel, directeur de la publication et hébergeur — en
lisant les **Paramètres**. Deux rubriques de l'ancien site disaient exactement
cela : « Éditeur du site » et « 1 — Responsable du traitement ». Elles ne sont
pas reprises comme texte ; la fiche les porte, et Kevin corrige un numéro de
téléphone sans toucher à une ligne de document juridique.

`npm run juridique` remplit au passage les champs des Paramètres qui étaient
vides — raison sociale, SIRET, hébergeur, médiateur. **Un champ déjà rempli
n'est jamais remplacé** : le script comble les trous, il ne corrige pas ce qui a
été saisi à la main.

## Deux garde-fous

- Une page dont **un brouillon est en cours** est laissée tranquille : un
  brouillon veut dire que quelqu'un écrit dedans en ce moment. Le script le dit
  et sort en erreur.
- Le script est **idempotent** : relancé, il ne touche que ce qui diffère.

## Ce qui reste à vérifier avec Kevin

1. **Le médiateur de la consommation.** M. Dominique Coulon, relevé sur l'ancien
   site. Ces adhésions sont annuelles : vérifier qu'elle court toujours. La
   mention est obligatoire pour qui vend à des particuliers.
2. **Les hébergeurs.** Cloudflare est vérifié dans ses propres conditions
   d'utilisation, Hostinger dans son Impressum allemand — une mention
   obligatoire, donc tenue à jour. À relire si l'un des deux change.
3. **Les activités citées.** Les CGV couvrent le photobooth, le drone, la
   formation et la vente de tirages, que le site ne présente pas encore. C'est
   voulu : Kevin les vend toujours. Voir `SANS_EQUIVALENT` dans
   `lib/redirections.ts`.
4. **La date de dernière mise à jour** passe à octobre 2026, puisque le document
   change. Elle est posée par `CORRECTIONS` ; à remonter à chaque révision.

Ces textes viennent de l'ancien site et n'ont pas été rédigés ici. Les reprendre
ne vaut pas relecture juridique.
