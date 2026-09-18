# La base : de PostgreSQL à MySQL

Le site s'est construit sur PostgreSQL. Il tourne aujourd'hui sur MySQL, parce
que l'hébergement du client — un mutualisé Hostinger — ne propose que cela. Le
choix vient de l'hébergeur, pas d'un avis technique : PostgreSQL faisait mieux
plusieurs des choses décrites ici.

Ce document dit ce que le déménagement a changé, pour qu'on ne redécouvre pas
chaque écueil en le heurtant.

## Ce qui a bougé dans le schéma

**Les horodatages n'ont plus de fuseau.** MySQL ne connaît pas `TIMESTAMPTZ` :
les colonnes sont des `DATETIME(3)`, et la discipline est tenue de deux côtés —
le serveur tourne en temps universel (`--default-time-zone=+00:00`) et le pilote
aussi (`timezone: 'Z'` dans `lib/bdd.ts`). Retirer l'un des deux ferait expirer
les sessions à la mauvaise heure, sans rien casser de visible.

**Les clés ne portent pas sur du texte libre.** Une colonne indexée doit être un
`VARCHAR` dimensionné : `chemin`, `email`, `fichier`, `cle` ont donc une
longueur. 191 caractères là où l'index est unique — la limite historique de
MySQL pour l'`utf8mb4`.

**Il n'y a pas d'index partiel.** PostgreSQL tenait l'unicité des noms de
dossiers par deux index conditionnels. MySQL laisse passer autant de `NULL`
qu'on veut dans un index unique : deux dossiers « Mariages » à la racine
auraient été acceptés. Une colonne calculée `parent_cle` remplace le `NULL` par
zéro, et l'unicité redevient exprimable.

**Une clé étrangère ne peut pas remettre à `NULL` une colonne dont dépend une
colonne calculée.** Conséquence directe du point précédent : supprimer un
dossier ne détache plus ses enfants tout seul. `supprimerDossier` le fait en
trois écritures dans une transaction. C'est plus verbeux, et plus lisible.

**Les booléens sont des entiers.** `TINYINT(1)` rend `0` ou `1`, jamais `true`.
Les fonctions qui transforment une ligne en objet — `versPage`, `versMedia` —
appliquent `Boolean()`. Oublier cette conversion donne un `0` qui passe pour
vrai dans une condition JavaScript.

## Ce qui a bougé dans les requêtes

| PostgreSQL | MySQL |
|---|---|
| `$1`, `$2` | `?`, dans l'ordre d'apparition |
| `RETURNING …` | `ecrire()` rend `insertId`, puis on relit |
| `ON CONFLICT … DO UPDATE` | `ON DUPLICATE KEY UPDATE` |
| `count(*) FILTER (WHERE …)` | `SUM(CASE WHEN … THEN 1 ELSE 0 END)` |
| `id = ANY($1::int[])` | autant de `?` que de valeurs |
| `generate_series(…)` | la suite des jours est construite en JavaScript |
| `23505` | `ER_DUP_ENTRY` — voir `estDoublon()` |

**Les paramètres ne sont plus nommés.** C'est le piège le plus silencieux du
lot : PostgreSQL permettait d'écrire `WHERE id = $1` en fin de requête avec
`$1` en tête des valeurs. Avec des `?`, l'ordre des valeurs doit suivre l'ordre
de la requête. Une inversion ne fait pas d'erreur — elle écrit la mauvaise
ligne.

**`DELETE` ne peut pas lire la table qu'il efface.** La purge de l'historique
des versions enveloppe donc sa sous-requête dans une table dérivée. MySQL
refuse aussi `LIMIT` dans un `IN` : la même enveloppe règle les deux.

**`LIMIT` n'est pas paramétré.** La valeur est forcée en nombre et écrite dans
la requête. C'est la seule concaténation du code, et elle ne laisse aucune prise
à l'injection puisqu'elle ne peut être qu'un entier.

## Ce que MySQL ne rejoue pas

**Une migration de structure ne s'annule pas.** PostgreSQL enveloppait chaque
migration dans une transaction ; MySQL valide d'office chaque création de table.
Une migration qui échoue à mi-parcours laisse la base à moitié modifiée, et il
faut la reprendre à la main. `scripts/migrer.mjs` le dit quand ça arrive.

## La lignée des migrations

Elle repart de zéro : `001-socle.sql` est l'état d'arrivée des douze migrations
PostgreSQL, traduit d'un bloc, et `002-pages-legales.sql` réinstalle les trois
pages que la loi exige. Rejouer douze pas d'un dialecte dans un autre aurait
raconté une histoire, pas décrit un schéma. L'histoire, elle, est dans
l'historique git — jusqu'au commit qui porte ce fichier.

## Déménager les données

Le contenu est passé par un export JSON table par table, puis un import dans
MySQL. Un piège s'y cache et mérite d'être noté : les pages légales étant posées
par la migration, elles occupaient déjà les premiers identifiants, et deux pages
importées portant ces mêmes numéros ont d'abord été rejetées en silence comme
doublons. **Importer d'abord, semer ensuite** — ou vérifier les comptes après
coup, ce qui a permis de s'en apercevoir.

Pour un prochain déménagement de MySQL à MySQL — le jour où la base part chez
l'hébergeur — rien de tout cela n'est nécessaire :

```bash
docker exec kevin-machy-base mysqldump -ukevin -pkevin kevinmachy > kevinmachy.sql
mysql -h <hôte> -u <utilisateur> -p <base> < kevinmachy.sql
```
