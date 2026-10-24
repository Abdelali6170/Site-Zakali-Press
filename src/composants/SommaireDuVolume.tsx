/**
 * src/composants/SommaireDuVolume.tsx
 * Zakali Press — la liste des chapitres d'un volume.
 *
 * Composant serveur, partage par la fiche et par la page d'un chapitre
 * reserve. Chaque chapitre mene a la liseuse : l'offert s'y lit, le reserve y
 * explique ce qu'il faut pour le lire. Aucun ne mene a une impasse.
 */

import type { ChapitreDeFiche } from '@/index/index';
import type { Langue } from '@/i18n/langues';
import { cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

type Proprietes = {
  langue: Langue;
  slug: string;
  chapitres: ChapitreDeFiche[];
  /** Le rang du chapitre affiche, s'il y en a un : il est marque dans la liste. */
  courant?: number;
};

export default function SommaireDuVolume({ langue, slug, chapitres, courant }: Proprietes) {
  const t = traducteur(langue);

  return (
    <ol className="chapitres">
      {chapitres.map((chapitre, place) => {
        const rang = place + 1;
        const classes = ['chapitre', chapitre.offert && 'est-offert', rang === courant && 'est-courant']
          .filter(Boolean)
          .join(' ');
        return (
          <li className={classes} key={chapitre.adresse}>
            <a
              href={cheminDeLecture(langue, slug, rang)}
              aria-current={rang === courant ? 'page' : undefined}
            >
              {chapitre.titre}
            </a>
            <span className="chapitre-mentions">
              {chapitre.figures > 0 &&
                (chapitre.figures === 1 ? t('fiche.figure') : t('fiche.figures', { n: chapitre.figures }))}
              <span className={`etiquette${chapitre.offert ? ' etiquette-offerte' : ''}`}>
                {chapitre.offert ? t('fiche.offert') : t('fiche.reserve')}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
