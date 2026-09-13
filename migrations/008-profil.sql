-- Le profil : prénom, nom, photo.
--
-- Le compte ne portait qu'un `nom`, saisi une fois à la création et jamais
-- modifiable. Kevin doit pouvoir corriger son identité sans passer par moi, et
-- la voir affichée dans son BackOffice plutôt qu'une initiale dans un rond.

ALTER TABLE utilisateurs
  ADD COLUMN prenom TEXT NOT NULL DEFAULT '',
  -- Le nom du fichier dans `medias/`, sans son extension ni sa largeur : la
  -- même convention que la médiathèque, servie par la même route.
  ADD COLUMN avatar TEXT;

-- Découpe l'existant au premier espace : « Thomas Menut » devient prénom
-- « Thomas » et nom « Menut ». Un compte en un seul mot garde ce mot en
-- prénom, parce que c'est par le prénom que le BackOffice s'adresse à lui.
UPDATE utilisateurs
   SET prenom = split_part(nom, ' ', 1),
       nom = CASE
               WHEN position(' ' IN nom) > 0 THEN substr(nom, position(' ' IN nom) + 1)
               ELSE ''
             END;
