/**
 * src/quai/html.ts
 * Zakali Press — le peu qu'il faut savoir lire dans une page.
 *
 * Ni analyseur complet ni dependance : ce qu'on cherche dans ces pages tient
 * en deux choses — les liens du sommaire, et les fichiers qu'une page appelle
 * pour s'afficher. Une expression reguliere suffit, et un test la fige.
 */

const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '’',
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  deg: '°',
  times: '×',
  middot: '·',
  euro: '€',
  copy: '©',
  reg: '®',
  trade: '™',
  iexcl: '¡',
  iquest: '¿',
  szlig: 'ß',
  aelig: 'æ',
  oelig: 'œ',
};

/** Les accents, en signes combinants — c'est la normalisation qui recompose. */
const ACCENTS: Record<string, string> = {
  grave: '̀',
  acute: '́',
  circ: '̂',
  tilde: '̃',
  uml: '̈',
  ring: '̊',
  cedil: '̧',
};

/**
 * `egrave` → `è`, `Eacute` → `É`.
 *
 * Toutes les entites accentuees se lisent « lettre + accent », et la casse de
 * la lettre est celle de l'entite — ce qu'une table insensible a la casse ne
 * saurait pas rendre. Deux cents lignes de table diraient la meme chose, et se
 * desynchroniseraient.
 */
function lettreAccentuee(nom: string): string | null {
  const marque = /^([a-zA-Z])(grave|acute|circ|tilde|uml|ring|cedil)$/.exec(nom);
  if (!marque) return null;
  return (marque[1] + ACCENTS[marque[2]]).normalize('NFC');
}

/** Rend un texte de balisage lisible : entites resolues, espaces resserres. */
export function texteBrut(fragment: string): string {
  return fragment
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(
      /&([a-zA-Z]+);/g,
      (entier, nom: string) => lettreAccentuee(nom) ?? ENTITES[nom.toLowerCase()] ?? entier,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/** Les attributs d'une balise, tels qu'ils y sont ecrits. */
export function attributs(balise: string): Record<string, string> {
  const trouves: Record<string, string> = {};
  for (const paire of balise.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*"([^"]*)"/g)) {
    trouves[paire[1].toLowerCase()] = paire[2];
  }
  return trouves;
}

/** Vrai si la liste de classes contient exactement ce mot. */
export function porteLaClasse(classes: string | undefined, mot: string): boolean {
  return (classes ?? '').split(/\s+/).includes(mot);
}
