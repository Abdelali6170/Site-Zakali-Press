/**
 * src/i18n/segments.ts
 * Zakali Press — les adresses, traduites (regle 7.1).
 *
 * Chaque langue a de VRAIES adresses : /fr/catalogue, /es/catalogo,
 * /fr/lire/…, /en/read/…. Elles sont declarees ici, en un seul endroit ;
 * aucun gabarit n'ecrit jamais une adresse a la main.
 *
 * ── Comment cela tient dans Next.js ─────────────────────────────────────────
 *
 * Le routeur de Next associe une route a un NOM DE DOSSIER, et un dossier ne
 * peut pas s'appeler de trois façons. Les dossiers portent donc la CLEF de la
 * page — `catalogue`, `lire`, `compte` — et le middleware traduit l'adresse
 * entrante vers cette clef.
 *
 * La clef ressemble au francais parce qu'il faut bien choisir une langue pour
 * nommer les choses, et que le code de ce projet est en francais. Ce n'est pas
 * l'adresse francaise : c'est un identifiant interne, que personne ne tape.
 *
 * ── La regle qui compte ─────────────────────────────────────────────────────
 *
 * Un segment appartient a UNE langue. `/es/catalogue` n'existe pas — c'est le
 * mot francais sous un prefixe espagnol — et doit donner un 404 franc, pas la
 * page espagnole servie sous une adresse qui n'existe pas.
 */

import type { Langue } from './langues';

export const SEGMENTS = {
  accueil: { fr: '', en: '', es: '' },
  catalogue: { fr: 'catalogue', en: 'catalogue', es: 'catalogo' },
  lire: { fr: 'lire', en: 'read', es: 'leer' },
  compte: { fr: 'compte', en: 'account', es: 'cuenta' },
  connexion: { fr: 'connexion', en: 'login', es: 'acceso' },
  inscription: { fr: 'inscription', en: 'register', es: 'registro' },
  deconnexion: { fr: 'deconnexion', en: 'logout', es: 'cierre-sesion' },
} as const satisfies Record<string, Record<Langue, string>>;

export type Page = keyof typeof SEGMENTS;

export const PAGES = Object.keys(SEGMENTS) as Page[];

/** Le mot que porte l'adresse, pour cette page et cette langue. */
export function segmentDe(page: Page, langue: Langue): string {
  return SEGMENTS[page][langue];
}

/**
 * Quelle page ce segment designe-t-il, DANS CETTE LANGUE ?
 *
 * Correspondance exacte, et rien d'autre : un mot appartenant a une autre
 * langue ne designe aucune page. C'est ce qui produit le 404 franc.
 */
export function pageDepuisSegment(langue: Langue, segment: string): Page | null {
  if (!segment) return 'accueil';
  for (const page of PAGES) {
    if (page === 'accueil') continue;
    if (SEGMENTS[page][langue] === segment) return page;
  }
  return null;
}

/** Adresse d'une page. Les gabarits n'en composent jamais a la main. */
export function chemin(
  langue: Langue,
  page: Page,
  options: { slug?: string; requete?: Record<string, string | number | undefined | null> } = {},
): string {
  const segment = segmentDe(page, langue);

  const morceaux = [`/${langue}`];
  if (segment) morceaux.push(segment);
  if (options.slug) morceaux.push(encodeURIComponent(options.slug));

  const base = morceaux.join('/');
  if (!options.requete) return base;

  const params = new URLSearchParams();
  for (const [clef, valeur] of Object.entries(options.requete)) {
    if (valeur === undefined || valeur === null || valeur === '') continue;
    params.set(clef, String(valeur));
  }
  const requete = params.toString();
  return requete ? `${base}?${requete}` : base;
}

/**
 * Adresse de la liseuse : le sommaire du volume, ou l'un de ses chapitres.
 *
 * `rang` est la place du chapitre dans le sommaire, a partir de 1 — et non son
 * numero : `chapter_31a` et `chapter_31b` portent le meme numero (regle 2.3).
 *
 * `figure` est le nom de base d'une figure de ce chapitre : la liseuse s'y
 * rend et ouvre sa video. C'est la cible des liens des extraits (regle 6.5).
 */
export function cheminDeLecture(langue: Langue, slug: string, rang?: number, figure?: string): string {
  return chemin(langue, 'lire', {
    slug,
    requete: rang ? { chapitre: rang, figure } : undefined,
  });
}

/**
 * Adresse publique d'un fichier d'ouvrage, depuis son adresse d'index.
 *
 * Regle 7.2 — pas de prefixe de langue : l'adresse porte deja la sienne, a
 * l'interieur, et une page de chapitre appelle ses images en relatif.
 */
export function cheminDeContenu(adresse: string): string {
  return `/contenu/${adresse.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * Reconnait la page visee par un chemin, quelle que soit la langue.
 * Sert au selecteur de langue : rester sur la meme page en changeant de langue.
 */
export function routeDe(
  chemin: string,
): { langue: string; page: Page | null; slug: string | null } | null {
  const propre = String(chemin ?? '').replace(/^\/+|\/+$/g, '');
  const [premier, deuxieme, troisieme] = propre.split('/');
  if (!premier) return null;
  return {
    langue: premier,
    page: deuxieme ? pageDepuisSegment(premier as Langue, deuxieme) : 'accueil',
    slug: troisieme ?? null,
  };
}
