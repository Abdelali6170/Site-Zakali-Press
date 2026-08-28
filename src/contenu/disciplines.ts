/**
 * src/contenu/disciplines.ts
 * Zakali Press — les disciplines du catalogue.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  COUTURE PROVISOIRE — a remplacer en meme temps que l'index (phase 4).
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Regle 1.6 : la discipline se declare dans le MANIFESTE de chaque ouvrage,
 * avec ses libelles par langue, et les disciplines du catalogue se DEDUISENT
 * des ouvrages presents. Elles ne se saisissent nulle part.
 *
 * L'index n'existe pas encore. Cette liste tient donc la place, pour que
 * l'ossature soit visible et que les composants recoivent deja la forme
 * definitive.
 *
 * Le jour ou l'index arrive, SEUL LE CORPS DE `disciplines()` change : les
 * composants prennent la meme forme, et rien d'autre ne bouge. C'est ce qui
 * fait de ce fichier une couture, et non un rattrapage a venir.
 */

import type { Langue } from '@/i18n/langues';

export type Discipline = {
  /** Identifiant stable, celui qui voyage dans les adresses. */
  slug: string;
  /** Nom affiche, dans la langue demandee. */
  libelle: string;
  /** Famille de rangement, qui fait les colonnes du megamenu. */
  famille: string;
  /** Mise en avant : apparait dans le menu mobile et le pied de page. */
  miseEnAvant: boolean;
};

/** Une famille et les disciplines qu'elle regroupe — une colonne du megamenu. */
export type Famille = { libelle: string; disciplines: Discipline[] };

const PROVISOIRE: Record<Langue, Discipline[]> = {
  fr: [
    { slug: 'biologie', libelle: 'Biologie', famille: 'Sciences', miseEnAvant: true },
    { slug: 'ia', libelle: 'Intelligence artificielle', famille: 'Informatique', miseEnAvant: true },
  ],
  en: [
    { slug: 'biologie', libelle: 'Biology', famille: 'Sciences', miseEnAvant: true },
    { slug: 'ia', libelle: 'Artificial intelligence', famille: 'Computing', miseEnAvant: true },
  ],
  es: [
    { slug: 'biologie', libelle: 'Biología', famille: 'Ciencias', miseEnAvant: true },
    { slug: 'ia', libelle: 'Inteligencia artificial', famille: 'Informática', miseEnAvant: true },
  ],
};

/** Toutes les disciplines portees par au moins un ouvrage, dans cette langue. */
export function disciplines(langue: Langue): Discipline[] {
  return PROVISOIRE[langue] ?? [];
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
