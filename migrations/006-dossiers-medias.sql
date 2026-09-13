-- Des dossiers dans la médiathèque.
--
-- Kevin photographie plusieurs mariages par an : sans rangement, la
-- bibliothèque devient une seule planche de plusieurs centaines de vignettes
-- où plus rien ne se retrouve.
--
-- Un seul niveau, volontairement. Une arborescence demanderait un explorateur
-- de fichiers, et l'on n'a pas besoin d'un explorateur pour ranger des photos
-- par chantier.

CREATE TABLE dossiers_medias (
  id      SERIAL PRIMARY KEY,
  nom     TEXT        NOT NULL UNIQUE,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une image sans dossier reste visible dans « Toutes les images » : supprimer
-- un dossier ne doit jamais supprimer ce qu'il contenait.
ALTER TABLE medias
  ADD COLUMN dossier_id INTEGER REFERENCES dossiers_medias(id) ON DELETE SET NULL;

CREATE INDEX medias_dossier ON medias (dossier_id);
