-- L'image de partage d'une page.
--
-- Celle qui s'affiche quand un lien est collé dans Messenger, WhatsApp ou
-- LinkedIn. Les pages écrites en code la déclaraient dans leur `metadata` ;
-- une page de la base a besoin d'un endroit où la ranger.
--
-- Un chemin de fichier plutôt qu'un renvoi à la médiathèque : les visuels de
-- partage sont des recadrages 1200 × 630 faits pour ça, et ils n'ont rien à
-- faire dans la bibliothèque de photographies du site.

ALTER TABLE pages ADD COLUMN meta_image text;
