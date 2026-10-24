/**
 * src/porte/porte.ts
 * Zakali Press — la porte unique du contenu des ouvrages : qui passe.
 *
 * Toute adresse `/contenu/…` arrive ici. La decision ne regarde que l'index :
 *
 *   - regle 4.1 — une adresse absente de l'index n'atteint rien. Elle est
 *     CHERCHEE, jamais composee en chemin : une adresse malicieuse ne
 *     correspond a rien, sans qu'aucun filtre ait eu a la reconnaitre ;
 *   - regle 4.3 — ce qui est offert l'est par l'index ; le reste est reserve,
 *     et repond 403, pas 404 : le lecteur doit savoir que la page existe.
 *
 * Les comptes n'existent pas encore : personne n'a donc de droit sur le
 * reserve. Le jour ou ils arrivent, c'est ICI que le droit s'ajoute, et nulle
 * part ailleurs.
 */

import { entreeDe, type EntreeDIndex, type IndexCharge } from '@/index/index';

export type Decision =
  | { statut: 404 }
  | { statut: 403; entree: EntreeDIndex }
  | { statut: 200; entree: EntreeDIndex }
  /** Une adresse de dossier dont la page d'accueil est indexee : on y renvoie. */
  | { statut: 308; vers: string };

export function decider(charge: IndexCharge, adresse: string): Decision {
  const entree = entreeDe(charge, adresse);
  if (!entree) {
    // `quarto-nav.js` retire `index.html` des liens des qu'une page n'est pas
    // ouverte depuis le disque : le lien vers le sommaire devient `…/fr/`. On
    // renvoie vers la page elle-meme plutot que de la servir sous l'adresse du
    // dossier — ses liens relatifs partiraient d'un cran trop haut. L'adresse
    // visee est CHERCHEE dans l'index, comme toute autre (regle 4.1).
    const accueil = `${adresse.replace(/\/+$/, '')}/index.html`;
    if (adresse && entreeDe(charge, accueil)) return { statut: 308, vers: accueil };

    // Regle 4.7 — une page de chapitre calcule l'adresse de ses medias en
    // relatif, depuis SON dossier : `chapitres_fr/media/video/ch01/…`. Le quai
    // les range a l'ouvrage, et l'index les connait a `media/video/ch01/…` de
    // l'edition. On renvoie a cette adresse si elle est indexee — dans la meme
    // edition, et nulle part ailleurs. Le droit s'y verifie ensuite comme pour
    // tout fichier.
    const media = /^([^/]+\/[^/]+)\/.+\/(media\/(?:video|audio|narration)\/ch\d+\/[^/]+)$/.exec(adresse);
    if (media) {
      const canonique = `${media[1]}/${media[2]}`;
      if (entreeDe(charge, canonique)) return { statut: 308, vers: canonique };
    }
    return { statut: 404 };
  }
  if (entree.acces !== 'offert') return { statut: 403, entree };
  return { statut: 200, entree };
}
