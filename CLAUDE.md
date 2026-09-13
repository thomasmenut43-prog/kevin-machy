@AGENTS.md

# Conventions du projet

## Branche et pull request — jamais de push direct sur `main`

Tout lot de travail passe par une branche et une pull request que Thomas relit et fusionne.

```bash
git switch -c <type>/<sujet-court>   # feat/, fix/, chore/, docs/
# … travail, un ou plusieurs commits …
git push -u origin <branche>
gh pr create --fill
```

`main` n'est modifiée que par une fusion de PR. Ne jamais committer directement dessus, même
pour un correctif d'une ligne — c'est la règle qui a manqué au début du projet.

Messages de commit et titres de PR **en français**, à l'impératif, avec un corps qui explique
le *pourquoi* et pas seulement le *quoi*.

## Aucun chiffre inventé

Ce site présente les tarifs d'un professionnel. **Aucun prix, durée, délai, récompense,
témoignage ou statistique ne doit apparaître s'il ne provient pas d'une source vérifiée :**
`contenu-source.md` (relevé du site actuel) ou la page de réservation SumUp.

Toutes les données factuelles vivent dans `lib/site.ts`. Un tarif ne se modifie qu'à cet
endroit. En cas de besoin éditorial non couvert, laisser un emplacement nommé et le signaler —
ne jamais combler avec une valeur plausible.

Corollaire pour le simulateur d'iris : si `IRIS_GRILLE.parIris` est vide, la page retombe sur
« À partir de 49 € » et masque les compteurs. Rien n'est interpolé.

## Aucune image générique

Les photographies actuelles sont des images de substitution Pexels, en attendant la sélection
de Kevin — voir `assets.md` et `CREDITS-IMAGES.md`. Un emplacement sans source affiche un cadre
nommé, jamais un visuel de banque d'images choisi au hasard pour boucher un trou.

## Dépôt public

`PROPOSITION-PHASE-2.md`, `PRD-v2.md` et les devis contiennent le chiffrage, les marges et le
cadrage client : ils restent dans `.gitignore` tant que le dépôt est public. Même vigilance pour
tout document commercial à venir — et pour les secrets, qui n'y entrent jamais.

## Vérifier avant d'annoncer

Avant de dire qu'une chose fonctionne :

```bash
npm run build              # le site se construit, base de données requise
node scripts/audit.mjs     # 60 contrôles, serveur de dev requis
```

Pour un changement visible à l'écran, produire une capture (`node scripts/shots.mjs`) plutôt que
d'affirmer que le rendu est correct.
