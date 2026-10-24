<?php
/**
 * fichiers/porte.php
 * Zakali Press — la porte du site de fichiers.
 *
 * Deploye A LA MAIN dans le public_html du site de fichiers, avec le
 * `.htaccess` voisin qui lui envoie toute requete. Voir fichiers/LISEZMOI.md.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  CE SCRIPT NE DECIDE D'AUCUN DROIT. IL SERT CE QUE LE SITE A SIGNE.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le droit de lire se decide sur le site, contre l'index (regles 4.1 et 5.4).
 * Ici, une seule question : cette adresse porte-t-elle une signature valide et
 * non expiree ? La signature couvre l'adresse, l'expiration et le nom de
 * telechargement — le meme message que `src/porte/signature.ts` :
 *
 *     <adresse d'index> \n <expiration> \n <nom, ou vide>
 *
 * L'adresse d'index est aussi la place du fichier sous le dossier des livres
 * (regle 4.2). Ce dossier vit HORS de public_html : aucune adresse ne
 * l'atteint sans passer par ce script.
 *
 * Le chemin est verifie DEUX fois, independamment de la signature : aucun
 * segment `.` ou `..`, et le fichier reel doit se trouver sous le dossier des
 * livres. Un secret divulgue ne suffirait donc pas a lire le reste du disque.
 *
 * Les fichiers sont lus par morceaux par PHP. L'en-tete X-LiteSpeed-Location,
 * qui laisserait LiteSpeed servir lui-meme, designe une ADRESSE web — une
 * redirection interne — et non un chemin de disque : il obligerait a rendre
 * les livres adressables sous public_html, ce que cette porte refuse
 * justement.
 */

declare(strict_types=1);

/** La meme table que src/porte/types-de-contenu.ts — un test les compare. */
const TYPES = [
    '.html' => 'text/html; charset=utf-8',
    '.css' => 'text/css; charset=utf-8',
    '.js' => 'text/javascript; charset=utf-8',
    '.mjs' => 'text/javascript; charset=utf-8',
    '.json' => 'application/json; charset=utf-8',
    '.txt' => 'text/plain; charset=utf-8',
    '.svg' => 'image/svg+xml',
    '.png' => 'image/png',
    '.jpg' => 'image/jpeg',
    '.jpeg' => 'image/jpeg',
    '.gif' => 'image/gif',
    '.webp' => 'image/webp',
    '.ico' => 'image/x-icon',
    '.mp4' => 'video/mp4',
    '.webm' => 'video/webm',
    '.mp3' => 'audio/mpeg',
    '.pdf' => 'application/pdf',
    '.woff' => 'font/woff',
    '.woff2' => 'font/woff2',
    '.ttf' => 'font/ttf',
    '.otf' => 'font/otf',
];

/** Un mega-octet par lecture : assez pour le debit, peu pour la memoire. */
const MORCEAU = 1048576;

function terminer(int $statut, string $message): never
{
    http_response_code($statut);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    echo $message;
    exit;
}

/**
 * La configuration vit HORS de public_html, a cote du dossier des livres, et
 * jamais dans le depot : elle porte le secret partage.
 */
function configuration(): array
{
    $fichier = getenv('ZAKALI_FICHIERS_CONFIG') ?: dirname(__DIR__) . '/zakali-fichiers.config.php';
    if (!is_file($fichier)) terminer(503, 'Site de fichiers non configure.');
    $config = require $fichier;
    if (!is_array($config) || strlen((string) ($config['secret'] ?? '')) < 32 || !is_dir((string) ($config['livres'] ?? ''))) {
        terminer(503, 'Site de fichiers mal configure.');
    }
    return $config;
}

/** L'adresse demandee, segment par segment, ou `null` si elle est douteuse. */
function adresseDemandee(): ?string
{
    $chemin = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (!is_string($chemin)) return null;
    $segments = array_map('rawurldecode', explode('/', ltrim($chemin, '/')));
    foreach ($segments as $segment) {
        if ($segment === '' || $segment === '.' || $segment === '..') return null;
        if (strpbrk($segment, "/\\\0") !== false) return null;
    }
    return implode('/', $segments);
}

/** `bytes=a-b`, `bytes=a-`, `bytes=-n`. Une plage illisible vaut fichier entier. */
function plageDemandee(?string $entete, int $taille): ?array
{
    if (!$entete || !preg_match('/^bytes=(\d*)-(\d*)$/', trim($entete), $m) || ($m[1] === '' && $m[2] === '')) {
        return null;
    }
    if ($m[1] === '') {
        $suffixe = min((int) $m[2], $taille);
        return [$taille - $suffixe, $taille - 1];
    }
    $debut = (int) $m[1];
    $fin = $m[2] === '' ? $taille - 1 : min((int) $m[2], $taille - 1);
    return [$debut, $fin];
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($methode !== 'GET' && $methode !== 'HEAD') {
    header('Allow: GET, HEAD');
    terminer(405, 'Methode non admise.');
}

// Rien de ce site ne doit apparaitre dans un moteur de recherche.
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

$config = configuration();
$adresse = adresseDemandee();
$expiration = $_GET['e'] ?? '';
$signature = $_GET['s'] ?? '';
$nom = $_GET['n'] ?? '';

if ($adresse === null) terminer(403, 'Refuse.');
if (!is_string($expiration) || !ctype_digit($expiration) || !is_string($signature) || !is_string($nom)) {
    terminer(403, 'Refuse.');
}
if ((int) $expiration < time()) terminer(403, 'Adresse expiree.');

$attendue = hash_hmac('sha256', $adresse . "\n" . $expiration . "\n" . $nom, (string) $config['secret']);
if (!hash_equals($attendue, $signature)) terminer(403, 'Refuse.');

// Le fichier reel doit vivre sous le dossier des livres — liens symboliques
// compris, que `realpath` resout.
$racine = realpath((string) $config['livres']);
$fichier = realpath($racine . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $adresse));
if ($fichier === false || !is_file($fichier)) terminer(404, 'Introuvable.');
if (strpos($fichier, $racine . DIRECTORY_SEPARATOR) !== 0) terminer(403, 'Refuse.');

$taille = filesize($fichier);
$extension = strtolower('.' . pathinfo($fichier, PATHINFO_EXTENSION));

header('Content-Type: ' . (TYPES[$extension] ?? 'application/octet-stream'));
header('Accept-Ranges: bytes');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', (int) filemtime($fichier)) . ' GMT');
// Jamais au-dela de la signature, ni d'une heure (regle 5.7).
header('Cache-Control: private, max-age=' . max(0, min((int) $expiration - time(), 3600)));
if ($nom !== '') {
    $ascii = str_replace(['"', '\\'], '_', preg_replace('/[^\x20-\x7e]/', '', $nom));
    header("Content-Disposition: attachment; filename=\"$ascii\"; filename*=UTF-8''" . rawurlencode($nom));
}

$plage = plageDemandee($_SERVER['HTTP_RANGE'] ?? null, $taille);
if ($plage !== null && ($plage[0] > $plage[1] || $plage[0] >= $taille)) {
    header("Content-Range: bytes */$taille");
    terminer(416, 'Plage hors du fichier.');
}
[$debut, $fin] = $plage ?? [0, $taille - 1];

http_response_code($plage !== null ? 206 : 200);
header('Content-Length: ' . ($fin - $debut + 1));
if ($plage !== null) header("Content-Range: bytes $debut-$fin/$taille");
if ($methode === 'HEAD' || $taille === 0) exit;

// Le fichier part tel quel, sans tampon ni compression, et sans limite de
// duree : un PDF de 70 Mo sur une ligne lente depasse les 30 s par defaut.
@ini_set('zlib.output_compression', 'Off');
while (ob_get_level() > 0) ob_end_clean();
set_time_limit(0);

$flux = fopen($fichier, 'rb');
if ($flux === false) exit;
fseek($flux, $debut);
$reste = $fin - $debut + 1;
while ($reste > 0 && !feof($flux) && !connection_aborted()) {
    $octets = fread($flux, min(MORCEAU, $reste));
    if ($octets === false || $octets === '') break;
    echo $octets;
    flush();
    $reste -= strlen($octets);
}
fclose($flux);
