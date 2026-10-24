/**
 * src/verification/cibles.ts
 * Zakali Press — ce que `npm run verifier` demande au site en ligne.
 *
 * Regle 10.3 — la verification qui compte est le 403. Viser un fichier absent
 * donnerait 404, ce qui est sur mais ne prouve rien sur le controle d'acces :
 * les cibles reservees sont donc prises DANS L'INDEX, la ou la porte les
 * connait.
 *
 * Tout est choisi dans l'index deploye, jamais ecrit a la main : la
 * verification suit le catalogue quand il change.
 */

import type { EntreeDIndex, Fiche, Index } from '@/index/index';

export type Cibles = {
  fiche: Fiche;
  /** Une page de chapitre offerte : relayee, 200 (regle 8.4). */
  chapitreOffert: string;
  /** Une feuille de style offerte : relayee aussi. */
  feuille: string;
  /** Une page de chapitre reservee : 403. */
  pageReservee: string;
  /** Un fichier reserve, qui n'est pas une page : 403 nu. */
  fichierReserve: string;
  /** Une video offerte : redirigee, puis servie par plages. */
  video: string | null;
  couverture: string | null;
  extrait: string | null;
};

export function ciblesDeVerification(index: Index): Cibles {
  // La fiche la plus complete : un extrait, une couverture, un chapitre offert.
  const fiche =
    index.fiches.find((f) => f.extrait && f.couverture && f.chapitres.some((c) => c.offert)) ??
    index.fiches.find((f) => f.chapitres.some((c) => c.offert));
  if (!fiche) throw new Error('L’index ne porte aucune fiche avec un chapitre offert.');

  const deLEdition = (entree: EntreeDIndex) => entree.adresse.startsWith(`${fiche.clefDOeuvre}/${fiche.langue}/`);
  const trouver = (critere: (entree: EntreeDIndex) => boolean) =>
    index.entrees.find((entree) => deLEdition(entree) && critere(entree))?.adresse ?? null;
  const exiger = (nom: string, adresse: string | null) => {
    if (!adresse) throw new Error(`L’index ne porte pas de ${nom} pour ${fiche.slug}.`);
    return adresse;
  };

  return {
    fiche,
    chapitreOffert: fiche.chapitres.find((c) => c.offert)!.adresse,
    feuille: exiger('feuille offerte', trouver((e) => e.acces === 'offert' && e.fichier.endsWith('.css'))),
    pageReservee: exiger('chapitre reserve', fiche.chapitres.find((c) => !c.offert)?.adresse ?? null),
    fichierReserve: exiger('fichier reserve', trouver((e) => e.acces === 'reserve' && e.sorte !== 'page')),
    video: trouver((e) => e.acces === 'offert' && e.sorte === 'video'),
    couverture: fiche.couverture,
    extrait: fiche.extrait?.adresse ?? null,
  };
}
