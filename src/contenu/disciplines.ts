/**
 * src/contenu/disciplines.ts
 * Zakali Press — les disciplines du catalogue.
 *
 * Regle 1.6 : la discipline se declare dans le MANIFESTE de chaque ouvrage,
 * avec ses libelles par langue, et les disciplines du catalogue se DEDUISENT
 * des ouvrages presents. Elles ne se saisissent nulle part.
 *
 * Elles sont lues dans l'index, qui porte la discipline de chaque fiche. Une
 * discipline sans ouvrage n'existe donc pas : ni au menu, ni au pied de page,
 * ni au filtre — c'est le defaut F-24 du projet precedent, des rubriques vides.
 */

import type { Fiche } from '@/index/index';
import { indexDuSite } from '@/index/charge';
import type { Langue } from '@/i18n/langues';

export type Discipline = {
  /** Identifiant stable, celui qui voyage dans les adresses. */
  slug: string;
  /** Nom affiche, dans la langue demandee. */
  libelle: string;
  /** Famille de rangement, qui fait les colonnes du megamenu. */
  famille: string;
  /** Un de ses volumes est mis en avant : elle apparait au menu mobile et au pied de page. */
  miseEnAvant: boolean;
};

/** Une famille et les disciplines qu'elle regroupe — une colonne du megamenu. */
export type Famille = { libelle: string; disciplines: Discipline[] };

/**
 * Les disciplines portees par les fiches de cette langue, dans l'ordre de
 * leur premiere apparition : deux fabrications donnent le meme menu.
 */
export function disciplinesDepuis(fiches: readonly Fiche[], langue: Langue): Discipline[] {
  const parSlug = new Map<string, Discipline>();
  for (const fiche of fiches) {
    if (fiche.langue !== langue) continue;
    const deja = parSlug.get(fiche.discipline.slug);
    if (deja) {
      deja.miseEnAvant ||= fiche.enAvant;
      continue;
    }
    parSlug.set(fiche.discipline.slug, {
      slug: fiche.discipline.slug,
      libelle: fiche.discipline.libelle,
      famille: fiche.discipline.famille,
      miseEnAvant: fiche.enAvant,
    });
  }
  return [...parSlug.values()];
}

/** Toutes les disciplines portees par au moins un ouvrage, dans cette langue. */
export function disciplines(langue: Langue): Discipline[] {
  return disciplinesDepuis(indexDuSite().index.fiches, langue);
}

/** Les disciplines mises en avant — menu mobile, pied de page. */
export function disciplinesEnAvant(langue: Langue): Discipline[] {
  return disciplines(langue).filter((d) => d.miseEnAvant);
}

/**
 * Les disciplines rangees par famille — les colonnes du megamenu.
 * L'ordre des familles suit leur premiere apparition, celui des disciplines
 * l'ordre de la liste : deux fabrications donnent le meme menu.
 */
export function familles(langue: Langue): Famille[] {
  const parFamille = new Map<string, Discipline[]>();
  for (const discipline of disciplines(langue)) {
    const liste = parFamille.get(discipline.famille);
    if (liste) liste.push(discipline);
    else parFamille.set(discipline.famille, [discipline]);
  }
  return [...parFamille.entries()].map(([libelle, liste]) => ({ libelle, disciplines: liste }));
}
