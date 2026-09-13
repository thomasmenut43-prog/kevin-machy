'use server';

import { revalidatePath } from 'next/cache';
import { utilisateurConnecte } from '@/lib/auth';
import { listerUtilisateurs, utilisateurConnecte as qui } from '@/lib/auth';
import { lireEntreprise, majEntreprise, type Entreprise } from '@/lib/entreprise';
import {
  choisirPaiement,
  connecterGoogle,
  deconnecterGoogle,
  lireIntegrations,
} from '@/lib/integrations';
import { ecrireSmtp, effacerMotDePasseSmtp, envoyer, lireSmtp, lireSmtpAffichable } from '@/lib/courrier';

/** Les réglages d'envoi touchent tout le site : réservés aux administrateurs. */
async function exigerAdministrateur() {
  const utilisateur = await utilisateurConnecte();
  if (utilisateur?.role !== 'administrateur') throw new Error('Non autorisé.');
  return utilisateur;
}

export type EtatReglages = { erreur?: string; succes?: string };

export type CompteAffichable = Omit<
  Awaited<ReturnType<typeof listerUtilisateurs>>[number],
  'creeLe' | 'derniereConnexion'
> & { creeLe: string; derniereConnexion: string | null };

/** Ce que chacun peut changer sur lui-même. Jamais le mot de passe : il ne se relit pas. */
export type MonProfil = {
  prenom: string;
  nom: string;
  email: string;
  avatar: string | null;
};

export type Parametres = {
  smtp: Awaited<ReturnType<typeof lireSmtpAffichable>> | null;
  sessions: number;
  administrateur: boolean;
  moiId: number;
  moi: MonProfil;
  comptes: CompteAffichable[];
};

/**
 * Tout ce que la fenêtre des paramètres affiche, en un seul aller-retour.
 *
 * Lu à l'ouverture plutôt qu'au chargement de chaque écran du BackOffice :
 * une fenêtre qu'on n'ouvre pas ne doit rien coûter.
 */
export async function actionParametres(): Promise<Parametres> {
  const moi = await qui();
  if (!moi) throw new Error('Non autorisé.');

  const administrateur = moi.role === 'administrateur';
  const comptes = await listerUtilisateurs();

  return {
    // Le mot de passe d'envoi ne sort jamais de la base, même vers un
    // administrateur : seule l'information « il est enregistré » remonte.
    smtp: administrateur ? await lireSmtpAffichable() : null,
    sessions: comptes.find((c) => c.id === moi.id)?.sessions ?? 1,
    administrateur,
    moiId: moi.id,
    moi: { prenom: moi.prenom, nom: moi.nom, email: moi.email, avatar: moi.avatar },
    // Les dates traversent la frontière serveur/client : en chaîne, sinon
    // elles arrivent en objets que React refuse de sérialiser.
    comptes: comptes.map((c) => ({
      ...c,
      creeLe: c.creeLe.toISOString(),
      derniereConnexion: c.derniereConnexion?.toISOString() ?? null,
    })),
  };
}

export async function actionEnregistrerSmtp(
  _p: EtatReglages,
  donnees: FormData,
): Promise<EtatReglages> {
  await exigerAdministrateur();

  const serveur = String(donnees.get('serveur') ?? '').trim();
  const port = Number(donnees.get('port') ?? 0);
  const expediteurEmail = String(donnees.get('expediteurEmail') ?? '').trim();

  if (serveur && !port) return { erreur: 'Indiquez le port du serveur.' };
  if (port && (port < 1 || port > 65535)) return { erreur: 'Ce port n’existe pas.' };
  if (expediteurEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(expediteurEmail)) {
    return { erreur: 'L’adresse d’expédition ne semble pas valide.' };
  }

  await ecrireSmtp({
    serveur,
    port: port || 465,
    chiffrement: (String(donnees.get('chiffrement') ?? 'tls') as 'tls' | 'starttls' | 'aucun'),
    identifiant: String(donnees.get('identifiant') ?? '').trim(),
    // Un champ laissé vide veut dire « ne change rien », pas « efface » : le
    // formulaire ne peut pas réafficher le mot de passe enregistré.
    motDePasse: String(donnees.get('motDePasse') ?? ''),
    expediteurNom: String(donnees.get('expediteurNom') ?? '').trim(),
    expediteurEmail,
    reponseEmail: String(donnees.get('reponseEmail') ?? '').trim(),
    destinataire: String(donnees.get('destinataire') ?? '').trim(),
    accuseActif: donnees.get('accuseActif') === 'on',
    accuseObjet: String(donnees.get('accuseObjet') ?? '').trim(),
    accuseTexte: String(donnees.get('accuseTexte') ?? ''),
  });

  revalidatePath('/admin/reglages');
  return { succes: 'Réglages enregistrés.' };
}

/**
 * L'essai grandeur nature.
 *
 * Une configuration SMTP ne se vérifie pas en la relisant : il faut envoyer.
 * Le message d'erreur du serveur est remonté tel quel, parce que c'est lui qui
 * dit quoi corriger.
 */
export async function actionTesterSmtp(destination: string) {
  await exigerAdministrateur();

  const r = await lireSmtp();
  const a = destination.trim() || r.destinataire || r.expediteurEmail;
  if (!a) return { erreur: 'Indiquez une adresse où envoyer le test.' };

  const resultat = await envoyer({
    a,
    objet: 'Test d’envoi — site Kevin Machy',
    texte:
      'Si vous lisez ceci, la configuration e-mail du site fonctionne.\n\n' +
      'Les demandes du formulaire de contact arriveront à cette adresse.',
  });

  return resultat.ok
    ? { succes: `Message envoyé à ${a}. Vérifiez la réception, y compris les indésirables.` }
    : { erreur: resultat.message };
}

export async function actionEffacerMotDePasse() {
  await exigerAdministrateur();
  await effacerMotDePasseSmtp();
  revalidatePath('/admin/reglages');
}


// ————————————————————————— Intégrations —————————————————————————

export async function actionIntegrations() {
  await exigerAdministrateur();
  return lireIntegrations();
}

export async function actionConnecterGoogle(placeId: string, cle: string) {
  await exigerAdministrateur();
  const r = await connecterGoogle(placeId, cle);
  revalidatePath('/admin');
  return r;
}

export async function actionDeconnecterGoogle() {
  await exigerAdministrateur();
  await deconnecterGoogle();
  revalidatePath('/admin');
  return {};
}

export async function actionChoisirPaiement(paiement: 'stripe' | 'sumup' | null) {
  await exigerAdministrateur();
  await choisirPaiement(paiement);
  revalidatePath('/admin');
  return {};
}

// ———————————————————————————— Mon entreprise ————————————————————————————

/**
 * Les informations de l'entreprise.
 *
 * Elles s'affichent sur le site public — pied de page, coordonnées, horaires —
 * et engagent Kevin : c'est un réglage d'administrateur, pas de rédacteur.
 */
export async function actionEntreprise(): Promise<Entreprise> {
  await exigerAdministrateur();
  return lireEntreprise();
}

export async function actionEnregistrerEntreprise(
  _p: EtatReglages,
  donnees: FormData,
): Promise<EtatReglages> {
  await exigerAdministrateur();

  const texte = (nom: string) => String(donnees.get(nom) ?? '').trim();

  const nom = texte('nom');
  if (!nom) return { erreur: 'Le nom de l’entreprise est obligatoire.' };

  const email = texte('email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { erreur: 'Cette adresse e-mail ne semble pas valide.' };
  }

  // Les liens sont vérifiés ici plutôt qu'à l'affichage : une adresse fautive
  // enregistrée se remarquerait le jour où un visiteur clique dessus.
  const lien = (cle: string) => {
    const valeur = texte(cle);
    if (!valeur) return { valeur: '' };
    // Une page du site s'écrit « /mentions-legales/ » : les mentions légales et
    // les CGV vivent ici depuis qu'elles ont quitté l'ancien domaine, et exiger
    // une adresse complète obligerait à y écrire le nom de domaine du jour.
    if (valeur.startsWith('/')) return { valeur };
    try {
      const url = new URL(valeur);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocole');
      return { valeur: url.toString() };
    } catch {
      return { erreur: `Adresse invalide : ${valeur}` };
    }
  };

  const clesLiens = [
    'accesClients',
    'reservation',
    'instagram',
    'facebook',
    'linkedin',
    'youtube',
    'avis',
    'mentions',
    'cgv',
    'cookies',
  ] as const;

  const liens = {} as Entreprise['liens'];
  for (const cle of clesLiens) {
    const r = lien(`lien_${cle}`);
    if (r.erreur) return { erreur: r.erreur };
    liens[cle] = r.valeur ?? '';
  }

  const site = lien('url');
  if (site.erreur) return { erreur: site.erreur };

  const jours = donnees.getAll('jour').map(String);
  const horaires = jours.map((jour, i) => ({
    jour,
    // Un jour sans horaire est un jour fermé, pas un jour sans information :
    // c'est la chaîne vide qui le dit, et le site affiche « Fermé ».
    ouverture: String(donnees.get(`horaire_${i}`) ?? '').trim() || null,
  }));

  // Une position à moitié saisie vaut mieux vide que fausse : Google place le
  // studio là où ces deux nombres le disent, pas là où l'adresse le dit.
  const latitude = texte('latitude');
  const longitude = texte('longitude');
  if ((latitude && !longitude) || (longitude && !latitude)) {
    return { erreur: 'Latitude et longitude vont ensemble : indiquez les deux, ou aucune.' };
  }
  if (latitude && !/^-?\d{1,3}(\.\d+)?$/.test(latitude)) {
    return { erreur: 'La latitude doit être un nombre, par exemple 45.0435.' };
  }
  if (longitude && !/^-?\d{1,3}(\.\d+)?$/.test(longitude)) {
    return { erreur: 'La longitude doit être un nombre, par exemple 3.8853.' };
  }

  await majEntreprise({
    nom,
    role: texte('role'),
    description: texte('description'),
    latitude,
    longitude,
    directeurPublication: texte('directeurPublication'),
    hebergeurNom: texte('hebergeurNom'),
    hebergeurAdresse: texte('hebergeurAdresse'),
    hebergeurSite: texte('hebergeurSite'),
    mediateurNom: texte('mediateurNom'),
    mediateurSite: texte('mediateurSite'),
    raisonSociale: texte('raisonSociale'),
    siret: texte('siret'),
    url: site.valeur ?? '',
    adresse: texte('adresse'),
    codePostal: texte('codePostal'),
    ville: texte('ville'),
    region: texte('region'),
    zone: texte('zone'),
    telephone: texte('telephone'),
    email,
    liens,
    horaires,
  });

  // Le pied de page et les coordonnées vivent sur toutes les pages ; le plan du
  // site et le fichier robots portent le domaine, et sont calculés une fois.
  revalidatePath('/', 'layout');
  revalidatePath('/sitemap.xml');
  revalidatePath('/robots.txt');
  return { succes: 'Informations enregistrées.' };
}
