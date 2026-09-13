'use server';

import { headers } from 'next/headers';
import { enregistrerDemande } from '@/lib/messages';

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
 */

export type EtatContact = { ok?: true; erreur?: string; saisi?: Record<string, string> };

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

export async function actionContact(
  _precedent: EtatContact,
  donnees: FormData,
): Promise<EtatContact> {
  const nom = String(donnees.get('nom') ?? '').trim();
  const email = String(donnees.get('email') ?? '').trim();
  const message = String(donnees.get('message') ?? '').trim();
  const saisi = {
    nom,
    email,
    message,
    telephone: String(donnees.get('telephone') ?? ''),
    projet: String(donnees.get('projet') ?? ''),
    date: String(donnees.get('date') ?? ''),
  };

  // 1. Champ piège. Un visiteur ne le voit pas, donc ne le remplit jamais.
  if (String(donnees.get('site') ?? '')) return { ok: true };

  // 2. Formulaire rempli trop vite pour être humain.
  const ouvertA = Number(donnees.get('ouvertA') ?? 0);
  if (ouvertA && Date.now() - ouvertA < DELAI_MINIMAL) return { ok: true };

  if (!nom) return { erreur: 'Indiquez votre nom.', saisi };
  if (!EMAIL.test(email)) return { erreur: 'Cette adresse e-mail ne semble pas valide.', saisi };
  if (message.length < 10) return { erreur: 'Écrivez quelques mots de plus.', saisi };
  if (donnees.get('consentement') !== 'on') {
    return { erreur: 'Merci de cocher la case de consentement.', saisi };
  }

  // 3. Limite par adresse. L'IP sert au comptage seulement, elle n'est pas
  // enregistrée avec le message.
  const entetes = await headers();
  const ip = (entetes.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue';
  if (tropDEnvois(ip)) {
    return {
      erreur: 'Plusieurs messages viennent de partir depuis ici. Réessayez dans un moment.',
      saisi,
    };
  }

  try {
    await enregistrerDemande({
      nom,
      email,
      telephone: saisi.telephone,
      projet: saisi.projet,
      dateProjet: saisi.date,
      message,
      consentement: true,
    });
  } catch {
    return {
      erreur: 'L’enregistrement a échoué. Réessayez, ou écrivez-moi directement.',
      saisi,
    };
  }

  return { ok: true };
}
