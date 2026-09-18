-- Les trois pages légales.
--
-- Elles vivaient sur l'ancien domaine : le pied de page y renvoyait par des
-- liens qui seraient morts le jour où dronezvous.com s'arrête. Ce sont
-- désormais des pages du site comme les autres — modifiables dans l'éditeur,
-- présentes au plan du site — à une réserve près : `systeme` à vrai, donc ni
-- supprimables ni renommables. Le pied de page pointe dessus et la loi les
-- exige ; une suppression par mégarde ne laisserait rien pour prévenir.
--
-- Leur contenu est un texte d'attente, écrit à partir de ce que le site fait
-- réellement. Il dit vrai, mais il n'a pas valeur d'avis juridique : les
-- conditions de vente, surtout, demandent une relecture par un conseil.
--
-- `INSERT IGNORE` : une base déjà peuplée — celle reprise de PostgreSQL —
-- garde ses pages, qui sont les mêmes.

INSERT IGNORE INTO pages
  (chemin, titre, statut, sections, meta_description, systeme, publie_le)
VALUES (
  'mentions-legales',
  'Mentions légales',
  'publie',
  '[{"cle":"ml-1","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Ces informations sont publiées en application de la loi du 21 juin 2004 pour la confiance dans l’économie numérique. Elles disent qui édite ce site, qui l’héberge, et à qui s’adresser."}]}]},"entete":{"texte":"Mentions légales","niveau":"h1"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"ml-2","type":"identiteEntreprise","valeurs":{"entete":{"texte":"Qui édite ce site","niveau":"h2"},"reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"ml-3","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Toutes les photographies présentées sur ce site sont protégées par le droit d’auteur. Elles ne peuvent être reproduites, téléchargées, modifiées ni diffusées, sur quelque support que ce soit, sans autorisation écrite."}]},{"type":"paragraphe","fragments":[{"texte":"Les clients disposant d’une galerie reçoivent, avec leurs images, les usages qui leur sont accordés. Toute autre utilisation — commerciale, publicitaire, ou par un tiers — demande un accord préalable."}]}]},"entete":{"texte":"Les photographies","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"ml-4","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Ce site renvoie vers des services extérieurs : la prise de rendez-vous, la galerie de remise des photographies, les réseaux sociaux. Leur contenu et leurs pratiques ne dépendent pas de l’éditeur de ce site."}]}]},"entete":{"texte":"Liens vers d’autres sites","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"ml-5","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Pour toute remarque sur le contenu de ce site, ou pour demander le retrait d’une image, écrivez à l’adresse indiquée plus haut. Une réponse est apportée dans les meilleurs délais."}]}]},"entete":{"texte":"Signaler un contenu","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}}]',
  'Qui édite ce site, qui l’héberge, et ce que deviennent les photographies qui y sont publiées.',
  1,
  CURRENT_TIMESTAMP(3)
);

INSERT IGNORE INTO pages
  (chemin, titre, statut, sections, meta_description, systeme, publie_le)
VALUES (
  'politique-de-confidentialite',
  'Politique de confidentialité',
  'publie',
  '[{"cle":"pc-1","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Ce site collecte le strict nécessaire, et rien d’autre. Aucun cookie n’y est déposé, aucun traceur publicitaire n’y est installé, et aucune donnée n’est revendue ni transmise à des tiers à des fins commerciales."}]}]},"entete":{"texte":"Politique de confidentialité","niveau":"h1"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"pc-2","type":"identiteEntreprise","valeurs":{"entete":{"texte":"Responsable du traitement","niveau":"h2"},"reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"pc-3","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Quand vous remplissez le formulaire de contact, les informations que vous y écrivez — nom, adresse e-mail, téléphone si vous le donnez, nature et date du projet, message — sont enregistrées pour une seule raison : vous répondre."}]},{"type":"paragraphe","fragments":[{"texte":"Elles sont conservées trois ans après notre dernier échange, puis effacées. Elles ne sont lues que par le photographe, et par personne d’autre."}]}]},"entete":{"texte":"Le formulaire de contact","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"pc-4","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Le nombre de visites est mesuré par le site lui-même, sans service extérieur. Aucune adresse IP n’est enregistrée : elle sert seulement, le temps du calcul, à produire une empreinte qui change chaque nuit et ne permet pas de remonter à une personne."}]},{"type":"paragraphe","fragments":[{"texte":"C’est ce qui dispense ce site de bandeau de consentement : il n’y a ni cookie à accepter, ni profil à refuser."}]}]},"entete":{"texte":"La mesure d’audience","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"pc-5","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Vous pouvez demander à consulter les informations vous concernant, les faire corriger, ou les faire effacer. Une demande par e-mail à l’adresse indiquée plus haut suffit, et la réponse intervient sous un mois."}]},{"type":"paragraphe","fragments":[{"texte":"Si la réponse ne vous convient pas, vous pouvez saisir la Commission nationale de l’informatique et des libertés (CNIL), 3 place de Fontenoy, 75007 Paris."}]}]},"entete":{"texte":"Vos droits","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}}]',
  'Ce que ce site enregistre, pourquoi, combien de temps — et pourquoi il n’a pas de bandeau cookies.',
  1,
  CURRENT_TIMESTAMP(3)
);

INSERT IGNORE INTO pages
  (chemin, titre, statut, sections, meta_description, systeme, publie_le)
VALUES (
  'conditions-generales-de-vente',
  'Conditions générales de vente',
  'publie',
  '[{"cle":"cgv-1","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Ces conditions régissent les prestations photographiques commandées auprès du studio. Elles sont acceptées au moment de la réservation."}]}]},"entete":{"texte":"Conditions générales de vente","niveau":"h1"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-2","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Chaque prestation fait l’objet d’un devis ou d’une formule affichée sur ce site, précisant sa durée, son contenu et son tarif. Le devis accepté vaut commande."}]}]},"entete":{"texte":"Les prestations","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-3","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"La date n’est retenue qu’à la réception de l’acompte. Le solde est réglé selon les modalités indiquées au devis."}]}]},"entete":{"texte":"Réservation et règlement","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-4","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Toute annulation se signale par écrit. Les conditions de remboursement de l’acompte et les possibilités de report figurent au devis."}]},{"type":"paragraphe","fragments":[{"texte":"En cas d’empêchement du photographe, la prestation est reportée à une date convenue ensemble ou intégralement remboursée."}]}]},"entete":{"texte":"Annulation et report","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-5","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Les images retenues et retouchées sont remises par galerie en ligne, dans le délai annoncé au devis. Le tri et la retouche relèvent du travail du photographe ; les fichiers bruts ne sont pas livrés."}]}]},"entete":{"texte":"Livraison des photographies","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-6","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Le client dispose des images pour son usage privé. Toute diffusion commerciale demande un accord écrit."}]},{"type":"paragraphe","fragments":[{"texte":"Le photographe conserve ses droits d’auteur sur les images. Leur utilisation à des fins de promotion — site, réseaux, expositions — n’a lieu qu’avec l’accord du client, qui peut le refuser ou le retirer à tout moment."}]}]},"entete":{"texte":"Droit à l’image et usages","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-7","type":"texteLibre","valeurs":{"texte":{"contenu":[{"type":"paragraphe","fragments":[{"texte":"Toute réclamation se formule d’abord par e-mail. À défaut d’accord, le client peut saisir gratuitement le médiateur de la consommation dont les coordonnées figurent dans les mentions légales, avant toute action judiciaire."}]}]},"entete":{"texte":"Réclamation et médiation","niveau":"h2"},"largeur":"mesure","reglages":{"fond":"noir","espacement":"serre"}}},{"cle":"cgv-8","type":"identiteEntreprise","valeurs":{"entete":{"texte":"Le studio","niveau":"h2"},"reglages":{"fond":"noir","espacement":"serre"}}}]',
  'Les conditions des prestations photographiques : réservation, livraison, usages des images.',
  1,
  CURRENT_TIMESTAMP(3)
);
