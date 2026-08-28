/**
 * src/quai/figures.ts
 * Zakali Press — compter et nommer les figures d'un chapitre.
 *
 * Regle 3.1 — la NARRATION fait foi. L'audio est un repli. La video, JAMAIS.
 * Regle 3.2 — les noms de figure sortent de la reference de comptage.
 * Regle 3.3 — une figure s'identifie par son nom de base, pas par son numero.
 *
 * Deux figures de Biology ont ete enregistrees en double sous un second nom de
 * fichier, memes octets : la video annonce 385 figures la ou il y en a 383.
 * Et un comptage adosse a un format devient faux le jour ou ce format quitte
 * le site — les comptages sont restes identiques au retrait de l'audio.
 */

import fs from 'node:fs';

import type { Langue } from '@/i18n/langues';
import { dossierMedia, type SorteDeMedia } from '@/quai/chemins';

/** Ce sur quoi le comptage s'est appuye. `aucune` : le chapitre n'a pas de figures. */
export type ReferenceDeComptage = 'narration' | 'audio' | 'aucune';

export type FiguresDeChapitre = {
  reference: ReferenceDeComptage;
  /** Les noms de base, dans l'ordre du dossier. Ce sont eux qui font les ancres. */
  noms: string[];
};

/** L'ordre de repli. La video n'y figure pas, et ne doit jamais y entrer. */
const REFERENCES: readonly Exclude<ReferenceDeComptage, 'aucune'>[] = ['narration', 'audio'];

function nomsDeBase(dossier: string): string[] {
  if (!fs.existsSync(dossier)) return [];
  return fs
    .readdirSync(dossier, { withFileTypes: true })
    .filter((entree) => entree.isFile())
    .map((entree) => entree.name.replace(/\.[^.]+$/, ''))
    .sort();
}

/**
 * Les figures d'un chapitre, etablies depuis la narration — et depuis elle
 * seule, tant qu'elle est la.
 */
export function figuresDeChapitre(
  racine: string,
  ouvrage: string,
  langue: Langue,
  numeroDeChapitre: number,
): FiguresDeChapitre {
  for (const reference of REFERENCES) {
    const noms = nomsDeBase(dossierMedia(racine, ouvrage, langue, reference, numeroDeChapitre));
    if (noms.length > 0) return { reference, noms };
  }
  return { reference: 'aucune', noms: [] };
}

/**
 * Les fichiers reellement poses pour un chapitre, par sorte de media.
 *
 * Rend une table `nom de base` → `nom de fichier`. Une figure sans video n'y a
 * pas d'entree : c'est ce qui permet a la fabrication de la NOMMER (regle 4.6)
 * plutot que de servir une adresse morte.
 */
export function fichiersDeMedia(
  racine: string,
  ouvrage: string,
  langue: Langue,
  sorte: SorteDeMedia,
  numeroDeChapitre: number,
): Map<string, string> {
  const dossier = dossierMedia(racine, ouvrage, langue, sorte, numeroDeChapitre);
  const table = new Map<string, string>();
  if (!fs.existsSync(dossier)) return table;
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (!entree.isFile()) continue;
    const base = entree.name.replace(/\.[^.]+$/, '');
    // Le premier pose gagne : un doublon enregistre sous un second nom ne doit
    // pas remplacer le fichier que la narration designe.
    if (!table.has(base)) table.set(base, entree.name);
  }
  return table;
}
