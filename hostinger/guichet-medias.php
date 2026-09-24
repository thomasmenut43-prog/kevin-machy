<?php
/**
 * Le guichet des images, chez Hostinger.
 *
 * Le BackOffice tourne ailleurs — sur Cloudflare, qui n'a pas de disque. Les
 * photographies, elles, restent ici : l'abonnement de Kevin offre cent
 * gigaoctets déjà payés, Apache sert un fichier figé mieux qu'un Worker ne le
 * relaierait, et chaque image servie ici n'entame pas les cent mille requêtes
 * quotidiennes offertes par Cloudflare.
 *
 * Ce fichier ne sait qu'écrire, effacer et copier. **Il ne sait pas lire** :
 * les images sont servies par Apache, directement, et ce guichet n'a donc
 * aucune raison de renvoyer quoi que ce soit. C'est autant de surface en
 * moins.
 *
 * Il se pose à la racine du sous-domaine, à côté des images. Le nom de
 * fichier étant contraint à vingt-quatre caractères hexadécimaux, aucune
 * requête ne peut le viser lui-même.
 *
 *   POST ?action=poser&nom=<nom>     corps = les octets
 *   POST ?action=effacer&nom=<nom>
 *   POST ?action=copier&de=<nom>&vers=<nom>
 *
 * Toutes exigent l'en-tête `X-Jeton`.
 */

declare(strict_types=1);

/** Vingt-cinq mégaoctets, comme la médiathèque. */
const OCTETS_MAX = 26214400;

/**
 * La même forme de nom que partout ailleurs : vingt-quatre caractères
 * hexadécimaux, éventuellement une largeur, et `.webp`. Rien d'autre ne passe,
 * ce qui rend toute remontée de dossier impossible par construction.
 */
const NOM_VALIDE = '/^[a-f0-9]{24}(?:-\d{3,4})?\.webp$/';

/**
 * Le secret vit **hors de tout dossier servi par Apache**.
 *
 * Posé à côté des images, il serait téléchargeable par n'importe qui, et le
 * guichet ouvert à tous les vents. Un cran au-dessus ne suffit pas non plus :
 * la racine du sous-domaine étant `public_html/medias`, ce cran-là est
 * `public_html`, que le site principal sert. Il en faut donc deux.
 *
 *   /home/…/domains/dronezvous.com/jeton-medias.txt   ← ici, hors d'atteinte
 *   /home/…/domains/dronezvous.com/public_html/       ← servi par dronezvous.com
 *   /home/…/domains/dronezvous.com/public_html/medias/ ← servi par medias.…, et c'est __DIR__
 *
 * Si la racine du sous-domaine change un jour, cette ligne change avec elle —
 * et on vérifie en demandant le fichier à Apache, qui doit répondre 404.
 */
const FICHIER_JETON = __DIR__ . '/../../jeton-medias.txt';

function repondre(int $code, array $corps): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($corps, JSON_UNESCAPED_UNICODE);
    exit;
}

// ————————————————————————————— Le jeton —————————————————————————————

if (!is_readable(FICHIER_JETON)) {
    // Sans secret, on n'ouvre rien. Répondre « mal configuré » plutôt que
    // laisser passer est la seule attitude tenable pour une porte d'entrée.
    repondre(503, ['ok' => false, 'message' => 'Guichet non configuré.']);
}

$attendu = trim((string) file_get_contents(FICHIER_JETON));
$presente = (string) ($_SERVER['HTTP_X_JETON'] ?? '');

// `hash_equals` compare en temps constant : une comparaison ordinaire
// s'arrête au premier caractère différent, et ce temps-là se mesure.
if ($attendu === '' || !hash_equals($attendu, $presente)) {
    repondre(401, ['ok' => false, 'message' => 'Jeton refusé.']);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    repondre(405, ['ok' => false, 'message' => 'POST uniquement.']);
}

// ————————————————————————————— Les noms —————————————————————————————

/** Deux verrous : la forme, puis `basename`. Un seul suffirait, deux se valent mieux. */
function chemin(string $nom): string
{
    if (!preg_match(NOM_VALIDE, $nom) || basename($nom) !== $nom) {
        repondre(400, ['ok' => false, 'message' => 'Nom de fichier refusé.']);
    }
    return __DIR__ . '/' . $nom;
}

$action = (string) ($_GET['action'] ?? '');

// ————————————————————————————— Les gestes —————————————————————————————

if ($action === 'poser') {
    $cible = chemin((string) ($_GET['nom'] ?? ''));

    /**
     * Le corps arrive **en base64**, et ce n'est pas un caprice.
     *
     * Un pare-feu applicatif inspecte les corps de requête sur cet
     * hébergement, et refuse certaines suites d'octets — la même image passe
     * ou non selon son contenu, sans rapport avec sa taille. Le constat est
     * net : un WebP brut de dix kilooctets repart en 403 avant même
     * d'atteindre PHP, le même encodé en base64 arrive sans encombre.
     *
     * L'encodage coûte un tiers de poids en plus. C'est le prix d'un envoi
     * qui aboutit à tous les coups plutôt qu'au hasard du contenu.
     */
    $encode = (string) file_get_contents('php://input');
    if ($encode === '') {
        repondre(400, ['ok' => false, 'message' => 'Corps vide.']);
    }
    // Le plafond s'applique au corps reçu, base64 comprise : refuser tôt évite
    // de décoder pour rien.
    if (strlen($encode) > OCTETS_MAX * 4 / 3 + 1024) {
        repondre(413, ['ok' => false, 'message' => 'Fichier trop lourd.']);
    }

    $octets = base64_decode($encode, true);
    if ($octets === false) {
        repondre(400, ['ok' => false, 'message' => 'Corps illisible : base64 attendue.']);
    }
    if (strlen($octets) > OCTETS_MAX) {
        repondre(413, ['ok' => false, 'message' => 'Fichier trop lourd.']);
    }

    // Un WebP commence par « RIFF », quatre octets de longueur, puis « WEBP ».
    // Le BackOffice vérifie déjà, mais ce guichet est joignable depuis
    // Internet : il ne se repose pas sur un contrôle fait ailleurs.
    if (strlen($octets) < 12
        || substr($octets, 0, 4) !== 'RIFF'
        || substr($octets, 8, 4) !== 'WEBP') {
        repondre(400, ['ok' => false, 'message' => 'Ce ne sont pas des octets WebP.']);
    }

    // Écriture par un fichier temporaire puis renommage : un envoi interrompu
    // ne laisse jamais une image à moitié écrite que le site afficherait
    // cassée.
    $provisoire = $cible . '.partiel';
    if (file_put_contents($provisoire, $octets, LOCK_EX) === false
        || !rename($provisoire, $cible)) {
        @unlink($provisoire);
        repondre(500, ['ok' => false, 'message' => 'Écriture impossible.']);
    }

    repondre(200, ['ok' => true, 'octets' => strlen($octets)]);
}

if ($action === 'effacer') {
    $cible = chemin((string) ($_GET['nom'] ?? ''));
    // Effacer ce qui n'existe pas n'est pas une erreur : la suppression d'un
    // média rejoue parfois sur des fichiers déjà partis.
    if (is_file($cible)) {
        @unlink($cible);
    }
    repondre(200, ['ok' => true]);
}

if ($action === 'copier') {
    $de = chemin((string) ($_GET['de'] ?? ''));
    $vers = chemin((string) ($_GET['vers'] ?? ''));

    if (!is_file($de)) {
        // Le BackOffice laisse passer une copie sans source : dupliquer un
        // dossier dont une image manque ne doit pas tout arrêter.
        repondre(200, ['ok' => true, 'copie' => false]);
    }
    if (!copy($de, $vers)) {
        repondre(500, ['ok' => false, 'message' => 'Copie impossible.']);
    }
    repondre(200, ['ok' => true, 'copie' => true]);
}

repondre(400, ['ok' => false, 'message' => 'Action inconnue.']);
