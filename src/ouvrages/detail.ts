/**
 * src/ouvrages/detail.ts
 * Zakali Press — ce que la fiche d'un volume montre, calcule depuis l'index.
 *
 * Fonction pure, comme la vitrine : elle recoit les fiches et ne charge rien.
 *
 * Regle 7.4 — depuis une fiche, changer de langue mene a la MEME fiche dans
 * l'autre langue. Les identifiants d'adresse sont traduits
 * (`biologie-volume-i`, `biology-volume-i`) ; le selecteur de langue garde
 * donc l'identifiant courant, et c'est ICI qu'un identifiant d'une autre
 * langue est reconnu et renvoye vers l'edition de la meme oeuvre — ou vers
 * rien, si l'oeuvre n'existe pas dans cette langue.
 */

import type { ChapitreDeFiche, Fiche } from '@/index/index';
import { langue as decrire, type Langue } from '@/i18n/langues';
import type { Portee } from '@/ouvrages/manifeste';
import { formaterPrix } from '@/ouvrages/prix';

export type FichierEnVitrine = { adresse: string; nom: string; taille: string };

export type DetailDuVolume = {
  slug: string;
  langue: Langue;
  volume: number;
  titre: string;
  accroche: string;
  /** Les paragraphes de la description, dans l'ordre du manifeste. */
  description: string[];
  /** Deja formate (regle 8.2). */
  prix: string;
  portee: Portee;
  oeuvre: { titre: string; edition?: string; auteur?: string; volumes: number };
  discipline: Fiche['discipline'];
  couverture: string | null;
  sommaire: string;
  licence: string | null;
  chapitres: ChapitreDeFiche[];
  /** Le rang du premier chapitre offert, a partir de 1 : la porte d'entree du lecteur. */
  premierOffert: number | null;
  figures: number;
  formats: Fiche['formats'];
  pdfs: FichierEnVitrine[];
  /** L'extrait gratuit, relie et offert — ou `null` (regle 6.7). */
  extrait: FichierEnVitrine | null;
  /** La meme edition dans les autres langues de l'oeuvre (regle 7.4). */
  autresLangues: { langue: Langue; slug: string }[];
  /** Les autres volumes de l'oeuvre, dans cette langue. */
  autresVolumes: { slug: string; volume: number; titre: string }[];
};

export type Recherche =
  | { statut: 'trouve'; detail: DetailDuVolume }
  /** L'identifiant est celui d'une autre langue : l'edition voulue est ailleurs. */
  | { statut: 'ailleurs'; slug: string }
  | { statut: 'introuvable' };

/** La place du premier chapitre offert dans le sommaire, a partir de 1 — ou `null`. */
export function rangDuPremierOffert(chapitres: readonly ChapitreDeFiche[]): number | null {
  const place = chapitres.findIndex((c) => c.offert);
  return place >= 0 ? place + 1 : null;
}

/** Les octets d'un fichier, dans la langue : `57 Mo`, `57 MB`. */
function formaterTaille(octets: number, langue: Langue): string {
  return new Intl.NumberFormat(decrire(langue).locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 0,
  }).format(octets / 1_000_000);
}

export function detailDuVolume(fiches: readonly Fiche[], langue: Langue, slug: string): Recherche {
  const fiche = fiches.find((f) => f.langue === langue && f.slug === slug);

  if (!fiche) {
    // Un identifiant d'une autre langue : la meme oeuvre existe-t-elle ici ?
    const etrangere = fiches.find((f) => f.slug === slug);
    const ici = etrangere && fiches.find((f) => f.clefDOeuvre === etrangere.clefDOeuvre && f.langue === langue);
    return ici ? { statut: 'ailleurs', slug: ici.slug } : { statut: 'introuvable' };
  }

  const memeOuvrage = fiches.filter((f) => f.ouvrage === fiche.ouvrage);
  const volumes = new Set(memeOuvrage.map((f) => f.volume));
  const description = fiche.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  // La mention lue dans la preface (regle 1.9) n'est rappelee que si la
  // description ne la porte pas deja : la meme phrase deux fois sur la fiche
  // serait un defaut, pas un scrupule.
  const licence =
    fiche.licence && !description.some((p) => p.includes(fiche.licence!)) ? fiche.licence : null;

  return {
    statut: 'trouve',
    detail: {
      slug: fiche.slug,
      langue,
      volume: fiche.volume,
      titre: fiche.titre,
      accroche: fiche.accroche,
      description,
      prix: formaterPrix(fiche.prix, fiche.devise, langue),
      portee: fiche.portee,
      oeuvre: {
        titre: fiche.oeuvre.titre,
        edition: fiche.oeuvre.edition,
        auteur: fiche.auteur,
        volumes: volumes.size,
      },
      discipline: fiche.discipline,
      couverture: fiche.couverture,
      sommaire: fiche.sommaire,
      licence,
      chapitres: fiche.chapitres,
      premierOffert: rangDuPremierOffert(fiche.chapitres),
      figures: fiche.figures,
      formats: fiche.formats,
      pdfs: fiche.pdfs.map((p) => ({ adresse: p.adresse, nom: p.nom, taille: formaterTaille(p.octets, langue) })),
      extrait: fiche.extrait
        ? {
            adresse: fiche.extrait.adresse,
            nom: fiche.extrait.nom,
            taille: formaterTaille(fiche.extrait.octets, langue),
          }
        : null,
      autresLangues: fiches
        .filter((f) => f.clefDOeuvre === fiche.clefDOeuvre && f.langue !== langue)
        .map((f) => ({ langue: f.langue, slug: f.slug })),
      autresVolumes: memeOuvrage
        .filter((f) => f.langue === langue && f.volume !== fiche.volume)
        .sort((a, b) => a.volume - b.volume)
        .map((f) => ({ slug: f.slug, volume: f.volume, titre: f.titre })),
    },
  };
}
