import 'server-only';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { ecrire, ligne, requete } from './bdd';

const scryptAsync = promisify(scrypt);

/**
 * Authentification du BackOffice.
 *
 * Trois décisions structurent ce fichier, et chacune répond à une attaque
 * précise :
 *
 * 1. **Le mot de passe n'est jamais stocké**, seulement une empreinte scrypt
 *    avec un sel propre à chaque compte. Scrypt est volontairement lent et
 *    gourmand en mémoire : essayer des millions de mots de passe sur une
 *    sauvegarde volée coûte alors bien trop cher.
 * 2. **La session est une ligne en base**, pas un jeton autoportant. Se
 *    déconnecter, ou révoquer l'accès de quelqu'un, supprime la ligne et l'accès
 *    cesse à l'instant. Un jeton signé resterait valable jusqu'à son expiration.
 * 3. **Le cookie contient le jeton, la base n'en garde que l'empreinte.** Lire
 *    la table des sessions ne permet donc pas de se faire passer pour un
 *    utilisateur.
 */

const COOKIE = 'km_session';
const DUREE_SESSION = 1000 * 60 * 60 * 24 * 14;
const ESSAIS_AVANT_BLOCAGE = 8;
const DUREE_BLOCAGE = 1000 * 60 * 10;

export type Utilisateur = {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  /** Le fichier de la photo dans `medias/`, ou `null` : alors les initiales. */
  avatar: string | null;
  role: 'administrateur' | 'editeur';
};

/** Prénom et nom réunis, pour les écrans qui présentent quelqu'un à quelqu'un. */
export function nomComplet(u: { prenom: string; nom: string }) {
  return [u.prenom, u.nom].filter(Boolean).join(' ');
}

/** Une ou deux lettres, quand il n'y a pas de photo. */
export function initiales(u: { prenom: string; nom: string }) {
  const lettres = [u.prenom[0], u.nom[0]].filter(Boolean).join('');
  return (lettres || u.prenom[0] || '?').toUpperCase();
}

type LigneUtilisateur = Utilisateur & {
  empreinte: string;
  sel: string;
  essais_rates: number;
  bloque_jusqua: Date | null;
};

// ————————————————————————— Mots de passe —————————————————————————

async function empreinteDe(motDePasse: string, sel: string) {
  const brut = (await scryptAsync(motDePasse.normalize('NFKC'), sel, 64)) as Buffer;
  return brut.toString('hex');
}

export async function chiffrerMotDePasse(motDePasse: string) {
  const sel = randomBytes(16).toString('hex');
  return { sel, empreinte: await empreinteDe(motDePasse, sel) };
}

/**
 * Comparaison à durée constante : une comparaison ordinaire s'arrête au premier
 * caractère différent, et ce délai suffit à deviner l'empreinte octet par octet.
 */
async function motDePasseValide(motDePasse: string, empreinte: string, sel: string) {
  const candidat = Buffer.from(await empreinteDe(motDePasse, sel), 'hex');
  const attendu = Buffer.from(empreinte, 'hex');
  if (candidat.length !== attendu.length) return false;
  return timingSafeEqual(candidat, attendu);
}

/** Au moins douze caractères. La longueur protège mieux que les caractères exotiques. */
export function motDePasseAcceptable(motDePasse: string) {
  if (motDePasse.length < 12) return 'Douze caractères au minimum.';
  if (motDePasse.length > 200) return 'Deux cents caractères au maximum.';
  return null;
}

// —————————————————————————— Sessions ——————————————————————————

const empreinteJeton = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

async function ouvrirSession(utilisateurId: number, agent?: string) {
  const jeton = randomBytes(32).toString('base64url');
  const expire = new Date(Date.now() + DUREE_SESSION);

  await requete(
    'INSERT INTO sessions (empreinte_jeton, utilisateur_id, expire_le, agent) VALUES (?, ?, ?, ?)',
    [empreinteJeton(jeton), utilisateurId, expire, agent?.slice(0, 300) ?? null],
  );

  const boite = await cookies();
  boite.set(COOKIE, jeton, {
    httpOnly: true, // hors de portée de tout JavaScript, donc d'un vol par script injecté
    sameSite: 'lax', // le cookie ne part pas sur une requête déclenchée par un autre site
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expire,
  });

  return jeton;
}

/** L'utilisateur connecté, ou `null`. Seule porte d'entrée vers l'identité. */
export async function utilisateurConnecte(): Promise<Utilisateur | null> {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return null;

  const trouve = await ligne<Utilisateur & { expire_le: Date }>(
    `SELECT u.id, u.prenom, u.nom, u.email, u.avatar, u.role, s.expire_le
       FROM sessions s
       JOIN utilisateurs u ON u.id = s.utilisateur_id
      WHERE s.empreinte_jeton = ? AND s.expire_le > now()`,
    [empreinteJeton(jeton)],
  );
  if (!trouve) return null;

  return {
    id: trouve.id,
    prenom: trouve.prenom,
    nom: trouve.nom,
    email: trouve.email,
    avatar: trouve.avatar,
    role: trouve.role,
  };
}

export async function fermerSession() {
  const boite = await cookies();
  const jeton = boite.get(COOKIE)?.value;
  if (jeton) {
    await requete('DELETE FROM sessions WHERE empreinte_jeton = ?', [empreinteJeton(jeton)]);
  }
  boite.delete(COOKIE);
}

// —————————————————————————— Connexion ——————————————————————————

export type ResultatConnexion =
  | { ok: true; utilisateur: Utilisateur }
  | { ok: false; message: string };

export async function connecter(
  email: string,
  motDePasse: string,
  agent?: string,
): Promise<ResultatConnexion> {
  const compte = await ligne<LigneUtilisateur>(
    'SELECT * FROM utilisateurs WHERE email = ?',
    [email.trim().toLowerCase()],
  );

  // Message unique, que le compte existe ou non : le distinguer permettrait de
  // découvrir quelles adresses sont enregistrées.
  const refus = { ok: false as const, message: 'Adresse ou mot de passe incorrect.' };

  if (!compte) {
    // On calcule quand même une empreinte, pour que la réponse mette le même
    // temps qu'avec un compte existant.
    await empreinteDe(motDePasse, 'sel-de-temporisation');
    return refus;
  }

  if (compte.bloque_jusqua && compte.bloque_jusqua > new Date()) {
    const minutes = Math.ceil((compte.bloque_jusqua.getTime() - Date.now()) / 60000);
    return { ok: false, message: `Trop d’essais. Réessayez dans ${minutes} minute(s).` };
  }

  if (!(await motDePasseValide(motDePasse, compte.empreinte, compte.sel))) {
    const essais = compte.essais_rates + 1;
    const bloque = essais >= ESSAIS_AVANT_BLOCAGE ? new Date(Date.now() + DUREE_BLOCAGE) : null;
    await requete(
      'UPDATE utilisateurs SET essais_rates = ?, bloque_jusqua = ? WHERE id = ?',
      [bloque ? 0 : essais, bloque, compte.id],
    );
    return refus;
  }

  await requete('UPDATE utilisateurs SET essais_rates = 0, bloque_jusqua = NULL WHERE id = ?', [
    compte.id,
  ]);
  await ouvrirSession(compte.id, agent);

  return {
    ok: true,
    utilisateur: {
      id: compte.id,
      prenom: compte.prenom,
      nom: compte.nom,
      email: compte.email,
      avatar: compte.avatar,
      role: compte.role,
    },
  };
}

// ———————————————————————————— Comptes ————————————————————————————

export async function aucunCompte() {
  const r = await ligne<{ n: number }>('SELECT count(*) AS n FROM utilisateurs');
  return Number(r?.n ?? 0) === 0;
}

export async function creerCompte(donnees: {
  nom: string;
  email: string;
  motDePasse: string;
  role?: 'administrateur' | 'editeur';
}) {
  const { sel, empreinte } = await chiffrerMotDePasse(donnees.motDePasse);
  // Le tout premier compte est forcément administrateur : sans lui, personne ne
  // pourrait jamais en créer un second.
  const role = (await aucunCompte()) ? 'administrateur' : (donnees.role ?? 'editeur');

  // Le formulaire de création ne demande qu'un nom : on le coupe au premier
  // espace, et l'intéressé corrigera lui-même dans Mon compte s'il le faut.
  const entier = donnees.nom.trim();
  const espace = entier.indexOf(' ');
  const prenom = espace > 0 ? entier.slice(0, espace) : entier;
  const nom = espace > 0 ? entier.slice(espace + 1).trim() : '';

  const { insertId } = await ecrire(
    `INSERT INTO utilisateurs (prenom, nom, email, empreinte, sel, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [prenom, nom, donnees.email.trim().toLowerCase(), empreinte, sel, role],
  );

  return ligne<Utilisateur>(
    'SELECT id, prenom, nom, email, avatar, role FROM utilisateurs WHERE id = ?',
    [insertId],
  );
}

/** Purge les sessions expirées. Appelée à la connexion, c'est bien assez souvent. */
export async function nettoyerSessions() {
  await requete('DELETE FROM sessions WHERE expire_le < now()');
}

// ——————————————————————— Gestion des comptes ———————————————————————

export type UtilisateurListe = Utilisateur & {
  creeLe: Date;
  derniereConnexion: Date | null;
  sessions: number;
};

export async function listerUtilisateurs(): Promise<UtilisateurListe[]> {
  const lignes = await requete<{
    id: number;
    prenom: string;
    nom: string;
    email: string;
    avatar: string | null;
    role: 'administrateur' | 'editeur';
    cree_le: Date;
    derniere: Date | null;
    sessions: number | string | null;
  }>(
    `SELECT u.id, u.prenom, u.nom, u.email, u.avatar, u.role, u.cree_le,
            max(s.vue_le) AS derniere,
            SUM(CASE WHEN s.expire_le > now() THEN 1 ELSE 0 END) AS sessions
       FROM utilisateurs u
       LEFT JOIN sessions s ON s.utilisateur_id = u.id
      GROUP BY u.id
      ORDER BY u.role, u.prenom, u.nom`,
  );

  return lignes.map((l) => ({
    id: l.id,
    prenom: l.prenom,
    nom: l.nom,
    email: l.email,
    avatar: l.avatar,
    role: l.role,
    creeLe: l.cree_le,
    derniereConnexion: l.derniere,
    sessions: Number(l.sessions ?? 0),
  }));
}

export async function compterAdministrateurs() {
  const r = await ligne<{ n: number }>(
    `SELECT count(*) AS n FROM utilisateurs WHERE role = 'administrateur'`,
  );
  return Number(r?.n ?? 0);
}

/**
 * Le dernier administrateur ne peut être ni rétrogradé, ni supprimé.
 *
 * Sans ce verrou, un clic malheureux fermerait le BackOffice à tout le monde,
 * définitivement : plus personne n'aurait le droit de créer un compte, et il
 * faudrait intervenir directement en base pour rouvrir la porte.
 */
async function estDernierAdministrateur(id: number) {
  const compte = await ligne<{ role: string }>('SELECT role FROM utilisateurs WHERE id = ?', [id]);
  if (compte?.role !== 'administrateur') return false;
  return (await compterAdministrateurs()) <= 1;
}

export async function changerRole(id: number, role: 'administrateur' | 'editeur') {
  if (role === 'editeur' && (await estDernierAdministrateur(id))) {
    return { erreur: 'C’est le dernier administrateur. Nommez-en un autre avant de le rétrograder.' };
  }
  await requete('UPDATE utilisateurs SET role = ?, modifie_le = now() WHERE id = ?', [role, id]);
  return {};
}

export async function supprimerUtilisateur(id: number) {
  if (await estDernierAdministrateur(id)) {
    return { erreur: 'C’est le dernier administrateur. Le supprimer fermerait le BackOffice à tout le monde.' };
  }
  // Les sessions partent avec le compte, par cascade : l'accès cesse à l'instant.
  await requete('DELETE FROM utilisateurs WHERE id = ?', [id]);
  return {};
}

/**
 * Change un mot de passe et referme les autres sessions.
 *
 * Changer son mot de passe sans déconnecter les autres appareils ne sert à
 * rien : si quelqu'un était entré, il y serait encore.
 */
export async function changerMotDePasse(
  id: number,
  nouveau: string,
  options?: { garderSessionCourante?: boolean },
) {
  const { sel, empreinte } = await chiffrerMotDePasse(nouveau);
  await requete(
    'UPDATE utilisateurs SET empreinte = ?, sel = ?, essais_rates = 0, bloque_jusqua = NULL, modifie_le = now() WHERE id = ?',
    [id, empreinte, sel],
  );

  const jetonCourant = options?.garderSessionCourante
    ? (await cookies()).get(COOKIE)?.value
    : null;

  if (jetonCourant) {
    await requete('DELETE FROM sessions WHERE utilisateur_id = ? AND empreinte_jeton <> ?', [
      id,
      empreinteJeton(jetonCourant),
    ]);
  } else {
    await requete('DELETE FROM sessions WHERE utilisateur_id = ?', [id]);
  }
}

/** Vérifie un mot de passe sans ouvrir de session. Pour confirmer une action sensible. */
export async function motDePasseCorrect(id: number, motDePasse: string) {
  const compte = await ligne<{ empreinte: string; sel: string }>(
    'SELECT empreinte, sel FROM utilisateurs WHERE id = ?',
    [id],
  );
  if (!compte) return false;
  return motDePasseValide(motDePasse, compte.empreinte, compte.sel);
}

export async function fermerAutresSessions(id: number) {
  const jeton = (await cookies()).get(COOKIE)?.value;
  if (!jeton) return;
  await requete('DELETE FROM sessions WHERE utilisateur_id = ? AND empreinte_jeton <> ?', [
    id,
    empreinteJeton(jeton),
  ]);
}

// ————————————————————————————— Le profil —————————————————————————————

/**
 * Prénom et nom.
 *
 * Le compte ne les portait que de sa création : il fallait m'écrire pour
 * corriger une faute sur son propre nom. C'est le genre de dépendance que ce
 * BackOffice existe pour supprimer.
 */
export async function majProfil(id: number, d: { prenom: string; nom: string }) {
  await requete(
    'UPDATE utilisateurs SET prenom = ?, nom = ?, modifie_le = now() WHERE id = ?',
    [d.prenom.trim(), d.nom.trim(), id],
  );
}

/**
 * Change l'adresse de connexion.
 *
 * C'est l'identifiant du compte : l'appelant redemande le mot de passe avant,
 * sans quoi une session laissée ouverte sur un poste partagé suffirait à
 * s'approprier le compte en remplaçant l'adresse par la sienne.
 *
 * L'unicité est tenue par la base, pas ici : deux enregistrements simultanés
 * passeraient entre les mailles d'une vérification faite en amont.
 */
export async function majEmail(id: number, email: string) {
  await requete('UPDATE utilisateurs SET email = ?, modifie_le = now() WHERE id = ?', [
    email.trim().toLowerCase(),
    id,
  ]);
}

/** Pose la photo, et rend celle qu'elle remplace pour que l'appelant l'efface. */
export async function majAvatar(id: number, avatar: string | null) {
  const avant = await ligne<{ avatar: string | null }>(
    'SELECT avatar FROM utilisateurs WHERE id = ?',
    [id],
  );
  await requete('UPDATE utilisateurs SET avatar = ?, modifie_le = now() WHERE id = ?', [
    avatar,
    id,
  ]);
  return avant?.avatar ?? null;
}
