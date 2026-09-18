import 'server-only';
import { ligne, poserReglage } from './bdd';
import { chiffrer, dechiffrer } from './secret';

/**
 * Les services extérieurs branchés au site.
 *
 * Trois pour l'instant, et un seul utilisable : les avis Google. Stripe et
 * SumUp encaissent des paiements — ils n'ont rien à faire ici tant que la
 * boutique n'existe pas, et ils sont donc présents mais fermés, comme l'onglet
 * Boutique du menu.
 *
 * Les deux ne peuvent pas cohabiter : deux systèmes d'encaissement sur un même
 * site, c'est une commande payée deux fois ou perdue entre les deux.
 */

const CLE = 'integrations';

export type Paiement = 'stripe' | 'sumup' | null;

type Enregistre = {
  google?: { placeId: string; cle: string | null; connecteLe: string } | null;
  paiement?: Paiement;
};

/** Ce que l'écran a le droit de voir : jamais la clef, seulement son existence. */
export type IntegrationsAffichables = {
  google: { connecte: boolean; placeId: string; connecteLe: string | null };
  paiement: Paiement;
  /** La boutique n'existe pas encore : les encaissements restent fermés. */
  boutiqueActive: boolean;
};

async function lire(): Promise<Enregistre> {
  const l = await ligne<{ valeur: Enregistre }>('SELECT valeur FROM reglages WHERE cle = ?', [CLE]);
  return l?.valeur ?? {};
}

async function ecrire(valeur: Enregistre) {
  await poserReglage(CLE, valeur);
}

export async function lireIntegrations(): Promise<IntegrationsAffichables> {
  const v = await lire();
  return {
    google: {
      connecte: Boolean(v.google?.cle),
      placeId: v.google?.placeId ?? '',
      connecteLe: v.google?.connecteLe ?? null,
    },
    paiement: v.paiement ?? null,
    boutiqueActive: false,
  };
}

/**
 * Branche les avis Google.
 *
 * La clef d'API est chiffrée avant d'entrer en base, comme le mot de passe
 * d'envoi : une sauvegarde qui fuite ne doit pas donner l'accès au compte
 * Google de Kevin. Elle ne ressort jamais vers l'écran.
 */
export async function connecterGoogle(placeId: string, cle: string) {
  const identifiant = placeId.trim().slice(0, 120);
  const secret = cle.trim();

  if (!identifiant) return { erreur: 'L’identifiant de la fiche Google est obligatoire.' };
  if (!secret) return { erreur: 'La clef d’API est obligatoire.' };

  const v = await lire();
  await ecrire({
    ...v,
    google: { placeId: identifiant, cle: chiffrer(secret), connecteLe: new Date().toISOString() },
  });
  return {};
}

export async function deconnecterGoogle() {
  const v = await lire();
  await ecrire({ ...v, google: null });
}

/** La clef en clair, pour le serveur seul, quand il ira chercher les avis. */
export async function clefGoogle() {
  const v = await lire();
  return v.google?.cle ? { placeId: v.google.placeId, cle: dechiffrer(v.google.cle) } : null;
}

/**
 * Choisit l'encaisseur. L'un chasse l'autre, par construction : le champ ne
 * peut contenir qu'une valeur, donc les deux ne peuvent pas être actifs.
 */
export async function choisirPaiement(paiement: Paiement) {
  const v = await lire();
  await ecrire({ ...v, paiement });
}
