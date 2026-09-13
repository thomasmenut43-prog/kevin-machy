import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Chiffrement des secrets enregistrés en base.
 *
 * Un mot de passe SMTP n'est pas un mot de passe de connexion : il doit être
 * **relu en clair** pour ouvrir la session avec le serveur d'envoi. On ne peut
 * donc pas se contenter d'une empreinte, comme pour les comptes.
 *
 * D'où AES-256-GCM, avec un vecteur d'initialisation tiré au hasard à chaque
 * écriture et une étiquette d'authentification. Le GCM ne fait pas que cacher :
 * il détecte aussi la modification. Une valeur retouchée directement en base ne
 * se déchiffre pas, elle échoue.
 *
 * La clé vit dans l'environnement du serveur, jamais en base. Voler la
 * sauvegarde ne suffit donc pas à lire le mot de passe.
 */

function cle() {
  const brute = process.env.CLE_CHIFFREMENT;
  if (!brute) throw new Error('CLE_CHIFFREMENT est absente. Voir .env.exemple.');

  const octets = Buffer.from(brute, 'hex');
  if (octets.length !== 32) {
    throw new Error('CLE_CHIFFREMENT doit faire 64 caractères hexadécimaux, soit 32 octets.');
  }
  return octets;
}

/** Renvoie `iv:etiquette:chiffre`, tout en hexadécimal. */
export function chiffrer(clair: string): string {
  const iv = randomBytes(12);
  const chiffreur = createCipheriv('aes-256-gcm', cle(), iv);
  const chiffre = Buffer.concat([chiffreur.update(clair, 'utf8'), chiffreur.final()]);

  return [iv.toString('hex'), chiffreur.getAuthTag().toString('hex'), chiffre.toString('hex')].join(':');
}

/** `null` si la valeur est absente, mal formée, ou a été altérée. */
export function dechiffrer(stocke: string | null | undefined): string | null {
  if (!stocke) return null;

  const [iv, etiquette, chiffre] = stocke.split(':');
  if (!iv || !etiquette || !chiffre) return null;

  try {
    const dechiffreur = createDecipheriv('aes-256-gcm', cle(), Buffer.from(iv, 'hex'));
    dechiffreur.setAuthTag(Buffer.from(etiquette, 'hex'));
    return Buffer.concat([
      dechiffreur.update(Buffer.from(chiffre, 'hex')),
      dechiffreur.final(),
    ]).toString('utf8');
  } catch {
    // Clé changée, ou valeur retouchée. Dans les deux cas, il n'y a rien à lire.
    return null;
  }
}
