/**
 * src/porte/stockage.ts
 * Zakali Press — ou la porte va chercher les fichiers d'ouvrage.
 *
 * Deux modes, choisis par la configuration et par rien d'autre :
 *
 *   - LOCAL — sur le poste, ou vit le quai. Aucune variable `FICHIERS_*`.
 *   - DISTANT — en ligne. Le serveur du site n'a pas de quai (regle 10.1) :
 *     les livres vivent sur le SITE DE FICHIERS, qui ne sert que ce que le
 *     site a signe. `FICHIERS_URL` et `FICHIERS_SECRET`, les deux.
 *
 * Une configuration partielle est FATALE au demarrage, et le message nomme ce
 * qui manque : un mode devine servirait le disque d'un serveur qui n'en a pas,
 * en 503, sans que personne comprenne pourquoi.
 */

export type Stockage =
  | { mode: 'local' }
  | {
      mode: 'distant';
      /** La base publique du site de fichiers, sans barre finale. */
      base: string;
      secret: string;
    };

/** En dessous, une signature HMAC se devine trop bien. */
const SECRET_MINIMAL = 32;

export function stockageDepuis(env: Record<string, string | undefined>): Stockage {
  const url = env.FICHIERS_URL?.trim() ?? '';
  const secret = env.FICHIERS_SECRET?.trim() ?? '';
  if (!url && !secret) return { mode: 'local' };

  if (!url) throw new Error('FICHIERS_SECRET est renseigne mais FICHIERS_URL manque : configuration partielle.');
  if (!secret) throw new Error('FICHIERS_URL est renseigne mais FICHIERS_SECRET manque : configuration partielle.');

  let lue: URL;
  try {
    lue = new URL(url);
  } catch {
    throw new Error(`FICHIERS_URL n’est pas une adresse : ${url}`);
  }
  // Le http n'est admis que sur le poste : en ligne, une adresse signee
  // circulerait en clair.
  const poste = ['localhost', '127.0.0.1'].includes(lue.hostname);
  if (lue.protocol !== 'https:' && !(poste && lue.protocol === 'http:')) {
    throw new Error(`FICHIERS_URL doit etre en https : ${url}`);
  }
  if (lue.search || lue.hash) throw new Error(`FICHIERS_URL ne porte ni requete ni ancre : ${url}`);
  if (secret.length < SECRET_MINIMAL) {
    throw new Error(`FICHIERS_SECRET est trop court : ${SECRET_MINIMAL} caracteres au moins.`);
  }

  return { mode: 'distant', base: url.replace(/\/+$/, ''), secret };
}

let lu: Stockage | null = null;

/** Le stockage du site, lu une fois. Jette sur une configuration partielle. */
export function stockageDuSite(): Stockage {
  lu ??= stockageDepuis(process.env);
  return lu;
}
