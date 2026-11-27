import 'server-only';
import { ImapFlow, type ListResponse, type MessageStructureObject } from 'imapflow';
import { simpleParser, type AddressObject } from 'mailparser';
import { envoyerEtGarder, lireSmtp, type Courriel } from './courrier';
import { dechiffrer } from './secret';

/**
 * La boîte mail de Kevin, lue depuis le BackOffice.
 *
 * Kevin relève son courrier sur le webmail de Hostinger, dans un autre onglet,
 * avec un autre mot de passe à retrouver. Ici, il lit, répond et écrit sans
 * quitter son BackOffice — et c'est **la même boîte** : ce qu'il lit ici est
 * lu là-bas, ce qu'il envoie d'ici est rangé dans ses Envoyés, comme depuis
 * n'importe quel logiciel de courrier.
 *
 * Rien n'est gardé en base. Chaque geste ouvre une connexion IMAP, fait son
 * travail et la referme : une boîte d'une seule personne n'a pas besoin de
 * plus, et rien ne peut diverger entre deux copies qui n'existent pas.
 *
 * Ce n'était pas possible tant que le site tournait chez Cloudflare : un
 * Worker ne joint pas le serveur de courrier de Hostinger (voir
 * `lib/courrier.ts`). C'est l'une des raisons du retour chez Hostinger.
 */

export type Role = 'reception' | 'envoyes' | 'brouillons' | 'indesirables' | 'corbeille' | 'autre';

export type Dossier = {
  chemin: string;
  nom: string;
  role: Role;
  nonLus: number;
};

export type Adresse = { nom: string; adresse: string };

export type Resume = {
  uid: number;
  de: Adresse | null;
  a: Adresse[];
  objet: string;
  date: string | null;
  lu: boolean;
  repondu: boolean;
  piecesJointes: boolean;
};

export type Piece = { numero: number; nom: string; type: string; octets: number };

export type Lu = Resume & {
  cc: Adresse[];
  repondreA: Adresse | null;
  texte: string;
  /** Le HTML du message, tel quel : il n'est affiché que dans un cadre isolé. */
  html: string | null;
  pieces: Piece[];
};

export type Echec = { ok: false; message: string };

/** Ce que le BackOffice affiche quand la réception n'est pas réglée. */
export class BoiteNonReglee extends Error {
  constructor() {
    super('La réception n’est pas réglée. Voir Réglages → E-mails.');
  }
}

/** Les noms que Kevin connaît, pas ceux du serveur (`INBOX.Sent`…). */
const ROLES: Record<string, { role: Role; nom: string; rang: number }> = {
  '\\Inbox': { role: 'reception', nom: 'Réception', rang: 0 },
  '\\Sent': { role: 'envoyes', nom: 'Envoyés', rang: 1 },
  '\\Drafts': { role: 'brouillons', nom: 'Brouillons', rang: 2 },
  '\\Junk': { role: 'indesirables', nom: 'Indésirables', rang: 3 },
  '\\Trash': { role: 'corbeille', nom: 'Corbeille', rang: 4 },
};

/**
 * Ouvrir la boîte, faire un travail, refermer — même en cas d'erreur.
 *
 * Un serveur IMAP limite le nombre de connexions par boîte. Une connexion
 * oubliée ouverte à chaque clic finirait par bloquer Kevin lui-même, sur son
 * téléphone, avec un refus qu'il ne saurait pas relier au site.
 */
export async function avecBoite<T>(travail: (client: ImapFlow) => Promise<T>): Promise<T> {
  const r = await lireSmtp();
  const motDePasse = dechiffrer(r.motDePasse);
  if (!r.imapServeur.trim() || !r.identifiant.trim() || !motDePasse) throw new BoiteNonReglee();

  const client = new ImapFlow({
    host: r.imapServeur.trim(),
    port: r.imapPort || 993,
    // 993 est chiffré dès la connexion ; 143 monte en TLS ensuite (STARTTLS).
    secure: (r.imapPort || 993) !== 143,
    auth: { user: r.identifiant.trim(), pass: motDePasse },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 60_000,
  });
  // Sans écouteur, une coupure réseau après coup ferait tomber le serveur
  // Node entier : une erreur non écoutée sur un émetteur est fatale.
  client.on('error', () => {});

  await client.connect();
  try {
    return await travail(client);
  } finally {
    await client.logout().catch(() => client.close());
  }
}

/** Traduire ce que le serveur de réception refuse, pour Kevin. */
export function messageImap(erreur: unknown): string {
  if (erreur instanceof BoiteNonReglee) return erreur.message;
  const e = erreur as { authenticationFailed?: boolean; code?: string; message?: string };
  if (e.authenticationFailed || /AUTHENTICATIONFAILED|Invalid credentials/i.test(e.message ?? '')) {
    return 'Identifiant ou mot de passe refusé par le serveur de réception.';
  }
  if (e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN') {
    return 'Serveur de réception introuvable. Vérifiez son adresse dans Réglages → E-mails.';
  }
  if (e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET') {
    return 'Le serveur de réception ne répond pas. Vérifiez le port, ou réessayez dans un instant.';
  }
  return `La boîte n’a pas pu être lue${e.message ? ` : ${e.message.slice(0, 200)}` : '.'}`;
}

/** Une erreur rendue lisible et journalisée, pour les actions du BackOffice. */
export function echec(erreur: unknown): Echec {
  if (!(erreur instanceof BoiteNonReglee)) console.error('Boîte mail :', erreur);
  return { ok: false, message: messageImap(erreur) };
}

function dossierDe(l: ListResponse): Dossier | null {
  if (l.flags.has('\\Noselect') || l.flags.has('\\NonExistent')) return null;
  const connu =
    l.path.toUpperCase() === 'INBOX' ? ROLES['\\Inbox'] : l.specialUse ? ROLES[l.specialUse] : undefined;
  return {
    chemin: l.path,
    nom: connu?.nom ?? l.name,
    role: connu?.role ?? 'autre',
    nonLus: l.status?.unseen ?? 0,
  };
}

async function dossiers(client: ImapFlow): Promise<Dossier[]> {
  const liste = await client.list({ statusQuery: { unseen: true } });
  const rang = (d: Dossier) =>
    Object.values(ROLES).find((r) => r.role === d.role)?.rang ?? 10;
  return liste
    .map(dossierDe)
    .filter((d): d is Dossier => d !== null)
    .sort((x, y) => rang(x) - rang(y) || x.nom.localeCompare(y.nom, 'fr'));
}

const adresse = (a: { name?: string; address?: string } | undefined): Adresse | null =>
  a?.address ? { nom: a.name?.trim() || '', adresse: a.address } : null;

const adresses = (liste: { name?: string; address?: string }[] | undefined) =>
  (liste ?? []).map(adresse).filter((a): a is Adresse => a !== null);

/** Les adresses telles que `mailparser` les rend : un objet, ou une liste d'objets. */
const adressesAnalysees = (champ: AddressObject | AddressObject[] | undefined) =>
  (Array.isArray(champ) ? champ : champ ? [champ] : []).flatMap((o) => adresses(o.value));

/** Une pièce jointe se voit dans la structure, sans télécharger le message. */
function aDesPieces(s: MessageStructureObject | undefined): boolean {
  if (!s) return false;
  if (s.disposition?.toLowerCase() === 'attachment') return true;
  return (s.childNodes ?? []).some(aDesPieces);
}

export const PAR_PAGE = 40;

/** Une page de la liste, du plus récent au plus ancien. */
async function page(client: ImapFlow, chemin: string, numero: number) {
  const verrou = await client.getMailboxLock(chemin, { readOnly: true });
  try {
    const total = client.mailbox ? client.mailbox.exists : 0;
    const fin = total - numero * PAR_PAGE;
    if (fin < 1) return { emails: [] as Resume[], total };

    const debut = Math.max(1, fin - PAR_PAGE + 1);
    const emails: (Resume & { seq: number })[] = [];
    for await (const m of client.fetch(`${debut}:${fin}`, {
      uid: true,
      envelope: true,
      flags: true,
      internalDate: true,
      bodyStructure: true,
    })) {
      const date = m.envelope?.date ?? m.internalDate;
      emails.push({
        seq: m.seq,
        uid: m.uid,
        de: adresse(m.envelope?.from?.[0]),
        a: adresses(m.envelope?.to),
        objet: m.envelope?.subject ?? '',
        date: date ? new Date(date).toISOString() : null,
        lu: m.flags?.has('\\Seen') ?? false,
        repondu: m.flags?.has('\\Answered') ?? false,
        piecesJointes: aDesPieces(m.bodyStructure),
      });
    }
    // L'ordre d'arrivée dans la boîte, pas la date annoncée par l'expéditeur :
    // un message à l'horloge fausse ne doit pas se cacher en bas de liste.
    emails.sort((x, y) => y.seq - x.seq);
    return { emails: emails.map(({ seq: _seq, ...e }) => e), total };
  } finally {
    verrou.release();
  }
}

/** À l'ouverture : les dossiers et la première page de la réception, en une connexion. */
export async function ouvrirBoite() {
  return avecBoite(async (client) => {
    const liste = await dossiers(client);
    const reception = liste.find((d) => d.role === 'reception') ?? liste[0];
    const premiere = reception ? await page(client, reception.chemin, 0) : { emails: [], total: 0 };
    return { dossiers: liste, chemin: reception?.chemin ?? 'INBOX', ...premiere };
  });
}

export async function listerEmails(chemin: string, numero: number) {
  return avecBoite(async (client) => ({
    ...(await page(client, chemin, numero)),
    dossiers: await dossiers(client),
  }));
}

/**
 * Le message complet, analysé.
 *
 * Le lire le marque lu, sur le serveur : Kevin le verra lu aussi sur son
 * téléphone. C'est ce que fait tout logiciel de courrier.
 */
export async function lireEmail(chemin: string, uid: number): Promise<Lu | null> {
  return avecBoite(async (client) => {
    const verrou = await client.getMailboxLock(chemin);
    try {
      const m = await client.fetchOne(
        String(uid),
        { uid: true, source: true, flags: true, bodyStructure: true },
        { uid: true },
      );
      if (!m || !m.source) return null;

      const lu = m.flags?.has('\\Seen') ?? false;
      if (!lu) await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });

      const c = await simpleParser(m.source);
      return {
        uid,
        de: adressesAnalysees(c.from)[0] ?? null,
        a: adressesAnalysees(c.to),
        cc: adressesAnalysees(c.cc),
        repondreA: adressesAnalysees(c.replyTo)[0] ?? null,
        objet: c.subject ?? '',
        date: c.date ? c.date.toISOString() : null,
        lu: true,
        repondu: m.flags?.has('\\Answered') ?? false,
        piecesJointes: aDesPieces(m.bodyStructure),
        texte: c.text?.trim() ? c.text : typeof c.html === 'string' ? texteDuHtml(c.html) : '',
        html: typeof c.html === 'string' && c.html.trim() ? c.html : null,
        pieces: piecesDe(c.attachments),
      };
    } finally {
      verrou.release();
    }
  });
}

/**
 * Le texte d'un message qui n'existe qu'en HTML.
 *
 * Il ne sert qu'à citer le message sous une réponse : sans lui, répondre à
 * une lettre d'information citait un vide. Le résultat est affiché comme du
 * texte, jamais interprété : il n'a pas besoin d'être parfait, seulement
 * lisible.
 */
function texteDuHtml(html: string) {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, '’')
    .replace(/&amp;/gi, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

type PieceAnalysee = {
  filename?: string;
  contentType: string;
  size: number;
  contentDisposition?: string;
  related?: boolean;
};

/**
 * Les pièces que Kevin peut télécharger.
 *
 * Les images glissées dans le corps du message (`related`) y sont déjà
 * affichées : les lister en plus ferait croire à des fichiers joints. Le
 * numéro est la position dans la liste complète, celle que la route de
 * téléchargement relit — d'où le filtre après la numérotation.
 */
function piecesDe(liste: PieceAnalysee[]): Piece[] {
  return liste
    .map((p, numero) => ({ p, numero }))
    .filter(({ p }) => !p.related || p.contentDisposition === 'attachment')
    .map(({ p, numero }) => ({
      numero,
      nom: p.filename || `piece-${numero + 1}`,
      type: p.contentType,
      octets: p.size,
    }));
}

/** Une pièce jointe, pour la route de téléchargement. */
export async function lirePiece(chemin: string, uid: number, numero: number) {
  return avecBoite(async (client) => {
    const verrou = await client.getMailboxLock(chemin, { readOnly: true });
    try {
      const m = await client.fetchOne(String(uid), { uid: true, source: true }, { uid: true });
      if (!m || !m.source) return null;
      const c = await simpleParser(m.source);
      const p = c.attachments[numero];
      return p
        ? { nom: p.filename || `piece-${numero + 1}`, type: p.contentType, contenu: p.content }
        : null;
    } finally {
      verrou.release();
    }
  });
}

export async function marquerLu(chemin: string, uid: number, lu: boolean) {
  return avecBoite(async (client) => {
    const verrou = await client.getMailboxLock(chemin);
    try {
      if (lu) await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
      else await client.messageFlagsRemove(String(uid), ['\\Seen'], { uid: true });
    } finally {
      verrou.release();
    }
  });
}

/**
 * Supprimer, c'est mettre à la corbeille.
 *
 * Seul un message déjà dans la corbeille disparaît pour de bon — et c'est le
 * BackOffice qui demande confirmation avant. Une boîte sans corbeille (rare)
 * suit la même règle : on ne supprime pas définitivement sans l'avoir dit.
 */
export async function supprimer(chemin: string, uid: number, definitivement: boolean) {
  return avecBoite(async (client) => {
    const corbeille = (await dossiers(client)).find((d) => d.role === 'corbeille');
    const verrou = await client.getMailboxLock(chemin);
    try {
      if (corbeille && corbeille.chemin !== chemin) {
        await client.messageMove(String(uid), corbeille.chemin, { uid: true });
        return 'corbeille' as const;
      }
      if (!definitivement) return 'confirmer' as const;
      await client.messageDelete(String(uid), { uid: true });
      return 'supprime' as const;
    } finally {
      verrou.release();
    }
  });
}

/** Ce qu'il faut du message d'origine pour que la réponse rejoigne son fil. */
async function filDe(client: ImapFlow, chemin: string, uid: number) {
  const verrou = await client.getMailboxLock(chemin);
  try {
    const m = await client.fetchOne(
      String(uid),
      { uid: true, envelope: true, headers: ['references'] },
      { uid: true },
    );
    if (!m) return null;
    const references = (m.headers?.toString('utf8') ?? '')
      .replace(/^references:\s*/i, '')
      .match(/<[^<>\s]+>/g) ?? [];
    const id = m.envelope?.messageId;
    // Marqué « répondu » sur le serveur, comme le ferait le logiciel de Kevin.
    await client.messageFlagsAdd(String(uid), ['\\Answered'], { uid: true });
    return id ? { enReponseA: id, references: [...references, id].slice(-20) } : null;
  } finally {
    verrou.release();
  }
}

/**
 * Écrire, depuis le BackOffice — un nouveau message ou une réponse.
 *
 * Le message part par le SMTP de la boîte (`envoyerEtGarder`), puis sa copie
 * exacte est déposée dans les Envoyés. Si ce rangement échoue, le message est
 * quand même parti : on le dit, sans le présenter comme un échec — le
 * renvoyer ferait recevoir deux fois la même chose au client.
 */
export async function ecrire(
  courriel: Pick<Courriel, 'a' | 'cc' | 'objet' | 'texte'>,
  reponse?: { chemin: string; uid: number },
): Promise<{ ok: true; range: boolean } | Echec> {
  let fil: { enReponseA: string; references: string[] } | null = null;
  if (reponse) {
    try {
      fil = await avecBoite((client) => filDe(client, reponse.chemin, reponse.uid));
    } catch (erreur) {
      // Sans le fil, la réponse part quand même : elle ne sera simplement pas
      // rangée sous le message d'origine chez le destinataire.
      console.error('Boîte mail, fil de la réponse :', erreur);
    }
  }

  const envoi = await envoyerEtGarder({ ...courriel, ...(fil ?? {}) });
  if (!envoi.ok) {
    if (envoi.detail) console.error('Envoi depuis la boîte mail :', envoi.detail);
    return { ok: false, message: envoi.message };
  }

  try {
    await avecBoite(async (client) => {
      const envoyes = (await dossiers(client)).find((d) => d.role === 'envoyes');
      if (!envoyes) throw new Error('Aucun dossier Envoyés.');
      await client.append(envoyes.chemin, envoi.brut, ['\\Seen']);
    });
    return { ok: true, range: true };
  } catch (erreur) {
    console.error('Boîte mail, rangement dans Envoyés :', erreur);
    return { ok: true, range: false };
  }
}

/** L'essai de Réglages → E-mails : se connecter et compter, sans rien toucher. */
export async function testerReception() {
  return avecBoite(async (client) => {
    const s = await client.status('INBOX', { messages: true, unseen: true });
    return { messages: s ? (s.messages ?? 0) : 0, nonLus: s ? (s.unseen ?? 0) : 0 };
  });
}
