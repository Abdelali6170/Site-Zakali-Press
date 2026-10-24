/**
 * src/ouvrages/accueil.ts
 * Zakali Press — ce que l'accueil montre des ouvrages, calcule depuis l'index.
 *
 * Fonction pure, comme la vitrine. Rien de ce qu'elle rend ne s'ecrit a la
 * main : l'oeuvre a la une, les chiffres et les disciplines suivent les
 * parutions d'eux-memes.
 */

import type { Fiche } from '@/index/index';
import type { Langue } from '@/i18n/langues';
import { rangDuPremierOffert } from '@/ouvrages/detail';
import { vitrine, type OeuvreEnVitrine } from '@/ouvrages/vitrine';

export type DisciplineDAccueil = {
  slug: string;
  libelle: string;
  famille: string;
  oeuvres: number;
  volumes: number;
};

export type VueDAccueil = {
  /** L'oeuvre du premier volume mis en avant ; a defaut, la premiere. */
  aLaUne: OeuvreEnVitrine | null;
  /** Le chapitre offert du volume mis en avant : la porte d'entree du lecteur. */
  chapitreOffert: { slug: string; rang: number } | null;
  chiffres: { volumes: number; langues: number; figures: number };
  disciplines: DisciplineDAccueil[];
};

export function vueDAccueil(fiches: readonly Fiche[], langue: Langue): VueDAccueil {
  const oeuvres = vitrine(fiches, langue);
  const ici = fiches.filter((f) => f.langue === langue);

  const enAvant = ici.find((f) => f.enAvant) ?? ici[0];
  const aLaUne = enAvant ? (oeuvres.find((o) => o.ouvrage === enAvant.ouvrage) ?? null) : null;

  const disciplines = new Map<string, DisciplineDAccueil>();
  for (const oeuvre of oeuvres) {
    const deja = disciplines.get(oeuvre.discipline.slug);
    if (deja) {
      deja.oeuvres += 1;
      deja.volumes += oeuvre.volumes.length;
      continue;
    }
    disciplines.set(oeuvre.discipline.slug, {
      slug: oeuvre.discipline.slug,
      libelle: oeuvre.discipline.libelle,
      famille: oeuvre.discipline.famille,
      oeuvres: 1,
      volumes: oeuvre.volumes.length,
    });
  }

  const rang = enAvant ? rangDuPremierOffert(enAvant.chapitres) : null;

  return {
    aLaUne,
    chapitreOffert: enAvant && rang ? { slug: enAvant.slug, rang } : null,
    chiffres: {
      volumes: ici.length,
      langues: new Set(fiches.map((f) => f.langue)).size,
      // Dans la langue de la page : les memes figures, comptees une fois.
      figures: ici.reduce((somme, f) => somme + (f.formats.video ? f.figures : 0), 0),
    },
    disciplines: [...disciplines.values()],
  };
}
