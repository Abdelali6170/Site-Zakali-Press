/**
 * src/app/[langue]/page.tsx
 * Zakali Press — accueil.
 *
 * Deux sources, jamais melangees :
 *   - les TEXTES de la maison viennent du contenu editorial versionne
 *     (`src/contenu/editorial/accueil.json`, regle 7.3) ;
 *   - les OUVRAGES et les CHIFFRES viennent de l'index : l'oeuvre a la une,
 *     le nombre de volumes, de langues, de figures, les disciplines. Une
 *     nouvelle parution les change sans qu'aucun texte soit retouche.
 *
 * Page statique : prerendue pour chaque langue.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';

import { texteDAccueil } from '@/contenu/editorial';
import { indexDuSite } from '@/index/charge';
import { estLangue, langue as decrire } from '@/i18n/langues';
import { chemin, cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';
import { vueDAccueil } from '@/ouvrages/accueil';

type Proprietes = { params: Promise<{ langue: string }> };

export async function generateMetadata({ params }: Proprietes): Promise<Metadata> {
  const { langue: code } = await params;
  if (!estLangue(code)) return {};
  const texte = texteDAccueil(code);
  return { title: `Zakali Press — ${texte.titre}`, description: texte.accroche };
}

/** Les pictogrammes des trois promesses : un livre, une lecture video, un fichier. */
const PICTOGRAMMES = [
  <path key="livre" d="M4 5.5C4 4.7 4.7 4 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM13 4h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13V4Z" />,
  <path key="video" d="M4 6.5C4 5.7 4.7 5 5.5 5h13c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11ZM10 9.2v5.6l4.8-2.8L10 9.2Z" />,
  <path key="pdf" d="M6.5 3h7.3L19 8.2V19.5c0 .8-.7 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15C5 3.7 5.7 3 6.5 3ZM13 4.5V9h4.5M8 13h8M8 16.5h6" />,
];

export default async function Accueil({ params }: Proprietes) {
  const { langue: code } = await params;
  if (!estLangue(code)) notFound();

  const t = traducteur(code);
  const texte = texteDAccueil(code);
  const vue = vueDAccueil(indexDuSite().index.fiches, code);
  const nombre = new Intl.NumberFormat(decrire(code).locale);

  // L'eventail : le deuxieme volume devant, le premier et le troisieme de
  // part et d'autre — l'oeil lit une serie, pas une couverture isolee.
  const eventail = vue.aLaUne
    ? [vue.aLaUne.volumes[1], vue.aLaUne.volumes[0], vue.aLaUne.volumes[2]].filter(Boolean)
    : [];

  return (
    <div className="accueil">
      <section className="une">
        <div className="une-corps">
          <div className="une-texte">
            <p className="oeuvre-discipline">{texte.surtitre}</p>
            <h1>{texte.titre}</h1>
            <p className="une-accroche">{texte.accroche}</p>

            <div className="fiche-actions">
              <a className="bouton bouton-principal" href={chemin(code, 'catalogue')}>
                {t('accueil.explorer')}
              </a>
              {vue.chapitreOffert && (
                <a
                  className="bouton bouton-discret"
                  href={cheminDeLecture(code, vue.chapitreOffert.slug, vue.chapitreOffert.rang)}
                >
                  {t('accueil.lireOffert')}
                </a>
              )}
            </div>

            <dl className="chiffres">
              <div>
                <dt>{t('accueil.chiffresVolumes')}</dt>
                <dd>{nombre.format(vue.chiffres.volumes)}</dd>
              </div>
              <div>
                <dt>{t('accueil.chiffresLangues')}</dt>
                <dd>{nombre.format(vue.chiffres.langues)}</dd>
              </div>
              {vue.chiffres.figures > 0 && (
                <div>
                  <dt>{t('accueil.chiffresFigures')}</dt>
                  <dd>{nombre.format(vue.chiffres.figures)}</dd>
                </div>
              )}
            </dl>
          </div>

          {eventail.length > 0 && (
            <div className={`eventail eventail-${eventail.length}`} aria-hidden="true">
              {eventail.map(
                (volume, rang) =>
                  volume.couverture && (
                    <div className={`eventail-couverture rang-${rang}`} key={volume.slug}>
                      <Image
                        src={cheminDeContenu(volume.couverture)}
                        alt=""
                        fill
                        sizes="260px"
                        preload={rang === 0}
                      />
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      </section>

      <section className="enveloppe promesses">
        {texte.promesses.map((promesse, rang) => (
          <div className="promesse" key={promesse.titre}>
            <svg className="pictogramme" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
              {PICTOGRAMMES[rang % PICTOGRAMMES.length]}
            </svg>
            <h2>{promesse.titre}</h2>
            <p>{promesse.texte}</p>
          </div>
        ))}
      </section>

      {vue.aLaUne && (
        <section className="enveloppe alaune" aria-labelledby="a-la-une">
          <div className="alaune-tete">
            <div>
              <p className="oeuvre-discipline">{t('accueil.aLaUne')}</p>
              <h2 id="a-la-une">{vue.aLaUne.titre}</h2>
              <p className="oeuvre-mentions">
                {[
                  vue.aLaUne.edition,
                  vue.aLaUne.auteur && t('catalogue.par', { auteur: vue.aLaUne.auteur }),
                  vue.aLaUne.monoVolume
                    ? t('catalogue.volumeUnique')
                    : t('catalogue.volumes', { n: vue.aLaUne.volumes.length }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <a
              className="bouton bouton-discret"
              href={chemin(code, 'catalogue', { requete: { discipline: vue.aLaUne.discipline.slug } })}
            >
              {t('accueil.voirOeuvre')}
            </a>
          </div>

          <ul className="couvertures">
            {vue.aLaUne.volumes.map((volume) => (
              <li key={volume.slug}>
                <a href={chemin(code, 'catalogue', { slug: volume.slug })}>
                  <span className="carte-couverture">
                    {volume.couverture && (
                      <Image
                        src={cheminDeContenu(volume.couverture)}
                        alt=""
                        fill
                        sizes="(max-width: 700px) 45vw, 200px"
                      />
                    )}
                  </span>
                  <span className="couvertures-titre">{volume.titre}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vue.disciplines.length > 0 && (
        <section className="enveloppe disciplines-accueil" aria-labelledby="par-discipline">
          <h2 id="par-discipline">{t('accueil.disciplines')}</h2>
          <ul>
            {vue.disciplines.map((discipline) => (
              <li key={discipline.slug}>
                <a href={chemin(code, 'catalogue', { requete: { discipline: discipline.slug } })}>
                  <span className="oeuvre-discipline">{discipline.famille}</span>
                  <span className="discipline-nom">{discipline.libelle}</span>
                  <span className="discipline-mesure">
                    {discipline.oeuvres === 1
                      ? t('accueil.oeuvre')
                      : t('accueil.oeuvres', { n: discipline.oeuvres })}
                    {' · '}
                    {discipline.volumes === 1
                      ? t('catalogue.volumeUnique')
                      : t('catalogue.volumes', { n: discipline.volumes })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {vue.chapitreOffert && (
        <section className="appel">
          <div className="appel-corps">
            <h2>{texte.appel.titre}</h2>
            <p>{texte.appel.texte}</p>
            <a
              className="bouton bouton-or"
              href={cheminDeLecture(code, vue.chapitreOffert.slug, vue.chapitreOffert.rang)}
            >
              {t('accueil.lireOffert')}
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
