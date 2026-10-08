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
  /**
   * Par où sortent les messages.
   *
   * `api` passe par une requête HTTP chez un service d'envoi. `smtp` ouvre une
   * connexion directe vers un serveur de courrier — ce que l'hébergement
   * actuel ne permet pas. Voir `envoyerParApi` pour le détail.
   */
  methode: 'api' | 'smtp';
  /** Clé du service d'envoi. Toujours chiffrée en base, jamais réaffichée. */
  cleApi: string | null;
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
  methode: 'api',
  cleApi: null,
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
  const enregistre = jsonDeLaBase(l?.valeur) ?? {};
  const reglages = { ...SMTP_PAR_DEFAUT, ...enregistre };

  /*
   * Les réglages écrits avant le 8 octobre 2026 ne portent pas de méthode.
   *
   * Leur en imposer une casserait silencieusement les installations qui
   * marchent : le docker-compose de développement envoie vers le Mailpit en
   * `localhost:1025`, et basculer son chemin sans le lui dire lui couperait
   * l'envoi sans qu'aucun réglage ait bougé à l'écran.
   *
   * On la déduit donc de ce qui est renseigné. Une clé l'emporte sur un
   * serveur : on ne garde le SMTP que si c'est la seule chose configurée.
   */
  if (!enregistre.methode) {
    reglages.methode = reglages.cleApi ? 'api' : reglages.serveur ? 'smtp' : 'api';
  }

  return reglages;
}

/**
 * Ce que le BackOffice a le droit d'afficher.
 *
 * Le mot de passe ne revient jamais, même chiffré : on dit seulement s'il y en
 * a un. Il se remplace, il ne se relit pas.
 */
export async function lireSmtpAffichable() {
  const { motDePasse, cleApi, ...reste } = await lireSmtp();
  const affichable = { ...reste, cleApiEnregistree: Boolean(cleApi) };
  return {
    ...affichable,
    motDePasseEnregistre: Boolean(motDePasse),
    // Ce que le garde-fou refuserait aujourd'hui peut déjà être en base : il
    // est né après. La page le dit donc d'elle-même, sans attendre qu'on
    // enregistre pour découvrir que rien ne part.
    problemes: verifierSmtp(affichable),
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
export type ReglagesVerifiables = Omit<ReglagesSmtp, 'motDePasse' | 'cleApi'> & {
  cleApiEnregistree: boolean;
};

export function verifierSmtp(
  r: ReglagesVerifiables,
  enLigne = process.env.NODE_ENV === 'production',
): string[] {
  if (!enLigne) return [];

  const problemes: string[] = [];

  if (r.methode === 'api') {
    if (!r.cleApiEnregistree) {
      problemes.push('Aucune clé d’envoi enregistrée.');
    }
    if (!r.expediteurEmail.trim()) {
      problemes.push('Aucune adresse d’expédition : le service d’envoi en exige une.');
    }
    for (const [libelle, adresse] of [
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
  reglages: Omit<ReglagesSmtp, 'motDePasse' | 'cleApi'> & {
    motDePasse?: string;
    cleApi?: string;
  },
) {
  const actuel = await lireSmtp();

  // Un champ mot de passe laissé vide veut dire « ne change rien », pas
  // « efface ». Sans cela, tout enregistrement des réglages perdrait le mot de
  // passe, puisque le formulaire ne peut pas le réafficher.
  const motDePasse = reglages.motDePasse
    ? chiffrer(reglages.motDePasse)
    : actuel.motDePasse;

  // Même règle pour la clé du service d'envoi : un champ vide veut dire
  // « garde celle d'avant ». Elle ne se réaffiche pas davantage.
  const cleApi = reglages.cleApi ? chiffrer(reglages.cleApi) : actuel.cleApi;

  await poserReglage(CLE, { ...reglages, motDePasse, cleApi });
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

export type Resultat =
  | { ok: true }
  /**
   * `message` est pour Kevin, `detail` est pour celui qui répare.
   *
   * La traduction en français dit quoi corriger quand la cause est ordinaire —
   * mot de passe, adresse du serveur. Elle ne sert à rien quand elle ne l'est
   * pas : « Échec de la connexion sécurisée » a été affiché trois fois de suite
   * sur deux ports différents sans jamais dire ce que la machine avait vu.
   * Le texte d'origine est donc conservé à côté.
   */
  | { ok: false; message: string; detail?: string };

export async function envoyer(courriel: {
  a: string;
  objet: string;
  texte: string;
  repondreA?: string;
}): Promise<Resultat> {
  const r = await lireSmtp();

  if (r.methode === 'api') return envoyerParApi(r, courriel);

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
    return { ok: false, message: messageLisible(erreur), detail: detailTechnique(erreur) };
  }
}

/**
 * L'envoi par requête HTTP, et pourquoi il a remplacé le SMTP.
 *
 * Le site tourne sur un Worker Cloudflare. Or **toute l'infrastructure mail de
 * Hostinger est derrière Cloudflare** : `smtp.hostinger.com`,
 * `smtp.hostinger.fr` et les MX du domaine résolvent tous dans
 * `172.64.0.0/13`, enregistré au nom de Cloudflare. Et un Worker refuse
 * d'ouvrir une socket vers une adresse appartenant à Cloudflare.
 *
 * Mesuré le 8 octobre 2026 :
 *
 *     ESOCKET · étape CONN · proxy request failed,
 *     cannot connect to the specified address
 *
 * sur 465 en TLS **puis** sur 587 en STARTTLS, alors que le même serveur
 * répondait parfaitement depuis une machine ordinaire — TLS 1.3, dialogue
 * complet jusqu'au 221. Le serveur n'était pas en cause : deux services
 * Cloudflare refusaient de se parler, et aucun réglage ne corrige ça. Ni le
 * port, ni le chiffrement, ni le mot de passe n'avaient d'importance.
 *
 * Une requête HTTP, elle, sort sans difficulté. D'où ce chemin.
 *
 * Le SMTP reste en place et reste utilisable : il redeviendra le bon choix le
 * jour où la vitrine sera servie depuis Hostinger, où le serveur d'envoi est
 * joignable sans passer par Cloudflare.
 */
const API_ENVOI = 'https://api.resend.com/emails';

async function envoyerParApi(
  r: ReglagesSmtp,
  courriel: { a: string; objet: string; texte: string; repondreA?: string },
): Promise<Resultat> {
  const cle = r.cleApi ? dechiffrer(r.cleApi) : null;
  if (!cle || !r.expediteurEmail) {
    return { ok: false, message: 'Configuration e-mail incomplète. Voir Réglages → E-mails.' };
  }

  const repondre = courriel.repondreA || r.reponseEmail;

  try {
    const reponse = await fetch(API_ENVOI, {
      method: 'POST',
      headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: `"${r.expediteurNom.replace(/"/g, '')}" <${r.expediteurEmail}>`,
        to: [courriel.a],
        subject: courriel.objet,
        text: courriel.texte,
        ...(repondre ? { reply_to: repondre } : {}),
      }),
    });

    if (reponse.ok) return { ok: true };

    const brut = (await reponse.text()).slice(0, 400);
    return {
      ok: false,
      message: messageApiLisible(reponse.status, brut),
      detail: `HTTP ${reponse.status} · ${brut}`,
    };
  } catch (erreur) {
    // Le réseau, pas le service : une coupure, un délai dépassé.
    return {
      ok: false,
      message: 'Le service d’envoi n’a pas répondu. Réessayez dans un instant.',
      detail: detailTechnique(erreur),
    };
  }
}

/**
 * Traduire ce que le service d'envoi refuse.
 *
 * Deux cas valent d'être nommés, parce qu'ils se corrigent et que leur message
 * d'origine est en anglais : la clé refusée, et le domaine d'expédition pas
 * encore vérifié. Le reste est remonté tel quel — mieux vaut une phrase
 * obscure que fausse.
 */
function messageApiLisible(statut: number, corps: string): string {
  if (statut === 401 || statut === 403) {
    return 'Clé d’envoi refusée. Vérifiez-la dans Réglages → E-mails.';
  }
  if (statut === 429) {
    return 'Trop d’envois d’un coup. Réessayez dans un instant.';
  }
  if (/domain is not verified|not verified/i.test(corps)) {
    return (
      'Le domaine de l’adresse d’expédition n’est pas encore vérifié chez le ' +
      'service d’envoi. Terminez la vérification, puis réessayez.'
    );
  }

  try {
    const j = JSON.parse(corps) as { message?: string; error?: { message?: string } };
    const m = j.message ?? j.error?.message;
    if (m) return m.slice(0, 240);
  } catch {
    // Pas du JSON : on retombe sur la phrase générique.
  }
  return `Le service d’envoi a refusé la demande (code ${statut}).`;
}

/**
 * Ce que la machine a vu, sans interprétation.
 *
 * Rassemble le code, l'étape SMTP où ça a cassé (`command` : `CONN`, `EHLO`,
 * `STARTTLS`, `AUTH`…) et le texte d'origine. C'est `command` qui vaut le
 * détour : il distingue une connexion qui n'aboutit pas d'une poignée de main
 * qui échoue, là où le code seul laisse les deux sous `ESOCKET`.
 */
function detailTechnique(erreur: unknown): string {
  const e = erreur as {
    code?: string;
    command?: string;
    responseCode?: number;
    message?: string;
    cause?: { message?: string };
  };

  return [
    e.code,
    e.command ? `étape ${e.command}` : null,
    e.responseCode ? `réponse ${e.responseCode}` : null,
    e.message,
    e.cause?.message && e.cause.message !== e.message ? `cause : ${e.cause.message}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 400);
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
