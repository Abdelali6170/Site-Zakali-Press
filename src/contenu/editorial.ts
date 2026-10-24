/**
 * src/contenu/editorial.ts
 * Zakali Press — le contenu editorial, versionne avec le code.
 *
 * Regle 7.3 — trois choses distinctes : les chaines d'interface vivent dans
 * les dictionnaires, les segments d'adresse dans leur table, et le contenu
 * EDITORIAL — accroches, textes de pages — ici, dans des fichiers que
 * l'editeur reecrit sans toucher au code. Il n'y a pas d'administration du
 * contenu : changer un texte est un commit.
 */

import type { Langue } from '@/i18n/langues';

import accueil from './editorial/accueil.json';

export type Promesse = { titre: string; texte: string };

export type Accueil = {
  surtitre: string;
  titre: string;
  accroche: string;
  promesses: Promesse[];
  appel: { titre: string; texte: string };
};

/** Le texte de l'accueil, dans cette langue. */
export function texteDAccueil(langue: Langue): Accueil {
  return accueil[langue];
}
