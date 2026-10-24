/**
 * src/porte/types-de-contenu.ts
 * Zakali Press — le type de contenu d'un fichier d'ouvrage, par son extension.
 *
 * `fichiers/porte.php` porte la meme table : un test verifie qu'elles
 * s'accordent. Une video servie en `application/octet-stream` ne se lit pas.
 */

import path from 'node:path';

export const TYPES_DE_CONTENU: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

export function typeDeContenu(fichier: string): string {
  return TYPES_DE_CONTENU[path.extname(fichier).toLowerCase()] ?? 'application/octet-stream';
}
