/**
 * src/versement/plan.ts
 * Zakali Press — ce qu'un versement enverrait au site de fichiers.
 *
 * Le plan se calcule sans reseau et sans disque : l'outil `npm run verser` lui
 * donne ce qu'il a lu, ici et la-bas, et l'execute ensuite.
 *
 *   - regle 10.2 — seul ce que l'index connait part, et par niveau : la part
 *     offerte d'abord, le reserve le jour ou quelqu'un pourra l'acheter ;
 *   - regle 4.2 — la place d'un fichier sur le site de fichiers EST son
 *     adresse d'index.
 */

import type { EntreeDIndex, Index, NiveauDAcces } from '@/index/index';

export type Releve = { octets: number; modifieLe: number };

export type Plan = {
  /** Absent la-bas, ou different : a envoyer. */
  aEnvoyer: EntreeDIndex[];
  aJour: number;
  /** Sur le quai, le fichier ne fait plus la taille que l'index a relevee. */
  divergents: EntreeDIndex[];
  /** Sur le site de fichiers, mais inconnu de l'index : signale, jamais efface. */
  inconnus: string[];
};

/** Les niveaux qu'un versement emporte. Le reserve emporte aussi l'offert. */
export function niveauxVerses(niveau: NiveauDAcces): NiveauDAcces[] {
  return niveau === 'reserve' ? ['offert', 'reserve'] : ['offert'];
}

export function planDeVersement(
  index: Index,
  niveau: NiveauDAcces,
  local: (entree: EntreeDIndex) => Releve | null,
  distant: Map<string, Releve>,
): Plan {
  const niveaux = niveauxVerses(niveau);
  const plan: Plan = { aEnvoyer: [], aJour: 0, divergents: [], inconnus: [] };

  for (const entree of index.entrees) {
    if (!niveaux.includes(entree.acces)) continue;
    const ici = local(entree);
    // Le quai a bouge depuis la fabrication de l'index : envoyer ce fichier
    // servirait autre chose que ce que l'index decrit.
    if (!ici || ici.octets !== entree.octets) {
      plan.divergents.push(entree);
      continue;
    }
    const labas = distant.get(entree.adresse);
    // Envoye apres sa derniere modification, et de la meme taille : a jour.
    if (labas && labas.octets === ici.octets && labas.modifieLe >= ici.modifieLe) plan.aJour++;
    else plan.aEnvoyer.push(entree);
  }

  const connues = new Set(index.entrees.map((entree) => entree.adresse));
  plan.inconnus = [...distant.keys()].filter((adresse) => !connues.has(adresse)).sort();
  return plan;
}
