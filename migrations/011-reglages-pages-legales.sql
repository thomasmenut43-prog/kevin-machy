-- Le rythme vertical des pages légales.
--
-- Les sections de ces trois pages ont été écrites en SQL, sans passer par
-- l'éditeur : elles n'ont donc pas reçu les réglages que celui-ci pose à
-- l'ajout d'une section — fond et espacement. Résultat, elles s'affichaient
-- collées les unes aux autres, et le titre de la première passait sous
-- l'en-tête du site.
--
-- On les leur donne ici. Les autres pages ne sont pas touchées : une section
-- qui a déjà ses réglages les garde.

UPDATE pages
   SET sections = (
         SELECT jsonb_agg(
                  CASE
                    WHEN section -> 'valeurs' ? 'reglages' THEN section
                    ELSE jsonb_set(
                           section,
                           '{valeurs,reglages}',
                           '{"fond": "noir", "espacement": "normal"}'::jsonb,
                           true
                         )
                  END
                  ORDER BY ordre
                )
           FROM jsonb_array_elements(sections) WITH ORDINALITY AS t(section, ordre)
       ),
       modifie_le = now()
 WHERE systeme = true
   AND jsonb_array_length(sections) > 0;
