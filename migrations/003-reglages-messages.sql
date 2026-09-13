-- Réglages du site et messages reçus.

/*
 * Réglages, en clé/valeur.
 *
 * Une table par famille de réglages vieillirait mal : chaque nouveau besoin
 * demanderait une migration. Ici, une clé, un objet JSON, et la forme est
 * décrite dans le code — là où elle se lit et se valide.
 */
CREATE TABLE reglages (
  cle        TEXT        PRIMARY KEY,
  valeur     JSONB       NOT NULL,
  modifie_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

/*
 * Messages du formulaire de contact.
 *
 * Ils sont enregistrés avant d'être envoyés par e-mail, et c'est l'ordre qui
 * compte : si le serveur SMTP de Kevin est en panne, la demande est quand même
 * là quand il ouvre son BackOffice. L'inverse perdrait des clients sans que
 * personne le sache.
 */
CREATE TABLE messages (
  id           SERIAL PRIMARY KEY,
  nom          TEXT        NOT NULL,
  email        TEXT        NOT NULL,
  telephone    TEXT,
  projet       TEXT,
  date_projet  TEXT,
  message      TEXT        NOT NULL,
  -- Trace du consentement donné au moment de l'envoi.
  consentement BOOLEAN     NOT NULL DEFAULT false,
  lu           BOOLEAN     NOT NULL DEFAULT false,
  -- Trois états d'acheminement, pour savoir si la notification est partie.
  envoi        TEXT        NOT NULL DEFAULT 'en_attente'
               CHECK (envoi IN ('en_attente', 'envoye', 'echec')),
  envoi_detail TEXT,
  cree_le      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_recents ON messages (cree_le DESC);
CREATE INDEX messages_non_lus ON messages (lu) WHERE lu = false;
