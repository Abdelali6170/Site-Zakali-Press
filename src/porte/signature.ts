/**
 * src/porte/signature.ts
 * Zakali Press — l'adresse signee vers le site de fichiers.
 *
 * Le site de fichiers ne connait ni l'index ni les droits : il sert ce que le
 * site a signe, et rien d'autre. La signature couvre trois choses, et le
 * script `fichiers/porte.php` recompose exactement le meme message :
 *
 *   <adresse d'index> \n <expiration> \n <nom de telechargement, ou vide>
 *
 * L'adresse signee est l'adresse d'index elle-meme (regle 4.2) : c'est aussi
 * la clef du fichier sur le site de fichiers. Le nom est signe parce qu'il
 * decide de l'en-tete `Content-Disposition` : sans cela, n'importe qui
 * pourrait le changer dans une adresse partagee.
 */

import { createHmac } from 'node:crypto';

/** HMAC-SHA256, en hexadecimal minuscule — ce que `hash_hmac` rend en PHP. */
export function signer(secret: string, adresse: string, expiration: number, nom?: string): string {
  return createHmac('sha256', secret)
    .update(`${adresse}\n${expiration}\n${nom ?? ''}`)
    .digest('hex');
}

/**
 * `<base>/<adresse>?e=<expiration>&s=<signature>[&n=<nom>]`
 *
 * Chaque segment de l'adresse est encode a part : la forme de chemin survit,
 * et un caractere reserve d'un nom de fichier ne devient pas un separateur.
 */
export function adresseSignee(
  base: string,
  secret: string,
  adresse: string,
  { duree, nom, maintenant = Date.now() }: { duree: number; nom?: string; maintenant?: number },
): string {
  const expiration = Math.floor(maintenant / 1000) + duree;
  const parametres = new URLSearchParams({ e: String(expiration), s: signer(secret, adresse, expiration, nom) });
  if (nom) parametres.set('n', nom);
  const chemin = adresse.split('/').map(encodeURIComponent).join('/');
  return `${base}/${chemin}?${parametres}`;
}
