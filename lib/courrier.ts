import 'server-only';
import nodemailer from 'nodemailer';
import { ligne, poserReglage, requete, jsonDeLaBase } from './bdd';
import { chiffrer, dechiffrer } from './secret';

/**
 * Envoi des e-mails, réglé par Kevin depuis son BackOffice.
 *
 * Rien n'est codé en dur : ni serveur, ni identifiants, ni adresse
 * d'expédition. Kevin saisit les réglages de son hébergeur, clique sur
 * « Envoyer un test », et voit tout de suite si ça passe. C'est le seul moyen
 * qu'une configuration SMTP soit utilisable par quelqu'un qui n'est pas
 * administrateur système.
 */

export type ReglagesSmtp = {
  serveur: string;
  port: number;
  chiffrement: 'tls' | 'starttls' | 'aucun';
  identifiant: string;
  /** Toujours chiffré en base. Jamais renvoyé au navigateur. */
  motDePasse: string | null;
  expediteurNom: string;
  expediteurEmail: string;
  reponseEmail: string;
  /** Où Kevin reçoit les demandes du formulaire. */
  destinataire: string;
  /** Accusé de réception envoyé au visiteur, rédigé par Kevin. */
  accuseActif: boolean;
  accuseObjet: string;
  accuseTexte: string;
};

export const SMTP_PAR_DEFAUT: ReglagesSmtp = {
  serveur: '',
  port: 465,
  chiffrement: 'tls',
  identifiant: '',
  motDePasse: null,
  expediteurNom: 'Kevin Machy',
  expediteurEmail: '',
  reponseEmail: '',
  destinataire: '',
  accuseActif: true,
  accuseObjet: 'Votre message est bien arrivé',
  accuseTexte:
    'Bonjour,\n\nVotre message m’est bien parvenu. Je vous réponds sous deux jours ouvrés.\n\nÀ très vite,\nKevin Machy',
};

const CLE = 'smtp';

export async function lireSmtp(): Promise<ReglagesSmtp> {
  const l = await ligne<{ valeur: Partial<ReglagesSmtp> }>(
    'SELECT valeur FROM reglages WHERE cle = ?',
    [CLE],
  );
  return { ...SMTP_PAR_DEFAUT, ...(jsonDeLaBase(l?.valeur) ?? {}) };
}

/**
 * Ce que le BackOffice a le droit d'afficher.
 *
 * Le mot de passe ne revient jamais, même chiffré : on dit seulement s'il y en
 * a un. Il se remplace, il ne se relit pas.
 */
export async function lireSmtpAffichable() {
  const { motDePasse, ...reste } = await lireSmtp();
  return { ...reste, motDePasseEnregistre: Boolean(motDePasse) };
}

export async function ecrireSmtp(
  reglages: Omit<ReglagesSmtp, 'motDePasse'> & { motDePasse?: string },
) {
  const actuel = await lireSmtp();

  // Un champ mot de passe laissé vide veut dire « ne change rien », pas
  // « efface ». Sans cela, tout enregistrement des réglages perdrait le mot de
  // passe, puisque le formulaire ne peut pas le réafficher.
  const motDePasse = reglages.motDePasse
    ? chiffrer(reglages.motDePasse)
    : actuel.motDePasse;

  await poserReglage(CLE, { ...reglages, motDePasse });
}

export async function effacerMotDePasseSmtp() {
  const actuel = await lireSmtp();
  await requete('UPDATE reglages SET valeur = ?, modifie_le = now() WHERE cle = ?', [
    JSON.stringify({ ...actuel, motDePasse: null }),
    CLE,
  ]);
}

/** `null` si la configuration est incomplète : on ne devine aucun réglage. */
function transporteur(r: ReglagesSmtp) {
  if (!r.serveur || !r.identifiant || !r.motDePasse || !r.expediteurEmail) return null;

  const motDePasse = dechiffrer(r.motDePasse);
  if (!motDePasse) return null;

  return nodemailer.createTransport({
    host: r.serveur,
    port: r.port,
    // `secure` veut dire TLS dès la connexion, typiquement le port 465.
    // STARTTLS monte en TLS après coup, typiquement le 587.
    secure: r.chiffrement === 'tls',
    requireTLS: r.chiffrement === 'starttls',
    auth: { user: r.identifiant, pass: motDePasse },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
  });
}

export type Resultat = { ok: true } | { ok: false; message: string };

export async function envoyer(courriel: {
  a: string;
  objet: string;
  texte: string;
  repondreA?: string;
}): Promise<Resultat> {
  const r = await lireSmtp();
  const envoyeur = transporteur(r);

  if (!envoyeur) {
    return { ok: false, message: 'Configuration e-mail incomplète. Voir Réglages → E-mails.' };
  }

  try {
    await envoyeur.sendMail({
      from: `"${r.expediteurNom}" <${r.expediteurEmail}>`,
      to: courriel.a,
      subject: courriel.objet,
      text: courriel.texte,
      replyTo: courriel.repondreA || r.reponseEmail || undefined,
    });
    return { ok: true };
  } catch (erreur) {
    // Le message du serveur SMTP est remonté tel quel : « authentification
    // refusée » ou « nom d'hôte introuvable » disent à Kevin quoi corriger,
    // là où « échec de l'envoi » ne dit rien.
    return { ok: false, message: messageLisible(erreur) };
  }
}

function messageLisible(erreur: unknown): string {
  const e = erreur as { code?: string; responseCode?: number; message?: string };

  if (e.code === 'EAUTH' || e.responseCode === 535) {
    return 'Identifiant ou mot de passe refusé par le serveur.';
  }
  if (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN') {
    return 'Serveur introuvable. Vérifiez son adresse.';
  }
  if (e.code === 'ETIMEDOUT' || e.code === 'ECONNECTION') {
    return 'Pas de réponse du serveur. Vérifiez le port et le chiffrement.';
  }
  if (e.code === 'ESOCKET') {
    return 'Échec de la connexion sécurisée. Le port et le chiffrement ne vont sans doute pas ensemble.';
  }
  return e.message?.slice(0, 240) ?? 'Échec de l’envoi.';
}
