-- Les pages légales se lisent serrées.
--
-- Le rythme large du site sert des pages où l'image respire. Une page légale
-- est un document de référence : on y cherche un fait, et l'espacement normal
-- imposait quatre écrans de défilement pour six paragraphes.
--
-- Seules les pages système sont touchées, et seulement leur espacement : le
-- fond, les textes et l'ordre des sections restent ce qu'ils sont. Kevin peut
-- revenir au rythme large section par section depuis l'éditeur.

UPDATE pages
   SET sections = (
         SELECT jsonb_agg(
                  jsonb_set(section, '{valeurs,reglages,espacement}', '"serre"'::jsonb, true)
                  ORDER BY ordre
                )
           FROM jsonb_array_elements(sections) WITH ORDINALITY AS t(section, ordre)
       ),
       modifie_le = now()
 WHERE systeme = true
   AND jsonb_array_length(sections) > 0;
