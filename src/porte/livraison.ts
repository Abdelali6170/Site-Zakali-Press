/**
 * src/porte/livraison.ts
 * Zakali Press — comment un fichier autorise rejoint le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  REGLE 8.4 — CE QUI PORTE DES LIENS EST RELAYE. LE POIDS EST REDIRIGE.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un navigateur resout les liens relatifs d'une page, ET les `url(…)` d'une
 * feuille de style, contre l'adresse ou il les a finalement recues. Redirige,
 * un tel fichier enverrait ses images et ses polices droit au site de
 * fichiers, sans signature et hors de tout controle d'acces : elles
 * echoueraient en silence. Ce qu'une page lit par script — la narration — et
 * les polices demanderaient en outre des en-tetes CORS au site de fichiers.
 *
 * Est donc RELAYE, le site allant chercher les octets lui-meme : les pages,
 * les feuilles, les scripts, les polices, les textes — et les couvertures,
 * que l'optimiseur d'images de Next lit en interne sans suivre de
 * redirection. Est REDIRIGE vers une adresse signee : les images des pages,
 * les videos, l'audio, les PDF. C'est la que sont les gigaoctets.
 */

import type { EntreeDIndex, Fiche } from '@/index/index';

/** Les ressources qui portent des liens, ou qu'une page lit par script. */
const RESSOURCES_RELAYEES = /\.(?:css|js|mjs|json|txt|svg|woff2?|ttf|otf)$/i;

export function seRelaie(entree: EntreeDIndex): boolean {
  switch (entree.sorte) {
    case 'page':
    case 'couverture':
    case 'narration':
      return true;
    case 'ressource':
      return RESSOURCES_RELAYEES.test(entree.fichier);
    default:
      return false;
  }
}

/**
 * La validite d'une adresse signee, en secondes.
 *
 * Quelques minutes pour tout — sauf la video et l'audio. Un lecteur les lit
 * par plages, une requete par avancee, et CHAQUE plage revient au site de
 * fichiers avec la meme adresse : une signature de cinq minutes couperait une
 * video mise en pause pendant six. Quatre heures couvrent largement la plus
 * longue sequence, et l'adresse ne mene qu'a un fichier deja autorise.
 */
export function dureeDeSignature(entree: EntreeDIndex): number {
  return entree.sorte === 'video' || entree.sorte === 'audio' ? 4 * 3600 : 5 * 60;
}

/** Ce qu'un relais demande au site de fichiers : il l'utilise aussitot. */
export const DUREE_DU_RELAIS = 60;

const noms = new WeakMap<Fiche[], Map<string, string>>();

/**
 * Le nom sous lequel un PDF s'enregistre, ou `undefined`.
 *
 * Il vient de la fiche, qui l'a lu sur le quai ; sans lui, le navigateur
 * nommerait l'extrait d'apres son adresse : `extrait.pdf`, pour les quinze.
 */
export function nomDeTelechargement(fiches: Fiche[], adresse: string): string | undefined {
  let table = noms.get(fiches);
  if (!table) {
    table = new Map();
    for (const fiche of fiches) {
      for (const fichier of [...fiche.pdfs, ...(fiche.extrait ? [fiche.extrait] : [])]) {
        table.set(fichier.adresse, fichier.nom);
      }
    }
    noms.set(fiches, table);
  }
  return table.get(adresse);
}

/**
 * `attachment; filename="…"; filename*=UTF-8''…`
 *
 * La forme ASCII sert les vieux clients, la forme etendue les noms accentues.
 * `fichiers/porte.php` ecrit la meme chose, a l'octet pres.
 */
export function dispositionDeTelechargement(nom: string): string {
  const ascii = nom.replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nom)}`;
}
