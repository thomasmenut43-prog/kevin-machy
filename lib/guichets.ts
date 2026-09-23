/**
 * Les deux guichets du site, vus depuis le navigateur.
 *
 * Le formulaire de contact et la mesure d'audience sont les seuls endroits où
 * une page publique parle à un serveur. Partout ailleurs, elle se suffit à
 * elle-même.
 *
 * Quand l'application tourne sur un serveur, ces guichets sont les siens et les
 * chemins restent relatifs. Quand la vitrine est figée en fichiers statiques,
 * il n'y a plus personne derrière : `NEXT_PUBLIC_GUICHETS` porte alors
 * l'adresse de celui qui répond à sa place.
 *
 * Ce fichier n'importe rien du serveur — il part dans le navigateur.
 */

const BASE = (process.env.NEXT_PUBLIC_GUICHETS ?? '').replace(/\/+$/, '');

export const URL_CONTACT = `${BASE}/api/contact`;
export const URL_MESURE = `${BASE}/api/mesure`;

/**
 * Ce que le guichet de contact renvoie au formulaire.
 *
 * Il n'y a pas de quoi réafficher la saisie : l'envoi se fait depuis le
 * navigateur, la page ne se recharge pas, et les champs gardent d'eux-mêmes ce
 * que le visiteur a écrit.
 */
export type EtatContact = { ok?: true; erreur?: string };
