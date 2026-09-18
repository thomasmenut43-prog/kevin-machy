-- Le socle, en MySQL.
--
-- La base était PostgreSQL et s'est construite en douze migrations. Elle passe
-- à MySQL parce que l'hébergement du client — un mutualisé Hostinger — ne
-- propose que cela. Le moteur change, donc la lignée repart de zéro : rejouer
-- douze pas d'un dialecte dans un autre n'aurait décrit qu'une histoire, pas un
-- schéma. Celle-ci est dans l'historique git, jusqu'au passage à MySQL.
--
-- Ce fichier est donc l'état d'arrivée des douze, traduit. Ce que la traduction
-- a coûté est noté au fil des tables ; l'essentiel :
--
--   * pas d'index partiel en MySQL — la contrainte d'unicité des dossiers passe
--     par une colonne calculée ;
--   * pas de type « horodatage avec fuseau » — tout est en temps universel,
--     imposé par le pilote (`timezone: 'Z'` dans lib/bdd.ts) ;
--   * une clé ne peut pas porter sur du TEXT sans longueur : les colonnes
--     indexées deviennent des VARCHAR dimensionnés.

-- ————————————————————————————— Les comptes —————————————————————————————
--
-- Kevin ne se connecte qu'ici : ni GitHub, ni service tiers. Tout ce qui touche
-- à son identité vit donc dans ces deux tables, sur son serveur.

CREATE TABLE utilisateurs (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  prenom        VARCHAR(80)  NOT NULL DEFAULT '',
  nom           VARCHAR(80)  NOT NULL,
  -- L'adresse sert d'identifiant : on la stocke en minuscules et on compare en
  -- minuscules. La collation `_ci` de MySQL l'aurait fait seule, mais s'en
  -- remettre à elle rendrait le code dépendant d'un réglage de serveur.
  email         VARCHAR(191) NOT NULL UNIQUE,
  -- Jamais le mot de passe : son empreinte scrypt, et le sel qui la rend unique.
  empreinte     VARCHAR(255) NOT NULL,
  sel           VARCHAR(64)  NOT NULL,
  -- Le fichier de la photo de profil dans `medias/`, sans extension ni largeur.
  avatar        VARCHAR(64)  NULL,
  role          ENUM('administrateur', 'editeur') NOT NULL DEFAULT 'editeur',
  -- Freine l'essai de mots de passe en rafale.
  essais_rates  INT UNSIGNED NOT NULL DEFAULT 0,
  bloque_jusqua DATETIME(3)  NULL,
  cree_le       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  modifie_le    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Une session par connexion. La révoquer revient à supprimer la ligne, ce qu'un
-- jeton signé autoportant ne permettrait pas. La table garde l'empreinte du
-- jeton, jamais le jeton : un vol de sauvegarde ne donne aucune session.
CREATE TABLE sessions (
  empreinte_jeton VARCHAR(64)  NOT NULL PRIMARY KEY,
  utilisateur_id  INT UNSIGNED NOT NULL,
  expire_le       DATETIME(3)  NOT NULL,
  cree_le         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  vue_le          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  agent           VARCHAR(255) NULL,
  CONSTRAINT sessions_utilisateur FOREIGN KEY (utilisateur_id)
    REFERENCES utilisateurs (id) ON DELETE CASCADE,
  INDEX sessions_expiration (expire_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ——————————————————————————— La médiathèque ———————————————————————————

CREATE TABLE dossiers_medias (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nom        VARCHAR(191) NOT NULL,
  parent_id  INT UNSIGNED NULL,
  -- PostgreSQL tenait l'unicité par deux index partiels : un pour les dossiers
  -- rangés, un pour ceux de la racine. MySQL n'a pas d'index partiel, et ses
  -- index uniques laissent passer autant de NULL qu'on veut — deux dossiers
  -- « Mariages » à la racine seraient donc acceptés. Cette colonne calculée
  -- remplace le NULL par 0 et rend la contrainte exprimable.
  parent_cle INT UNSIGNED GENERATED ALWAYS AS (IFNULL(parent_id, 0)) STORED,
  cree_le    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Pas de `ON DELETE SET NULL` ici, et ce n'est pas un choix : MySQL l'interdit
  -- sur une colonne dont dépend une colonne calculée — `parent_cle`, juste
  -- au-dessus. La suppression d'un dossier détache donc son contenu depuis le
  -- code (voir `supprimerDossier`), ce qui a l'avantage de rendre le geste
  -- lisible au lieu de le laisser à une règle invisible du schéma.
  CONSTRAINT dossiers_parent FOREIGN KEY (parent_id)
    REFERENCES dossiers_medias (id),
  UNIQUE KEY dossiers_nom_par_parent (nom, parent_cle)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Les fichiers envoyés depuis le BackOffice. Le disque garde les octets, cette
-- table garde tout le reste.
CREATE TABLE medias (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  fichier     VARCHAR(191) NOT NULL UNIQUE,
  -- Obligatoire dès l'envoi : sans lui, ni référencement ni accessibilité.
  alt         VARCHAR(500) NOT NULL,
  legende     TEXT         NULL,
  type_mime   VARCHAR(80)  NOT NULL,
  largeur     INT UNSIGNED NULL,
  hauteur     INT UNSIGNED NULL,
  octets      INT UNSIGNED NOT NULL,
  -- Les largeurs dérivées produites à l'envoi : [{largeur, fichier}, …]
  tailles     JSON         NOT NULL,
  -- Vrai pour les images de démonstration, qui doivent toutes disparaître
  -- avant la mise en ligne.
  a_remplacer TINYINT(1)   NOT NULL DEFAULT 0,
  dossier_id  INT UNSIGNED NULL,
  cree_le     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT medias_dossier FOREIGN KEY (dossier_id)
    REFERENCES dossiers_medias (id) ON DELETE SET NULL,
  INDEX medias_recents (cree_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ————————————————————————————— Les pages —————————————————————————————
--
-- Les sections sont stockées en JSON, pas éclatées en quarante tables. Le choix
-- est délibéré : une page se lit toujours entière et jamais « par section ». Il
-- n'y a donc rien à gagner à la découper, et beaucoup à perdre — une migration
-- par champ ajouté, des jointures partout, et un schéma qui suit le catalogue
-- au lieu de le précéder.

CREATE TABLE pages (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  -- Sans barre oblique au début ni à la fin. L'accueil a le chemin vide.
  chemin           VARCHAR(191) NOT NULL UNIQUE,
  titre            VARCHAR(191) NOT NULL,
  statut           ENUM('brouillon', 'publie') NOT NULL DEFAULT 'brouillon',
  -- Ce que voient les visiteurs. Ne change qu'à l'enregistrement.
  sections         JSON         NOT NULL,
  -- Ce que Kevin est en train de modifier. Lui seul le voit.
  brouillon        JSON         NULL,
  meta_titre       VARCHAR(191) NULL,
  meta_description VARCHAR(500) NULL,
  meta_image       VARCHAR(255) NULL,
  hors_indexation  TINYINT(1)   NOT NULL DEFAULT 0,
  -- Une page que la loi ou le pied de page exigent : ni supprimable, ni
  -- renommable. Voir lib/pages.ts.
  systeme          TINYINT(1)   NOT NULL DEFAULT 0,
  cree_le          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  modifie_le       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  publie_le        DATETIME(3)  NULL,
  INDEX pages_statut (statut)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- L'historique : une version par publication, pour revenir en arrière.
CREATE TABLE versions (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  page_id   INT UNSIGNED NOT NULL,
  titre     VARCHAR(191) NOT NULL,
  sections  JSON         NOT NULL,
  auteur_id INT UNSIGNED NULL,
  cree_le   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT versions_page FOREIGN KEY (page_id)
    REFERENCES pages (id) ON DELETE CASCADE,
  CONSTRAINT versions_auteur FOREIGN KEY (auteur_id)
    REFERENCES utilisateurs (id) ON DELETE SET NULL,
  INDEX versions_recentes (page_id, cree_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ———————————————————————————— Les réglages ————————————————————————————
--
-- En clé/valeur. Une table par famille de réglages vieillirait mal : chaque
-- nouveau besoin demanderait une migration. Ici, une clé, un objet JSON, et la
-- forme est décrite dans le code — là où elle se lit et se valide.

CREATE TABLE reglages (
  cle        VARCHAR(64) NOT NULL PRIMARY KEY,
  valeur     JSON        NOT NULL,
  modifie_le DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ———————————————————————————— Les messages ————————————————————————————
--
-- Ils sont enregistrés avant d'être envoyés par e-mail, et c'est l'ordre qui
-- compte : si le serveur SMTP est en panne, la demande est quand même là quand
-- Kevin ouvre son BackOffice. L'inverse perdrait des clients sans que personne
-- le sache.

CREATE TABLE messages (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nom          VARCHAR(191) NOT NULL,
  email        VARCHAR(191) NOT NULL,
  telephone    VARCHAR(40)  NULL,
  projet       VARCHAR(80)  NULL,
  date_projet  VARCHAR(40)  NULL,
  message      TEXT         NOT NULL,
  -- Trace du consentement donné au moment de l'envoi.
  consentement TINYINT(1)   NOT NULL DEFAULT 0,
  lu           TINYINT(1)   NOT NULL DEFAULT 0,
  -- Trois états d'acheminement, pour savoir si la notification est partie.
  envoi        ENUM('en_attente', 'envoye', 'echec') NOT NULL DEFAULT 'en_attente',
  envoi_detail TEXT         NULL,
  cree_le      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- PostgreSQL avait un index partiel sur les non-lus. MySQL n'en a pas : cet
  -- index composé rend le même service au volume d'un site vitrine.
  INDEX messages_recents (cree_le),
  INDEX messages_non_lus (lu, cree_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- ———————————————————————————— L'audience ————————————————————————————
--
-- Mesurée ici, sans service extérieur, sans cookie et sans adresse IP
-- enregistrée : le visiteur est reconnu dans la journée par une empreinte qui
-- change chaque nuit. C'est ce qui dispense le site de bandeau de consentement.

CREATE TABLE visites (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  jour     DATE         NOT NULL,
  chemin   VARCHAR(191) NOT NULL,
  visiteur VARCHAR(64)  NOT NULL,
  source   VARCHAR(191) NOT NULL DEFAULT 'direct',
  appareil ENUM('mobile', 'ordinateur') NOT NULL DEFAULT 'ordinateur',
  vu_le    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX visites_jour (jour),
  INDEX visites_chemin (jour, chemin)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE evenements (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  jour     DATE         NOT NULL,
  nom      VARCHAR(80)  NOT NULL,
  chemin   VARCHAR(191) NULL,
  visiteur VARCHAR(64)  NOT NULL,
  cree_le  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX evenements_jour (jour, nom)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
