-- Mesure d'audience.
--
-- Écrite ici plutôt que confiée à un outil extérieur : les données restent dans
-- la même base et la même sauvegarde que le reste, et il n'y a pas un second
-- service à maintenir sur le serveur.
--
-- AUCUN COOKIE, AUCUNE ADRESSE IP ENREGISTRÉE. Un visiteur est reconnu dans la
-- journée par une empreinte calculée à la volée, qui change chaque nuit : elle
-- ne permet ni de le suivre d'un jour à l'autre, ni de remonter à son adresse.
-- C'est ce qui dispense le site de bandeau de consentement.

CREATE TABLE visites (
  id        BIGSERIAL PRIMARY KEY,
  jour      DATE        NOT NULL,
  chemin    TEXT        NOT NULL,
  -- Empreinte du jour. Ni identifiant, ni adresse : impossible à inverser.
  visiteur  TEXT        NOT NULL,
  -- Domaine du référent, ou 'direct'. Jamais l'adresse complète : elle peut
  -- contenir la recherche tapée par le visiteur.
  source    TEXT        NOT NULL DEFAULT 'direct',
  appareil  TEXT        NOT NULL DEFAULT 'ordinateur'
            CHECK (appareil IN ('mobile', 'ordinateur')),
  vu_le     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX visites_jour ON visites (jour DESC);
CREATE INDEX visites_chemin ON visites (jour DESC, chemin);

-- Les gestes qui comptent : réserver, appeler, envoyer le formulaire.
-- Sans eux, on sait combien de gens passent, pas combien agissent.
CREATE TABLE evenements (
  id       BIGSERIAL PRIMARY KEY,
  jour     DATE        NOT NULL,
  nom      TEXT        NOT NULL,
  chemin   TEXT,
  visiteur TEXT        NOT NULL,
  cree_le  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX evenements_jour ON evenements (jour DESC, nom);
