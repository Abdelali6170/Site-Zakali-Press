/**
 * src/composants/CarteVolume.tsx
 * Zakali Press — un volume, dans le catalogue.
 *
 * Composant serveur. Il recoit le volume deja mis en vitrine : le prix y est
 * une chaine (regle 8.2), et la carte ne fait aucun calcul.
 *
 * La couverture passe par la porte unique et par l'optimiseur d'images de
 * Next : l'original fait plusieurs mega-octets, la carte en recoit quelques
 * dizaines de kilo-octets. Sans couverture, l'aplat garde l'encombrement
 * (regle 8.6) — la grille ne saute pas.
 */

import Image from 'next/image';

import type { Langue } from '@/i18n/langues';
import { chemin, cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';
import type { VolumeEnVitrine } from '@/ouvrages/vitrine';

type Proprietes = {
  langue: Langue;
  volume: VolumeEnVitrine;
  /** La couverture de la premiere carte est chargee d'emblee : elle est a l'ecran. */
  premiere: boolean;
};

export default function CarteVolume({ langue, volume, premiere }: Proprietes) {
  const t = traducteur(langue);
  const formats = (['pdf', 'video', 'audio'] as const).filter((f) => volume.formats[f]);

  const fiche = chemin(langue, 'catalogue', { slug: volume.slug });

  return (
    <li className="carte">
      {/* La couverture mene a la fiche, comme le titre ; elle est retiree du
          clavier et des lecteurs d'ecran pour que le lien ne s'annonce qu'une fois. */}
      <a className="carte-couverture" href={fiche} tabIndex={-1} aria-hidden="true">
        {volume.couverture && (
          <Image
            src={cheminDeContenu(volume.couverture)}
            // Le titre suit la couverture : la decrire le ferait lire deux fois.
            alt=""
            fill
            sizes="(max-width: 700px) 45vw, 260px"
            preload={premiere}
          />
        )}
      </a>

      <div className="carte-corps">
        <h3 className="carte-titre">
          <a href={fiche}>{volume.titre}</a>
        </h3>
        <p className="carte-accroche">{volume.accroche}</p>

        <p className="carte-mesures">
          {volume.chapitres === 1
            ? t('catalogue.chapitre')
            : t('catalogue.chapitres', { n: volume.chapitres })}
          {volume.formats.video && volume.figures > 0 && (
            <> · {t('catalogue.figures', { n: volume.figures })}</>
          )}
        </p>

        {formats.length > 0 && (
          <ul className="badges" aria-label={t('catalogue.formats')}>
            {formats.map((format) => (
              <li className="badge" key={format}>
                {t(`format.${format}`)}
              </li>
            ))}
          </ul>
        )}

        <div className="carte-pied">
          <span className="prix">{volume.prix}</span>
          <a
            className="bouton bouton-discret"
            href={cheminDeLecture(langue, volume.slug)}
            aria-label={t('catalogue.feuilleterLe', { titre: volume.titre })}
          >
            {t('catalogue.feuilleter')}
          </a>
        </div>
      </div>
    </li>
  );
}
