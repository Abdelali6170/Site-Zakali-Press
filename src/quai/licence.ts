/**
 * src/quai/licence.ts
 * Zakali Press — la mention de licence se lit dans la preface.
 *
 * Regle 1.9 — un ouvrage SANS licence amont est un cas normal, pas une
 * erreur. Un ouvrage propre a la maison n'est l'edition de rien et n'a rien a
 * citer : cette lecture rend `null` sans se plaindre.
 *
 * La mention n'est jamais reformulee. On rend la phrase telle que la preface
 * l'ecrit, dans la langue de l'edition.
 */

import { texteBrut } from '@/quai/html';

/**
 * Les mots qui designent une mention de licence, dans les trois langues du
 * site. Ce sont des reperes de RECHERCHE, pas une liste de licences connues :
 * la phrase trouvee est rendue entiere, quelle que soit la licence citee.
 */
const REPERES = /creative commons|\bCC[ -]BY\b|licen[cs]e|licencia/i;

/** Le contenu textuel de chaque paragraphe de la page, dans l'ordre. */
function paragraphes(html: string): string[] {
  const trouves: string[] = [];
  for (const bloc of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const texte = texteBrut(bloc[1].replace(/<[^>]+>/g, ' '));
    if (texte) trouves.push(texte);
  }
  return trouves;
}

/**
 * La mention de licence d'une preface, ou `null`.
 *
 * On rend le DERNIER paragraphe qui porte un repere : la mention de source est
 * en fin de preface, et un texte de presentation peut employer le mot
 * « licence » plus haut sans etre la mention.
 */
export function lireLicence(prefaceHtml: string): string | null {
  const candidats = paragraphes(prefaceHtml).filter((p) => REPERES.test(p));
  return candidats.length === 0 ? null : candidats[candidats.length - 1];
}
