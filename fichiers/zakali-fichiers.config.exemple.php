<?php
/**
 * Zakali Press — configuration du site de fichiers. GABARIT, SANS VALEURS.
 *
 * Copier sur le serveur sous le nom `zakali-fichiers.config.php`, A COTE de
 * public_html et non dedans — porte.php le cherche dans le dossier parent du
 * sien. Le vrai fichier n'entre JAMAIS dans le depot : il porte le secret.
 */

return [
    // Le meme secret que FICHIERS_SECRET dans les variables de la Web App.
    // Generer : node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
    'secret' => '',

    // Le dossier des livres, HORS de public_html. Ce fichier est pose a cote
    // de lui : il le designe depuis son propre dossier, sans chemin absolu a
    // recopier — le gestionnaire de fichiers de Hostinger ne le montre pas.
    'livres' => __DIR__ . '/livres',
];
