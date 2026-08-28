/**
 * src/i18n/traduire.ts
 * Zakali Press — les chaines d'interface.
 *
 * A ne pas confondre avec les deux autres choses traduites du site :
 *   - le CONTENU EDITORIAL — accroches, textes de pages — qui vit dans ses
 *     propres fichiers ;
 *   - les SEGMENTS D'ADRESSE — /fr/catalogue, /es/catalogo — declares dans
 *     segments.ts.
 *
 * Ici, seulement les mots de l'interface : « Se connecter », « Disciplines ».
 */

import { LANGUE_PAR_DEFAUT, type Langue } from './langues';

import en from './dictionnaires/en.json';
import es from './dictionnaires/es.json';
import fr from './dictionnaires/fr.json';

const DICTIONNAIRES: Record<Langue, Record<string, string>> = { fr, en, es };

export type Clef = keyof typeof fr;

/**
 * Traduit une clef.
 *
 * La langue par defaut sert de filet : une chaine non encore traduite s'affiche
 * en francais plutot que de laisser un trou dans la page. En developpement,
 * l'absence est signalee — une chaine manquante doit se voir, pas se deviner.
 */
export function traduire(
  langue: Langue,
  clef: Clef,
  remplacements: Record<string, string | number> = {},
): string {
  const dictionnaire = DICTIONNAIRES[langue] ?? DICTIONNAIRES[LANGUE_PAR_DEFAUT];

  let valeur = dictionnaire[clef];

  if (valeur === undefined) {
    valeur = DICTIONNAIRES[LANGUE_PAR_DEFAUT][clef];
    if (valeur === undefined) return clef;
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[I18N] Clef absente en « ${langue} » : ${clef}`);
    }
  }

  return valeur.replace(/\{(\w+)\}/g, (entier, nom: string) =>
    remplacements[nom] === undefined ? entier : String(remplacements[nom]),
  );
}

/** Traducteur lie a une langue — evite de la repeter a chaque appel. */
export function traducteur(langue: Langue) {
  return (clef: Clef, remplacements?: Record<string, string | number>) =>
    traduire(langue, clef, remplacements);
}
