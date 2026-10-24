/**
 * src/porte/page-reservee.ts
 * Zakali Press — ce que la porte repond devant un chapitre reserve.
 *
 * Regle 4.3 — un chapitre cite par le sommaire mais non offert repond 403, et
 * non 404 : il existe, il est reserve.
 *
 * La porte ne dessine pas la page qui l'explique : c'est la liseuse du site
 * qui le fait, avec l'en-tete, le pied de page et le sommaire du volume. Le
 * 403 porte donc un document minimal qui y RENVOIE LA FENETRE ENTIERE. C'est
 * ce qui compte quand le chapitre est demande depuis l'interieur de la
 * liseuse : sans cela, le refus s'afficherait enferme dans le cadre.
 */

import type { Fiche } from '@/index/index';
import type { Langue } from '@/i18n/langues';
import { cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

/** Ou lire ce chapitre dans le site : l'edition qui le porte, et sa place au sommaire. */
export function lectureDuChapitre(
  fiches: readonly Fiche[],
  adresse: string,
): { langue: Langue; slug: string; rang: number } | null {
  for (const fiche of fiches) {
    const place = fiche.chapitres.findIndex((c) => c.adresse === adresse);
    if (place >= 0) return { langue: fiche.langue, slug: fiche.slug, rang: place + 1 };
  }
  return null;
}

const ENTITES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function echapper(texte: string): string {
  return texte.replace(/[&<>"']/g, (c) => ENTITES[c]);
}

/**
 * Le document du 403 : il emmene la fenetre ENTIERE vers la liseuse.
 *
 * Sans JavaScript, le lien reste — `target="_top"` sort lui aussi du cadre.
 * L'adresse est serialisee en JSON dans le script et echappee dans le HTML :
 * elle vient de l'index, mais rien ne s'ecrit ici sans echappement.
 */
export function sortieVersLaLiseuse(lecture: { langue: Langue; slug: string; rang: number }): string {
  const t = traducteur(lecture.langue);
  const cible = cheminDeLecture(lecture.langue, lecture.slug, lecture.rang);
  const pourScript = JSON.stringify(cible).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="${lecture.langue}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>${echapper(t('reserve.titre'))}</title>
<script>window.top.location.replace(${pourScript});</script>
</head>
<body>
<p><a href="${echapper(cible)}" target="_top">${echapper(t('reserve.titre'))}</a></p>
</body>
</html>
`;
}
