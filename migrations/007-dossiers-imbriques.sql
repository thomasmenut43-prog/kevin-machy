-- Des dossiers dans des dossiers.
--
-- Le niveau unique suffisait pour ranger ; il ne suffit plus pour déplacer,
-- puisqu'un dossier n'avait nulle part où aller. Un parent, et « déplacer »
-- veut enfin dire quelque chose.
--
-- SET NULL et non CASCADE : supprimer un dossier ne doit jamais emporter ce
-- qu'il contenait. Ses sous-dossiers remontent à la racine, ses images
-- retournent au fonds commun, et rien n'est perdu par un clic.

ALTER TABLE dossiers_medias
  ADD COLUMN parent_id INTEGER REFERENCES dossiers_medias(id) ON DELETE SET NULL;

CREATE INDEX dossiers_parent ON dossiers_medias (parent_id);

-- Le nom n'est unique que dans son dossier : « Préparatifs » peut exister
-- dans deux mariages différents, et c'est exactement ce qu'on attend.
ALTER TABLE dossiers_medias DROP CONSTRAINT dossiers_medias_nom_key;

CREATE UNIQUE INDEX dossiers_nom_par_parent
  ON dossiers_medias (parent_id, nom)
  WHERE parent_id IS NOT NULL;

CREATE UNIQUE INDEX dossiers_nom_racine
  ON dossiers_medias (nom)
  WHERE parent_id IS NULL;
