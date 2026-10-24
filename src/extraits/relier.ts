/**
 * src/extraits/relier.ts
 * Zakali Press — reecrire les liens d'un extrait PDF vers le site.
 *
 * L'extrait livre par l'atelier garde ses boutons « Voir la video », qui
 * designent le FICHIER video sur le miroir de l'atelier. Ce module les fait
 * pointer vers la liseuse du site, a la figure (regles 6.4, 6.5, 6.7) :
 *
 *   https://<domaine>/fr/lire/<volume>?chapitre=<rang>&figure=<nom de base>
 *
 *   - regle 6.5 — un extrait vise la FIGURE, jamais le fichier : un lien vers
 *     le .mp4 donnerait le lecteur natif du navigateur, et son bouton
 *     d'enregistrement ;
 *   - regle 6.4 — une adresse n'est jamais devinee. La figure doit etre dans
 *     l'index, OFFERTE, et son chapitre aussi. Sinon le lien est laisse tel
 *     quel et signale. Le domaine n'a pas de valeur par defaut, et une adresse
 *     locale est refusee.
 *
 * Seule l'adresse du lien change : rectangle, page et apparence restent ceux
 * que l'atelier a poses.
 */

import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFString } from 'pdf-lib';

import type { Fiche, IndexCharge } from '@/index/index';
import { cheminDeLecture } from '@/i18n/segments';

/**
 * Le domaine a graver, verifie. Rend son origine : `https://zakalipress.com`.
 *
 * Il JETTE plutot que de retomber sur une valeur : un lien grave dans un PDF
 * distribue ne se corrige plus.
 */
export function validerDomaine(saisi: string | undefined): string {
  if (!saisi) {
    throw new Error('Le domaine est obligatoire (--domaine https://…) : il n’a pas de valeur par defaut.');
  }
  let url: URL;
  try {
    url = new URL(saisi);
  } catch {
    throw new Error(`Domaine illisible : « ${saisi} ».`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Le domaine doit etre en https : « ${saisi} ».`);
  }
  const hote = url.hostname.toLowerCase();
  if (
    hote === 'localhost' ||
    hote.endsWith('.localhost') ||
    hote.endsWith('.local') ||
    /^127\./.test(hote) ||
    hote === '0.0.0.0' ||
    hote === '[::1]'
  ) {
    throw new Error(`Adresse locale refusee : « ${saisi} ». Elle ne mene nulle part hors de ce poste.`);
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Le domaine seul, sans chemin : « ${saisi} ».`);
  }
  return url.origin;
}

/**
 * Ou doit mener ce lien de l'extrait — ou `null` s'il doit rester tel quel.
 *
 * L'atelier pose deux familles de liens, et le lien est reconnu au nom de
 * fichier qu'il designe, celui d'une figure (`bio2e_ch01_fig1a_…`) :
 *   - les boutons « Voir la video », vers le .mp4 sur le miroir de l'atelier ;
 *   - les illustrations, vers le .png sur le DISQUE de l'editeur
 *     (`file:///…`) — morts pour tout lecteur, et ils exposent
 *     l'arborescence d'une machine.
 * Les deux menent a la figure dans la liseuse. Le lien n'est remplace que si
 * l'index connait ce fichier comme OFFERT dans cette edition, et si son
 * chapitre est offert.
 */
export function cibleDUnLien(
  uri: string,
  fiche: Fiche,
  charge: IndexCharge,
  domaine: string,
): string | null {
  const fichier = /([^/?#\\]+)\.(mp4|png|jpe?g|svg|webp)(?:[?#].*)?$/i.exec(uri);
  if (!fichier) return null;
  const base = fichier[1];

  // Les fichiers OFFERTS de cette edition qui portent ce nom de base : la
  // video ou la narration de la figure, son illustration appelee par la page.
  const prefixe = `${fiche.clefDOeuvre}/${fiche.langue}/`;
  const connus = charge.index.entrees.filter(
    (e) =>
      e.acces === 'offert' &&
      e.adresse.startsWith(prefixe) &&
      e.adresse.slice(e.adresse.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '') === base,
  );
  if (connus.length === 0) return null;

  // Le chapitre se lit dans l'index : le dossier `chNN` des medias de la
  // figure. A defaut — l'illustration d'ouverture n'a ni video ni narration —
  // dans le nom, ou l'atelier l'ecrit (`bio2e_ch01_…`), et ou le script de ses
  // propres pages le lit aussi.
  const dossier = connus.map((e) => /\/media\/[^/]+\/ch(\d+)\//.exec(e.adresse)).find(Boolean);
  const numero = dossier ?? /_ch(\d+)_/i.exec(base);
  if (!numero) return null;
  const chapitre = Number(numero[1]);

  const rang = fiche.chapitres.findIndex((c) => c.numero === chapitre && c.offert) + 1;
  if (rang === 0) return null;

  return `${domaine}${cheminDeLecture(fiche.langue, fiche.slug, rang, base)}`;
}

export type LienRelie = { page: number; avant: string; apres: string | null };

/**
 * Reecrit les liens d'un PDF, et dit ce qu'il a fait de chacun.
 *
 * `cible` decide : une adresse, le lien la recoit ; `null`, il reste tel quel.
 */
export async function relierLesLiens(
  octets: Uint8Array,
  cible: (uri: string) => string | null,
): Promise<{ octets: Uint8Array; liens: LienRelie[] }> {
  const document = await PDFDocument.load(octets, { updateMetadata: false });
  const liens: LienRelie[] = [];

  document.getPages().forEach((page, numero) => {
    const annotations = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray);
    if (!annotations) return;
    for (let i = 0; i < annotations.size(); i += 1) {
      const annotation = annotations.lookupMaybe(i, PDFDict);
      if (annotation?.lookupMaybe(PDFName.of('Subtype'), PDFName) !== PDFName.of('Link')) continue;
      const action = annotation.lookupMaybe(PDFName.of('A'), PDFDict);
      const uri = action?.lookupMaybe(PDFName.of('URI'), PDFString, PDFHexString);
      if (!action || !uri) continue;

      const avant = uri.decodeText();
      const apres = cible(avant);
      if (apres) action.set(PDFName.of('URI'), PDFString.of(apres));
      liens.push({ page: numero + 1, avant, apres });
    }
  });

  return { octets: await document.save(), liens };
}
