/**
 * src/porte/stockage-distant.ts
 * Zakali Press — servir un fichier d'ouvrage depuis le site de fichiers.
 *
 * Il ne recoit qu'une ENTREE D'INDEX, deja autorisee par la porte : l'adresse
 * signee est celle de l'index, jamais celle de la requete (regle 4.1).
 *
 * Regle 8.4 — ce qui porte des liens est RELAYE : le site demande lui-meme le
 * fichier, par une adresse signee d'une minute, et en rend les octets sous sa
 * propre adresse. Le reste est REDIRIGE vers une adresse signee, et le
 * navigateur va le chercher directement.
 */

import type { EntreeDIndex } from '@/index/index';
import { adresseSignee } from '@/porte/signature';
import { DUREE_DU_RELAIS, dureeDeSignature, seRelaie } from '@/porte/livraison';
import { typeDeContenu } from '@/porte/types-de-contenu';

/** Ce qu'un relais reprend de la reponse du site de fichiers. */
const ENTETES_REPRIS = ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

export type Distant = { base: string; secret: string };

export async function servirDepuisLeSiteDeFichiers(
  distant: Distant,
  entree: EntreeDIndex,
  entetePlage: string | null,
  nom: string | undefined,
): Promise<Response> {
  if (!seRelaie(entree)) {
    const vers = adresseSignee(distant.base, distant.secret, entree.adresse, {
      duree: dureeDeSignature(entree),
      nom,
    });
    // Une redirection mise en cache survivrait a sa signature.
    return new Response(null, { status: 307, headers: { Location: vers, 'Cache-Control': 'no-store' } });
  }

  const source = adresseSignee(distant.base, distant.secret, entree.adresse, { duree: DUREE_DU_RELAIS });
  let reponse: Response;
  try {
    reponse = await fetch(source, {
      // Sans compression : `fetch` decompresserait en silence, et la longueur
      // reprise ne serait plus celle des octets rendus.
      headers: { 'Accept-Encoding': 'identity', ...(entetePlage ? { Range: entetePlage } : {}) },
      redirect: 'error',
      cache: 'no-store',
    });
  } catch {
    return new Response('Le site de fichiers ne repond pas.', { status: 503 });
  }

  // Indexe mais absent : le versement est en retard sur l'index.
  if (reponse.status === 404) return new Response('Introuvable', { status: 404 });
  // Un refus du site de fichiers est une faute de configuration du site — un
  // secret qui ne s'accorde pas, une horloge decalee — jamais un refus du
  // lecteur, que la porte a deja autorise.
  if (![200, 206, 416].includes(reponse.status)) {
    return new Response('Le site de fichiers a refuse la demande.', { status: 502 });
  }

  const entetes = new Headers({
    'Content-Type': typeDeContenu(entree.fichier),
    // Seul l'offert passe la porte aujourd'hui : il peut etre mis en cache
    // (regle 5.7). Le jour ou le reserve passera, ses reponses seront `private`.
    'Cache-Control': 'public, max-age=3600',
  });
  for (const nomDEntete of ENTETES_REPRIS) {
    const valeur = reponse.headers.get(nomDEntete);
    if (valeur) entetes.set(nomDEntete, valeur);
  }
  return new Response(reponse.body, { status: reponse.status, headers: entetes });
}
