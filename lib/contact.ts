import 'server-only';
import { enregistrerDemande } from './messages';
import type { EtatContact } from './guichets';

/**
 * Réception du formulaire de contact.
 *
 * C'est la seule porte ouverte du site : n'importe qui sur Internet peut
 * l'appeler. D'où trois protections, dans cet ordre :
 *
 * 1. un champ piège, invisible pour un visiteur, que les robots remplissent ;
 * 2. un délai minimal entre l'affichage et l'envoi, qu'aucun humain ne bat ;
 * 3. une limite par adresse IP.
 *
 * Aucune n'est infaillible seule. Ensemble elles arrêtent l'essentiel sans
 * imposer de test au visiteur, ce qui compte sur un site où chaque demande est
 * un client potentiel.
 *
 * Cette logique vivait dans une action serveur. Elle est ici parce qu'une
 * action serveur n'existe pas dans une vitrine figée : sous cette forme, elle
 * sert aussi bien la route Node que le jour où un autre guichet l'appellera.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DELAI_MINIMAL = 3000;
const PAR_HEURE = 5;

// Compteur en mémoire : suffisant pour un seul serveur, et remis à zéro à
// chaque redémarrage. Le jour où le site tournera sur plusieurs machines, il
// faudra le déplacer en base.
const envois = new Map<string, number[]>();

function tropDEnvois(ip: string) {
  const maintenant = Date.now();
  const recents = (envois.get(ip) ?? []).filter((t) => maintenant - t < 3_600_000);
  envois.set(ip, recents);

  if (recents.length >= PAR_HEURE) return true;
  recents.push(maintenant);
  return false;
}

/** Ce que le navigateur envoie. Tout est traité comme du texte non fiable. */
export type Demande = Record<string, unknown>;

const texte = (v: unknown) => String(v ?? '').trim();

/**
 * Le code HTTP accompagne la réponse : il dit à qui écoute — un journal, une
 * sonde — si l'échec vient du visiteur, d'un excès, ou du serveur.
 */
export async function traiterDemande(
  brut: Demande,
  ip: string,
): Promise<{ etat: EtatContact; code: number }> {
  const nom = texte(brut.nom);
  const email = texte(brut.email);
  const message = texte(brut.message);

  // 1. Champ piège. Un visiteur ne le voit pas, donc ne le remplit jamais.
  //    On répond comme si tout allait bien : un robot n'apprend rien.
  if (texte(brut.site)) return { etat: { ok: true }, code: 200 };

  // 2. Formulaire rempli trop vite pour être humain.
  const ouvertA = Number(brut.ouvertA ?? 0);
  if (ouvertA && Date.now() - ouvertA < DELAI_MINIMAL) return { etat: { ok: true }, code: 200 };

  const refus = (erreur: string, code = 400) => ({ etat: { erreur }, code });

  if (!nom) return refus('Indiquez votre nom.');
  if (!EMAIL.test(email)) return refus('Cette adresse e-mail ne semble pas valide.');
  if (message.length < 10) return refus('Écrivez quelques mots de plus.');
  if (brut.consentement !== 'on' && brut.consentement !== true) {
    return refus('Merci de cocher la case de consentement.');
  }

  // 3. Limite par adresse. L'IP sert au comptage seulement, elle n'est jamais
  //    enregistrée avec le message.
  if (tropDEnvois(ip)) {
    return refus(
      'Plusieurs messages viennent de partir depuis ici. Réessayez dans un moment.',
      429,
    );
  }

  try {
    await enregistrerDemande({
      nom,
      email,
      telephone: texte(brut.telephone),
      projet: texte(brut.projet),
      dateProjet: texte(brut.date),
      message,
      consentement: true,
    });
  } catch {
    return refus('L’enregistrement a échoué. Réessayez, ou écrivez-moi directement.', 500);
  }

  return { etat: { ok: true }, code: 200 };
}
