/**
 * src/site/indexation.ts
 * Zakali Press — le site se laisse-t-il indexer par les moteurs ?
 *
 * Regle 10.4 — tant que le site n'est pas ouvert, l'indexation est fermee de
 * DEUX manieres a la fois : `robots.txt` le demande, et l'en-tete
 * `X-Robots-Tag` l'impose a chaque reponse. Un reglage se desactive par
 * megarde ; deux, ensemble, se verifient.
 *
 * Une seule variable decide des deux : `INDEXATION=ouverte`. Absente, le site
 * est ferme — l'oubli ferme, il n'ouvre jamais. Elle est lue a la
 * CONSTRUCTION : la changer demande un redeploiement.
 */

export function indexationOuverte(env: Record<string, string | undefined>): boolean {
  const valeur = env.INDEXATION?.trim() ?? '';
  if (valeur === '' || valeur === 'fermee') return false;
  if (valeur === 'ouverte') return true;
  // Une faute de frappe ne doit ni ouvrir ni fermer en silence.
  throw new Error(`INDEXATION vaut « ouverte » ou « fermee », pas « ${valeur} ».`);
}

/** L'en-tete pose sur toute reponse quand l'indexation est fermee. */
export const EXCLUSION = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
