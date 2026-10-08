import 'server-only';
import { ecrire, ligne, requete } from './bdd';
import { envoyer, lireSmtp } from './courrier';

/**
 * Les demandes reçues par le formulaire de contact.
 *
 * Deux principes, et le premier commande l'ordre des opérations :
 *
 * 1. **La demande est enregistrée avant d'être envoyée.** Si le serveur SMTP de
 *    Kevin est en panne, la demande l'attend quand même dans son BackOffice.
 *    L'inverse perdrait des clients sans que personne le sache.
 * 2. **L'accusé de réception part après.** Son échec ne doit jamais empêcher la
 *    demande d'arriver.
 */

export type Message = {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  projet: string | null;
  dateProjet: string | null;
  message: string;
  lu: boolean;
  envoi: 'en_attente' | 'envoye' | 'echec';
  envoiDetail: string | null;
  creeLe: Date;
};

type LigneMessage = Omit<Message, 'dateProjet' | 'envoiDetail' | 'creeLe'> & {
  date_projet: string | null;
  envoi_detail: string | null;
  cree_le: Date;
};

const versMessage = (l: LigneMessage): Message => ({
  id: l.id,
  nom: l.nom,
  email: l.email,
  telephone: l.telephone,
  projet: l.projet,
  dateProjet: l.date_projet,
  message: l.message,
  lu: l.lu,
  envoi: l.envoi,
  envoiDetail: l.envoi_detail,
  creeLe: l.cree_le,
});

const CHAMPS = `id, nom, email, telephone, projet, date_projet, message,
                lu, envoi, envoi_detail, cree_le`;

export async function listerMessages(limite = 200) {
  const lignes = await requete<LigneMessage>(
    `SELECT ${CHAMPS} FROM messages ORDER BY cree_le DESC LIMIT ${Math.trunc(limite) || 200}`,
  );
  return lignes.map(versMessage);
}

export async function lireMessage(id: number) {
  const l = await ligne<LigneMessage>(`SELECT ${CHAMPS} FROM messages WHERE id = ?`, [id]);
  return l ? versMessage(l) : null;
}

export async function compterNonLus() {
  const r = await ligne<{ n: number }>('SELECT count(*) AS n FROM messages WHERE lu = 0');
  return Number(r?.n ?? 0);
}

export async function marquerLu(id: number, lu: boolean) {
  await requete('UPDATE messages SET lu = ? WHERE id = ?', [lu ? 1 : 0, id]);
}

export async function supprimerMessage(id: number) {
  await requete('DELETE FROM messages WHERE id = ?', [id]);
}

export type Demande = {
  nom: string;
  email: string;
  telephone?: string;
  projet?: string;
  dateProjet?: string;
  message: string;
  consentement: boolean;
};

export async function enregistrerDemande(d: Demande) {
  const cree = await ecrire(
    `INSERT INTO messages (nom, email, telephone, projet, date_projet, message, consentement)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      d.nom.slice(0, 200),
      d.email.slice(0, 200),
      d.telephone?.slice(0, 60) || null,
      d.projet?.slice(0, 80) || null,
      d.dateProjet?.slice(0, 60) || null,
      d.message.slice(0, 8000),
      d.consentement ? 1 : 0,
    ],
  );
  if (!cree.insertId) throw new Error('Enregistrement impossible.');

  await notifier(cree.insertId, d);
  return cree.insertId;
}

/** Ce que Kevin reçoit : la demande mise à plat, dans l'ordre où on la lit. */
function resumeDe(d: Demande) {
  return [
    `Nom : ${d.nom}`,
    `E-mail : ${d.email}`,
    d.telephone ? `Téléphone : ${d.telephone}` : null,
    d.projet ? `Projet : ${d.projet}` : null,
    d.dateProjet ? `Date envisagée : ${d.dateProjet}` : null,
    '',
    d.message,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/**
 * Prévenir Kevin, et garder trace de ce qui s'est passé.
 *
 * Rend `true` si le message est parti. L'état est écrit en base dans tous les
 * cas : c'est lui qui permet au BackOffice de montrer qu'une demande n'a
 * prévenu personne, et de proposer de réessayer.
 */
async function prevenirKevin(id: number, d: Demande): Promise<boolean> {
  const reglages = await lireSmtp();
  const destinataire = reglages.destinataire || reglages.expediteurEmail;

  if (!destinataire) {
    await requete(`UPDATE messages SET envoi = 'echec', envoi_detail = ? WHERE id = ?`, [
      'Aucun destinataire configuré. Voir Réglages → E-mails.',
      id,
    ]);
    return false;
  }

  const resultat = await envoyer({
    a: destinataire,
    objet: `Demande de ${d.nom}${d.projet ? ` — ${d.projet}` : ''}`,
    texte: resumeDe(d),
    // Répondre au message répond au visiteur, pas à soi-même.
    repondreA: d.email,
  });

  await requete('UPDATE messages SET envoi = ?, envoi_detail = ? WHERE id = ?', [
    resultat.ok ? 'envoye' : 'echec',
    resultat.ok ? null : [resultat.message, resultat.detail].filter(Boolean).join(' — '),
    id,
  ]);

  return resultat.ok;
}

/** Prévient Kevin, puis accuse réception au visiteur. Aucun des deux n'est bloquant. */
async function notifier(id: number, d: Demande) {
  if (!(await prevenirKevin(id, d))) return;

  const reglages = await lireSmtp();
  if (reglages.accuseActif && reglages.accuseTexte.trim()) {
    // Un accusé qui échoue ne doit rien changer à la demande, déjà arrivée.
    await envoyer({
      a: d.email,
      objet: reglages.accuseObjet || 'Votre message est bien arrivé',
      texte: reglages.accuseTexte,
    }).catch(() => undefined);
  }
}

/**
 * Réessayer de prévenir Kevin d'une demande déjà reçue.
 *
 * Nécessaire parce que la notification ne se déclenche qu'à l'arrivée du
 * message : une demande tombée pendant une panne d'envoi reste muette pour
 * toujours. Deux l'ont été début octobre 2026, dont une pour un événement à
 * trois semaines, et rien dans l'interface ne permettait de les rattraper.
 *
 * **L'accusé de réception ne repart pas, et c'est voulu.** Il annonce « votre
 * message m'est bien parvenu, je vous réponds sous deux jours ouvrés » : vrai
 * à la minute où le formulaire part, faux cinq jours plus tard. L'envoyer en
 * retard laisserait croire au visiteur que sa demande vient d'arriver, et
 * ferait repartir un délai déjà dépassé. À ce stade, ce qu'il attend est une
 * réponse de Kevin, pas un automatisme. Ce bouton prévient Kevin, lui seul.
 */
export async function renvoyerNotification(id: number) {
  const m = await lireMessage(id);
  if (!m) throw new Error(`Aucun message numéro ${id}.`);

  return prevenirKevin(id, {
    nom: m.nom,
    email: m.email,
    telephone: m.telephone ?? undefined,
    projet: m.projet ?? undefined,
    dateProjet: m.dateProjet ?? undefined,
    message: m.message,
    consentement: true,
  });
}
