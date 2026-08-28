/**
 * src/quai/sommaire.ts
 * Zakali Press — les chapitres d'un volume viennent de son sommaire.
 *
 * Regle 2.2 — un chapitre est un LIEN DE SOMMAIRE, pas un fichier trouve.
 * Regle 2.3 — le suffixe de lettre fait partie de l'identite d'un chapitre.
 *
 * Parcourir le dossier donnerait des fichiers dans l'ordre alphabetique, sans
 * titres, et ramasserait des pages qui ne sont pas des chapitres. C'est
 * l'ordre du sommaire qui fait foi.
 */

import { attributs, porteLaClasse, texteBrut } from '@/quai/html';

/** Une entree du sommaire : ou elle mene, et sous quel titre. */
export type EntreeDeSommaire = {
  /** Chemin relatif a la racine du volume, sans `./`, sans ancre ni requete. */
  adresse: string;
  titre: string;
};

export type ChapitreDeSommaire = EntreeDeSommaire & {
  /**
   * Le numero lu dans le nom du fichier, quand il y en a un. C'est lui qui
   * relie le chapitre a son dossier de medias `chNN`.
   *
   * `null` pour une source qui ne numerote pas ses fichiers : le chapitre
   * existe, il n'a simplement pas de figures commentees (regle 1.9).
   */
  numero: number | null;
  /**
   * La lettre qui suit le numero. `chapter_31a` et `chapter_31b` sont DEUX
   * chapitres, mais ils partagent le dossier de medias `ch31` (regle 2.3).
   */
  suffixe: string;
};

export type Sommaire = {
  /** La page d'accueil du volume — le sommaire lui-meme. */
  accueil: EntreeDeSommaire | null;
  /** La preface, quand le volume en a une. Facultative (regle 1.9). */
  preface: EntreeDeSommaire | null;
  chapitres: ChapitreDeSommaire[];
  /** Ce que le sommaire portait et qu'on a ecarte, avec la raison. */
  ecartes: string[];
};

/**
 * Un lien de sommaire donne une adresse : c'est le seul endroit ou une valeur
 * LUE devient un chemin. Elle est donc verifiee ici, une fois pour toutes.
 *
 * Le controle d'acces, lui, ne repose pas la-dessus : une adresse absente de
 * l'index n'atteint rien, quelle que soit sa forme (regle 4.1). Cette
 * verification empeche simplement une page mal rendue d'inscrire un chemin
 * remontant dans l'index.
 */
function adresseDeVolume(href: string): string | null {
  const sansAncre = href.split('#')[0].split('?')[0];
  if (!sansAncre) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(sansAncre)) return null; // http:, mailto:, data:
  if (sansAncre.startsWith('/')) return null; // absolue : hors du volume
  if (sansAncre.includes('\\')) return null;

  const normalise = sansAncre.replace(/^\.\//, '');
  if (normalise === '' || normalise.endsWith('/')) return null;
  if (normalise.split('/').includes('..')) return null;
  return normalise;
}

/** `chapters/chapter_31a.fr.html` → `chapter_31a`. */
function souche(adresse: string): string {
  const dernier = adresse.slice(adresse.lastIndexOf('/') + 1);
  const point = dernier.indexOf('.');
  return point === -1 ? dernier : dernier.slice(0, point);
}

/** `chapter_31a` → `{ numero: 31, suffixe: 'a' }`. `chapitre-un` → numero nul. */
function numeroterDepuisLeNom(nomDeFichier: string): { numero: number | null; suffixe: string } {
  const marque = /(\d+)([a-z]*)$/i.exec(nomDeFichier);
  if (!marque) return { numero: null, suffixe: '' };
  return { numero: Number(marque[1]), suffixe: marque[2].toLowerCase() };
}

/**
 * Le fil d'Ariane et le pied de page « chapitre suivant » portent la meme
 * classe `chapter-title` que les liens du sommaire — mais pas sur la meme
 * balise : eux la portent sur le lien lui-meme, le sommaire la porte sur un
 * `span` A L'INTERIEUR d'un lien de classe `sidebar-link`. C'est cette
 * difference de structure, et elle seule, qui les separe (regle 2.2).
 */
const LIEN_DE_SOMMAIRE = /<a\b([^>]*)>\s*<span class="chapter-title">([\s\S]*?)<\/span>/g;

/**
 * Lit le sommaire d'un volume depuis son `index.html`.
 *
 * La preface se reconnait a la souche de son nom de fichier — `preface.html`,
 * `preface.fr.html`, `preface.es.html`. C'est le seul repere du document : rien
 * dans le balisage ne distingue une preface d'un chapitre, et l'ordre ne suffit
 * pas — un volume peut n'avoir aucune preface (regle 1.9).
 */
export function lireSommaire(html: string): Sommaire {
  const debut = html.indexOf('sidebar-menu-container');
  const zone = debut === -1 ? html : html.slice(debut);

  let accueil: EntreeDeSommaire | null = null;
  let preface: EntreeDeSommaire | null = null;
  const chapitres: ChapitreDeSommaire[] = [];
  const ecartes: string[] = [];
  const vues = new Set<string>();

  for (const trouve of zone.matchAll(LIEN_DE_SOMMAIRE)) {
    const attribut = attributs(trouve[1]);
    if (!porteLaClasse(attribut.class, 'sidebar-link')) continue;

    const adresse = adresseDeVolume(attribut.href ?? '');
    if (!adresse) {
      ecartes.push(`lien de sommaire inutilisable : « ${attribut.href ?? ''} »`);
      continue;
    }
    if (vues.has(adresse)) continue; // le lien de la page courante est aussi « active »
    vues.add(adresse);

    const entree: EntreeDeSommaire = { adresse, titre: texteBrut(trouve[2]) };
    const nom = souche(adresse);

    if (adresse === 'index.html') {
      accueil ??= entree;
    } else if (/^preface/i.test(nom)) {
      preface ??= entree;
    } else {
      chapitres.push({ ...entree, ...numeroterDepuisLeNom(nom) });
    }
  }

  return { accueil, preface, chapitres, ecartes };
}
