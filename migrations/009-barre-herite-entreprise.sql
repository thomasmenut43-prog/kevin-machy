-- La barre de navigation hérite des coordonnées de l'entreprise.
--
-- Le téléphone et le lien « Accès clients » de l'en-tête avaient été recopiés
-- depuis les constantes du code au premier enregistrement de la barre. Ils
-- étaient donc figés : changer le numéro dans Paramètres → Mon entreprise
-- laissait l'en-tête afficher l'ancien, sans que rien ne le signale.
--
-- On vide ces deux champs lorsqu'ils valent exactement la constante d'origine,
-- c'est-à-dire lorsque personne ne les a jamais saisis. Vides, ils prennent
-- désormais la valeur de l'entreprise à chaque lecture. Un numéro réellement
-- choisi par Kevin, lui, est laissé intact.

UPDATE reglages
   SET valeur = jsonb_set(valeur, '{telephone}', '""'::jsonb),
       modifie_le = now()
 WHERE cle = 'navigation'
   AND valeur->>'telephone' = '07 81 74 32 84';

UPDATE reglages
   SET valeur = jsonb_set(valeur, '{accesLien}', '""'::jsonb),
       modifie_le = now()
 WHERE cle = 'navigation'
   AND valeur->>'accesLien' = 'https://kevinmachy.pic-time.com/client';
