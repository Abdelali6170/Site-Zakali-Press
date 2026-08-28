/**
 * src/quai/page.ts
 * Zakali Press — les fichiers qu'une page appelle pour s'afficher.
 *
 * Regle 4.3 — ce qui est offert l'est par DEDUCTION, pas par liste. Sont
 * offerts le sommaire, la preface, les chapitres offerts — et les fichiers que
 * ces pages appellent, releves en LISANT la page.
 *
 * Regle 2.1 — aucun nom n'est fabrique : ils viennent de la page elle-meme.
 *
 * Declarer a la main les dependances d'une page serait faux des le premier
 * rendu : une feuille de style qui change de nom, une police qui s'ajoute, et
 * la page offerte s'affiche cassee sans que rien ne le signale.
 */

import { attributs } from '@/quai/html';

/**
 * Ce qu'une page appelle POUR S'AFFICHER, balise par balise.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  `<a href>` N'Y EST PAS, ET NE DOIT JAMAIS Y ENTRER.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un lien est une navigation, pas un affichage. Le sommaire cite TOUS les
 * chapitres du volume : compter ses liens comme des dependances offrirait le
 * volume entier au premier visiteur venu. La regle 4.3 le dit en toutes
 * lettres — « une page de chapitre non offerte reste reservee meme si une page
 * offerte y renvoie ».
 *
 * `href` reste lu sur `<link>`, ou il designe une feuille de style ou une
 * icone : la, c'est bien de l'affichage.
 */
const APPELS_D_AFFICHAGE: Record<string, readonly string[]> = {
  img: ['src'],
  script: ['src'],
  link: ['href'],
  source: ['src'],
  video: ['src', 'poster'],
  audio: ['src'],
  iframe: ['src'],
  embed: ['src'],
  object: ['data'],
};

/**
 * Resout une adresse relative depuis le dossier d'une page, en restant DANS
 * le volume. Rend `null` si l'adresse sort du volume, ou n'est pas un fichier
 * du quai.
 */
export function resoudreDansLeVolume(pageDuVolume: string, appel: string): string | null {
  const sansAncre = appel.split('#')[0].split('?')[0];
  if (!sansAncre) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(sansAncre)) return null; // http:, data:, mailto:
  if (sansAncre.startsWith('//') || sansAncre.startsWith('/')) return null;
  if (sansAncre.endsWith('/')) return null; // un dossier, pas un fichier

  const dossier = pageDuVolume.split('/').slice(0, -1);
  const morceaux = [...dossier, ...sansAncre.split('/')];
  const pile: string[] = [];
  for (const morceau of morceaux) {
    if (morceau === '' || morceau === '.') continue;
    if (morceau === '..') {
      // Remonter au-dela de la racine du volume : l'appel sort du quai.
      if (pile.length === 0) return null;
      pile.pop();
      continue;
    }
    pile.push(morceau);
  }
  return pile.length === 0 ? null : pile.join('/');
}

/**
 * Tout ce qu'une page HTML reclame, en adresses relatives a la racine du
 * volume, dans l'ordre de la page et sans doublon.
 */
export function fichiersAppelesParUnePage(pageDuVolume: string, html: string): string[] {
  const trouves = new Set<string>();
  for (const balise of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
    const appels = APPELS_D_AFFICHAGE[balise[1].toLowerCase()];
    if (!appels) continue;
    const attribut = attributs(balise[2]);
    for (const nom of appels) {
      const appel = attribut[nom];
      if (!appel) continue;
      const resolu = resoudreDansLeVolume(pageDuVolume, appel);
      if (resolu) trouves.add(resolu);
    }
  }
  return [...trouves];
}

/**
 * Les liens de navigation d'une page — `<a href>` — resolus dans le volume.
 *
 * Ils n'entrent PAS dans le calcul de ce qui est offert. Ils servent a la
 * fabrication : un lien qui ne mene nulle part se nomme dans le rapport
 * (regle 4.6) plutot que d'attendre qu'un lecteur le decouvre.
 */
export function liensDeNavigation(pageDuVolume: string, html: string): string[] {
  const trouves = new Set<string>();
  for (const balise of html.matchAll(/<a\b([^>]*)>/gi)) {
    const href = attributs(balise[1]).href;
    if (!href) continue;
    const resolu = resoudreDansLeVolume(pageDuVolume, href);
    if (resolu) trouves.add(resolu);
  }
  return [...trouves];
}

/**
 * Les fichiers qu'une feuille de style reclame — polices et images de fond.
 *
 * Une page offerte qui obtiendrait sa feuille de style mais pas les polices
 * qu'elle appelle s'afficherait avec des carres a la place des icones. La
 * deduction de la regle 4.3 ne s'arrete donc pas au premier niveau.
 */
export function fichiersAppelesParUneFeuille(feuilleDuVolume: string, css: string): string[] {
  const trouves = new Set<string>();
  for (const appel of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    const resolu = resoudreDansLeVolume(feuilleDuVolume, appel[2].trim());
    if (resolu) trouves.add(resolu);
  }
  return [...trouves];
}
