-- Comptes du BackOffice et sessions.
--
-- Kevin ne se connecte qu'ici : ni GitHub, ni service tiers. Tout ce qui touche
-- à son identité vit donc dans ces deux tables, sur son serveur.

CREATE TABLE utilisateurs (
  id            SERIAL PRIMARY KEY,
  nom           TEXT        NOT NULL,
  -- Citext serait plus simple, mais demande une extension. On stocke en
  -- minuscules et on compare en minuscules : même résultat, zéro dépendance.
  email         TEXT        NOT NULL UNIQUE,
  -- Jamais le mot de passe : son empreinte, et le sel qui la rend unique.
  empreinte     TEXT        NOT NULL,
  sel           TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'editeur'
                CHECK (role IN ('administrateur', 'editeur')),
  -- Freine l'essai de mots de passe en rafale.
  essais_rates  INTEGER     NOT NULL DEFAULT 0,
  bloque_jusqua TIMESTAMPTZ,
  cree_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Une session par connexion. Se révoquer revient à supprimer la ligne, ce qu'un
-- jeton signé autoportant ne permettrait pas.
CREATE TABLE sessions (
  -- L'empreinte du jeton, pas le jeton : un vol de sauvegarde ne donne alors
  -- aucune session utilisable.
  empreinte_jeton TEXT        PRIMARY KEY,
  utilisateur_id  INTEGER     NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  expire_le       TIMESTAMPTZ NOT NULL,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  vue_le          TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent           TEXT
);

CREATE INDEX sessions_utilisateur ON sessions (utilisateur_id);
CREATE INDEX sessions_expiration ON sessions (expire_le);
