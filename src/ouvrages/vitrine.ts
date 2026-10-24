/**
 * src/ouvrages/vitrine.ts
 * Zakali Press — ce que le catalogue montre, calcule depuis les fiches.
 *
 * Le catalogue d'un site a plusieurs ouvrages ne se presente pas comme celui
 * d'un seul. L'ancien affichait quinze fiches qui etaient cinq volumes × trois
 * langues ; ici :
 *
 *   - regle 8.1 — une seule langue, celle de la page ;
 *   - l'OEUVRE est un niveau au-dessus de l'edition : les volumes d'un meme
 *     ouvrage se rangent sous lui, et un ouvrage mono-volume se signale comme
 *     tel, pour s'afficher autrement ;
 *   - regle 8.2 — le prix arrive deja ecrit. Le gabarit n'a pas le montant.
 *
 * Fonction pure : elle recoit les fiches, elle ne charge rien. C'est ce qui la
 * rend testable sur les ouvrages d'essai.
 */

import type { Fiche } from '@/index/index';
import type { Langue } from '@/i18n/langues';
import type { Portee } from '@/ouvrages/manifeste';
import { formaterPrix } from '@/ouvrages/prix';

export type VolumeEnVitrine = {
  slug: string;
  volume: number;
  titre: string;
  accroche: string;
  /** Deja formate (regle 8.2). */
  prix: string;
  /** Adresse d'index de la couverture, ou `null` : un aplat tient la place (regle 8.6). */
  couverture: string | null;
  /** Adresse d'index du sommaire, qui est toujours offert (regle 4.3). */
  sommaire: string;
  chapitres: number;
  figures: number;
  formats: Fiche['formats'];
};

export type OeuvreEnVitrine = {
  ouvrage: string;
  titre: string;
  edition?: string;
  auteur?: string;
  discipline: Fiche['discipline'];
  portee: Portee;
  /** Toutes les langues de l'ouvrage, pas seulement celle de la page. */
  langues: Langue[];
  monoVolume: boolean;
  volumes: VolumeEnVitrine[];
};

/**
 * Les oeuvres du catalogue, dans cette langue, eventuellement d'une seule
 * discipline.
 *
 * L'ordre des oeuvres est celui de l'index — donc des manifestes — et celui des
 * volumes leur numero : deux fabrications donnent le meme catalogue.
 */
export function vitrine(
  fiches: readonly Fiche[],
  langue: Langue,
  discipline: string | null = null,
): OeuvreEnVitrine[] {
  // Langues et volumes se comptent sur TOUTES les fiches de l'ouvrage : un
  // volume absent dans une langue ne fait pas d'un ouvrage a deux volumes un
  // ouvrage mono-volume dans cette langue-la.
  const languesParOuvrage = new Map<string, Langue[]>();
  const volumesParOuvrage = new Map<string, Set<number>>();
  for (const fiche of fiches) {
    const langues = languesParOuvrage.get(fiche.ouvrage) ?? [];
    if (!langues.includes(fiche.langue)) langues.push(fiche.langue);
    languesParOuvrage.set(fiche.ouvrage, langues);

    const volumes = volumesParOuvrage.get(fiche.ouvrage) ?? new Set<number>();
    volumes.add(fiche.volume);
    volumesParOuvrage.set(fiche.ouvrage, volumes);
  }

  const parOuvrage = new Map<string, OeuvreEnVitrine>();
  for (const fiche of fiches) {
    if (fiche.langue !== langue) continue;
    if (discipline && fiche.discipline.slug !== discipline) continue;

    let oeuvre = parOuvrage.get(fiche.ouvrage);
    if (!oeuvre) {
      oeuvre = {
        ouvrage: fiche.ouvrage,
        titre: fiche.oeuvre.titre,
        edition: fiche.oeuvre.edition,
        auteur: fiche.auteur,
        discipline: fiche.discipline,
        portee: fiche.portee,
        langues: languesParOuvrage.get(fiche.ouvrage)!,
        monoVolume: volumesParOuvrage.get(fiche.ouvrage)!.size === 1,
        volumes: [],
      };
      parOuvrage.set(fiche.ouvrage, oeuvre);
    }

    oeuvre.volumes.push({
      slug: fiche.slug,
      volume: fiche.volume,
      titre: fiche.titre,
      accroche: fiche.accroche,
      prix: formaterPrix(fiche.prix, fiche.devise, langue),
      couverture: fiche.couverture,
      sommaire: fiche.sommaire,
      chapitres: fiche.chapitres.length,
      figures: fiche.figures,
      formats: fiche.formats,
    });
  }

  const oeuvres = [...parOuvrage.values()];
  for (const oeuvre of oeuvres) oeuvre.volumes.sort((a, b) => a.volume - b.volume);
  return oeuvres;
}
