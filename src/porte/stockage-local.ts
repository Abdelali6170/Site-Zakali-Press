/**
 * src/porte/stockage-local.ts
 * Zakali Press — servir un fichier d'ouvrage depuis le quai du poste.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  STOCKAGE DE POSTE. EN LIGNE, C'EST LE SITE DE FICHIERS QUI SERT.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le serveur de production n'a pas de quai : ses fichiers d'ouvrage viennent
 * du site de fichiers (`stockage-distant.ts`). Ce module est ce qui permet de
 * voir le site complet sur le poste ou vit le quai. Sans `LIVRES_DIR`, il
 * repond 503 et le dit — jamais un 500 muet.
 *
 * Il sert tout lui-meme, relaye comme redirige : sur le poste, la base
 * d'adresse ne change pas, et la regle 8.4 n'a rien a proteger.
 *
 * Il ne recoit qu'une ENTREE D'INDEX, deja autorisee par la porte : le chemin
 * du fichier vient de l'index, jamais de la requete (regle 4.1).
 *
 * Les plages d'octets sont honorees : sans elles, un navigateur ne peut pas
 * avancer dans une video, et Safari refuse meme de la lire.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import type { EntreeDIndex } from '@/index/index';
import { dispositionDeTelechargement } from '@/porte/livraison';
import { typeDeContenu } from '@/porte/types-de-contenu';
import { racineDesDerives, racineDuQuai } from '@/quai/chemins';

/** `bytes=500-999` → `{ debut: 500, fin: 999 }`. Une plage illisible vaut fichier entier. */
function lirePlage(entete: string | null, taille: number): { debut: number; fin: number } | null {
  const plage = /^bytes=(\d*)-(\d*)$/.exec(entete ?? '');
  if (!plage || (plage[1] === '' && plage[2] === '')) return null;

  // `bytes=-500` : les 500 derniers octets.
  if (plage[1] === '') {
    const suffixe = Math.min(Number(plage[2]), taille);
    return { debut: taille - suffixe, fin: taille - 1 };
  }
  const debut = Number(plage[1]);
  const fin = plage[2] === '' ? taille - 1 : Math.min(Number(plage[2]), taille - 1);
  return { debut, fin };
}

export function servirDepuisLeQuai(
  entree: EntreeDIndex,
  entetePlage: string | null,
  nom?: string,
): Response {
  let racine: string;
  try {
    // Un derive (regle 6.7) vit hors du quai, sous la racine des derives.
    racine = entree.origine === 'derive' ? racineDesDerives() : racineDuQuai();
  } catch {
    return new Response('Le contenu des ouvrages n’est pas servi par ce serveur.', { status: 503 });
  }

  const fichier = path.join(racine, ...entree.fichier.split('/'));
  let taille: number;
  try {
    taille = fs.statSync(fichier).size;
  } catch {
    // Indexe mais absent : le quai a change depuis la fabrication de l'index.
    return new Response('Introuvable', { status: 404 });
  }

  const entetes = new Headers({
    'Content-Type': typeDeContenu(fichier),
    'Accept-Ranges': 'bytes',
    // Seul l'offert passe la porte aujourd'hui : il peut etre mis en cache.
    // Le jour ou le reserve passera, ses reponses devront etre `private`.
    'Cache-Control': 'public, max-age=3600',
  });
  if (nom) entetes.set('Content-Disposition', dispositionDeTelechargement(nom));

  const plage = lirePlage(entetePlage, taille);
  if (plage && (plage.debut > plage.fin || plage.debut >= taille)) {
    entetes.set('Content-Range', `bytes */${taille}`);
    return new Response(null, { status: 416, headers: entetes });
  }

  const { debut, fin } = plage ?? { debut: 0, fin: taille - 1 };
  entetes.set('Content-Length', String(fin - debut + 1));
  if (plage) entetes.set('Content-Range', `bytes ${debut}-${fin}/${taille}`);

  const flux = Readable.toWeb(fs.createReadStream(fichier, { start: debut, end: fin }));
  return new Response(flux as ReadableStream, { status: plage ? 206 : 200, headers: entetes });
}
