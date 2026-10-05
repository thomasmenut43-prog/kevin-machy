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
  return {
    ...reste,
    motDePasseEnregistre: Boolean(motDePasse),
    // Ce que le garde-fou refuserait aujourd'hui peut déjà être en base : il
    // est né après. La page le dit donc d'elle-même, sans attendre qu'on
    // enregistre pour découvrir que rien ne part.
    problemes: verifierSmtp(reste),
  };
}

/**
 * Ce qu'une configuration e-mail ne peut pas être, en ligne.
 *
 * Le 3 octobre 2026, une demande de photobooth est restée trois jours dans le
 * BackOffice sans que personne le sache : le serveur d'envoi enregistré en
 * production était `localhost:1025`, c'est-à-dire le Mailpit du
 * docker-compose. L'identifiant et la boîte de réception étaient sur
 * `exemple.fr`. La base de production avait été peuplée depuis celle de
 * développement, et ces valeurs n'avaient jamais été refaites.
 *
 * Rien ne les en empêchait. C'est ce que ces contrôles corrigent.
 *
 * Ils refusent seulement ce qui **ne peut pas marcher** — pas ce qui est
 * discutable. Un Worker ne joint jamais `localhost` : la machine qui exécute
 * la requête n'est pas celle qui tient la boîte. Et les domaines réservés par
 * la RFC 2606 ne reçoivent, par construction, aucun courrier. Le reste — un
 * port inhabituel, un chiffrement désactivé — regarde l'hébergeur, pas nous.
 */
const HOTES_LOCAUX = /^(localhost|127(\.\d+){3}|0\.0\.0\.0|\[?::1\]?)$/i;
/**
 * `.test`, `.example`, `.invalid`, `.localhost` (RFC 2606 et 6761), `.local`
 * (mDNS, qui ne sort pas du réseau local), et le `exemple.fr` que ce projet
 * emploie partout comme marque-place.
 *
 * Le `(^|\.)` compte : `smtp.exemple.fr` est le marque-place affiché sous le
 * champ « Serveur SMTP », et une première version ne reconnaissait que
 * `exemple.fr` tout seul — elle laissait donc passer exactement la valeur
 * qu'elle était censée arrêter.
 */
const DOMAINES_RESERVES =
  /(^|\.)(test|example|invalid|localhost|local)$|(^|\.)(exemple\.fr|example\.(com|net|org))$/i;

const domaineDe = (adresse: string) => adresse.split('@')[1]?.trim().toLowerCase() ?? '';

/**
 * Les raisons pour lesquelles cette configuration ne peut pas fonctionner.
 *
 * Rien en développement : `localhost:1025` y est la **bonne** valeur, celle du
 * Mailpit lancé par le docker-compose. Ce qui est cassé en ligne est la
 * configuration normale en local, et un garde-fou qui l'ignorerait rendrait le
 * formulaire inutilisable sur la machine de celui qui développe.
 *
 * Ce n'est donc pas `localhost` qui est fautif en soi : c'est `localhost` sur
 * un Worker, qui n'est pas la machine qui tient la boîte.
 */
export function verifierSmtp(
  r: Omit<ReglagesSmtp, 'motDePasse'>,
  enLigne = process.env.NODE_ENV === 'production',
): string[] {
  if (!enLigne) return [];

  const problemes: string[] = [];
  const serveur = r.serveur.trim().toLowerCase();

  if (serveur && HOTES_LOCAUX.test(serveur)) {
    problemes.push(
      `« ${r.serveur} » désigne la machine qui exécute le site, pas un serveur d’envoi. ` +
        'Indiquez celui de votre hébergeur — chez Hostinger, « smtp.hostinger.com ».',
    );
  } else if (serveur && DOMAINES_RESERVES.test(serveur)) {
    problemes.push(`« ${r.serveur} » est un nom d’exemple : aucun serveur ne répond derrière.`);
  }

  for (const [libelle, adresse] of [
    ['L’identifiant', r.identifiant],
    ['L’adresse d’expédition', r.expediteurEmail],
    ['L’adresse de réponse', r.reponseEmail],
    ['La boîte où recevoir les demandes', r.destinataire],
  ] as const) {
    const domaine = domaineDe(adresse);
    if (domaine && DOMAINES_RESERVES.test(domaine)) {
      problemes.push(`${libelle} est sur « ${domaine} », un domaine d’exemple : rien n’y arrive.`);
    }
  }

  return problemes;
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

  /*
   * Le code d'erreur ne survit pas toujours au Worker.
   *
   * Ces traductions se fiaient à `e.code` seul. Sur Cloudflare, une erreur de
   * résolution DNS remonte sans lui : Kevin lisait « queryA ENOTFOUND
   * localhost » là où « Serveur introuvable » lui aurait dit quoi faire.
   * Constaté le 6 octobre 2026, sur un vrai échec.
   *
   * On regarde donc aussi le texte, que `nodejs_compat` laisse passer.
   */
  const texte = e.message ?? '';
  const porte = (...marqueurs: string[]) =>
    marqueurs.some((m) => e.code === m || texte.includes(m));

  if (porte('EAUTH') || e.responseCode === 535) {
    return 'Identifiant ou mot de passe refusé par le serveur.';
  }
  if (porte('ENOTFOUND', 'EAI_AGAIN')) {
    return 'Serveur introuvable. Vérifiez son adresse.';
  }
  if (porte('ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED')) {
    return 'Pas de réponse du serveur. Vérifiez le port et le chiffrement.';
  }
  if (porte('ESOCKET')) {
    return 'Échec de la connexion sécurisée. Le port et le chiffrement ne vont sans doute pas ensemble.';
  }
  return texte.slice(0, 240) || 'Échec de l’envoi.';
}
