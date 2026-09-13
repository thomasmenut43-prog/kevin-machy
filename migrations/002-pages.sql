-- Pages, versions et médiathèque.

-- Les fichiers envoyés depuis le BackOffice. Le disque garde les octets, cette
-- table garde tout le reste.
CREATE TABLE medias (
  id           SERIAL PRIMARY KEY,
  fichier      TEXT        NOT NULL UNIQUE,
  -- Obligatoire dès l'envoi : sans lui, ni référencement ni accessibilité.
  alt          TEXT        NOT NULL,
  legende      TEXT,
  type_mime    TEXT        NOT NULL,
  largeur      INTEGER,
  hauteur      INTEGER,
  octets       INTEGER     NOT NULL,
  -- Les largeurs dérivées produites à l'envoi : [{largeur, fichier}, …]
  tailles      JSONB       NOT NULL DEFAULT '[]',
  -- Vrai pour les images de démonstration, qui doivent toutes disparaître
  -- avant la mise en ligne.
  a_remplacer  BOOLEAN     NOT NULL DEFAULT false,
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

/*
 * Les sections sont stockées en JSONB, pas éclatées en quarante tables.
 *
 * Le choix est délibéré. Une page se lit toujours entière et ne se lit jamais
 * « par section » : il n'y a donc rien à gagner à la découper, et beaucoup à
 * perdre — une migration par champ ajouté, des jointures partout, et un schéma
 * qui suit le catalogue au lieu de le précéder. Le prix à payer est de ne pas
 * pouvoir interroger l'intérieur d'une section en SQL, ce dont un site vitrine
 * n'a pas l'usage.
 */
CREATE TABLE pages (
  id               SERIAL PRIMARY KEY,
  -- Sans barre oblique au début ni à la fin. La page d'accueil créée depuis
  -- l'éditeur n'existe pas : celle du site est écrite en code.
  chemin           TEXT        NOT NULL UNIQUE,
  titre            TEXT        NOT NULL,
  statut           TEXT        NOT NULL DEFAULT 'brouillon'
                   CHECK (statut IN ('brouillon', 'publie')),
  -- Ce que voient les visiteurs. Ne change qu'à l'enregistrement.
  sections         JSONB       NOT NULL DEFAULT '[]',
  -- Ce que Kevin est en train de modifier. Lui seul le voit.
  brouillon        JSONB,
  meta_titre       TEXT,
  meta_description TEXT,
  hors_indexation  BOOLEAN     NOT NULL DEFAULT false,
  cree_le          TIMESTAMPTZ NOT NULL DEFAULT now(),
  modifie_le       TIMESTAMPTZ NOT NULL DEFAULT now(),
  publie_le        TIMESTAMPTZ
);

CREATE INDEX pages_statut ON pages (statut);

-- Une ligne par publication. C'est ce qui permet de revenir en arrière quand
-- une modification s'avère être une erreur.
CREATE TABLE versions (
  id         SERIAL PRIMARY KEY,
  page_id    INTEGER     NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  titre      TEXT        NOT NULL,
  sections   JSONB       NOT NULL,
  auteur_id  INTEGER     REFERENCES utilisateurs(id) ON DELETE SET NULL,
  cree_le    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX versions_page ON versions (page_id, cree_le DESC);
