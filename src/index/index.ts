/**
 * src/index/index.ts
 * Zakali Press — la forme de l'index, et sa consultation.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  L'INDEX EST L'UNIQUE AUTORITE SUR CE QUI EXISTE ET SUR CE QUI EST OFFERT.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Regle 4.1 — aucun chemin ne vient d'une requete. Une adresse demandee est
 * CHERCHEE ici, jamais concatenee a un chemin ni a une clef de stockage. Une
 * adresse absente de l'index n'atteint rien.
 *
 * C'est la propriete la plus importante de tout le systeme : la traversee de
 * repertoire devient impossible PAR CONSTRUCTION, et non par filtrage.
 *
 * Regle 4.5 — l'index porte aussi les fiches du catalogue. Il n'existe pas de
 * table des ouvrages.
 */

import type { Langue } from '@/i18n/langues';
import type { Portee } from '@/ouvrages/manifeste';

/**
 * La version de la FORME de l'index.
 *
 * Le site refuse un index d'une autre version plutot que de l'interpreter de
 * travers : un artefact versionne survit aux branches, et une forme changee en
 * silence donnerait un catalogue muet sans message.
 */
export const VERSION_DE_L_INDEX = 1;

export type NiveauDAcces = 'offert' | 'reserve';

export type SorteDEntree =
  | 'page'
  | 'ressource'
  | 'narration'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'couverture';

export type EntreeDIndex = {
  /** `<clef d'oeuvre>/<langue>/<chemin>` — c'est aussi la clef de stockage (regle 4.2). */
  adresse: string;
  /**
   * Le chemin du fichier, relatif a la racine du quai, en separateurs POSIX.
   *
   * Il ne sort jamais de l'index : c'est le seul endroit ou une adresse
   * publique rejoint un fichier reel.
   */
  fichier: string;
  octets: number;
  sorte: SorteDEntree;
  acces: NiveauDAcces;
};

export type ChapitreDeFiche = {
  titre: string;
  adresse: string;
  numero: number | null;
  suffixe: string;
  offert: boolean;
  figures: number;
};

export type FichierDeFiche = { adresse: string; nom: string; octets: number };

/** Une fiche de catalogue : une edition linguistique d'un volume. */
export type Fiche = {
  /** Ce qui relie les editions d'un meme volume (regle 1.5). */
  clefDOeuvre: string;
  ouvrage: string;
  volume: number;
  langue: Langue;
  /** L'identifiant d'adresse — ce qu'une commande designe (regle 5.6). */
  slug: string;
  titre: string;
  accroche: string;
  description: string;
  /** En centimes. Formate a l'affichage, jamais avant (regle 8.2). */
  prix: number;
  devise: string;
  enAvant: boolean;
  portee: Portee;
  auteur?: string;
  oeuvre: { titre: string; edition?: string };
  discipline: { slug: string; libelle: string; famille: string };
  /** L'adresse du sommaire du volume. */
  sommaire: string;
  couverture: string | null;
  /** La mention lue dans la preface, quand il y en a une (regle 1.9). */
  licence: string | null;
  chapitres: ChapitreDeFiche[];
  figures: number;
  /** Des badges, pas des articles : rien de tout cela ne se vend a part (regle 8.3). */
  formats: { pdf: boolean; video: boolean; audio: boolean };
  pdfs: FichierDeFiche[];
};

export type Index = {
  version: number;
  fabriqueLe: string;
  fiches: Fiche[];
  entrees: EntreeDIndex[];
};

/**
 * L'index charge, pret a etre consulte.
 *
 * La table est construite une fois au demarrage. Le site ne lit jamais de
 * disque ensuite (regle 4.1).
 */
export type IndexCharge = {
  index: Index;
  parAdresse: ReadonlyMap<string, EntreeDIndex>;
  parSlug: ReadonlyMap<string, Fiche>;
};

export function chargerIndex(index: Index): IndexCharge {
  if (index.version !== VERSION_DE_L_INDEX) {
    throw new Error(
      `Index de version ${index.version}, alors que ce site attend la version ` +
        `${VERSION_DE_L_INDEX}. Refabriquer l'index (npm run index).`,
    );
  }
  const parAdresse = new Map(index.entrees.map((entree) => [entree.adresse, entree]));
  const parSlug = new Map(index.fiches.map((fiche) => [`${fiche.langue}/${fiche.slug}`, fiche]));
  return { index, parAdresse, parSlug };
}

/**
 * L'entree correspondant a une adresse demandee, ou `undefined`.
 *
 * C'est la SEULE facon d'atteindre un fichier d'ouvrage. Rien ici ne
 * construit, ne nettoie ni ne normalise l'adresse recue : elle est cherchee
 * telle quelle. Une adresse malicieuse ne correspond a rien, sans qu'aucun
 * filtre ait eu a la reconnaitre.
 */
export function entreeDe(charge: IndexCharge, adresse: string): EntreeDIndex | undefined {
  return charge.parAdresse.get(adresse);
}

/** La fiche d'une edition, depuis son identifiant d'adresse. */
export function ficheDe(charge: IndexCharge, langue: Langue, slug: string): Fiche | undefined {
  return charge.parSlug.get(`${langue}/${slug}`);
}
