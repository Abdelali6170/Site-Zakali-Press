/**
 * src/app/[langue]/catalogue/[slug]/page.tsx
 * Zakali Press — la fiche d'un volume, dans une langue.
 *
 * Tout vient de l'index (regle 4.5). Les fiches connues sont prerendues ; une
 * adresse inconnue est examinee a la demande :
 *
 *   - regle 7.4 — un identifiant d'une AUTRE langue redirige vers l'edition de
 *     la meme oeuvre dans celle-ci. C'est ce qui permet au selecteur de langue
 *     de garder l'identifiant courant et de mener a la meme fiche traduite ;
 *   - sinon, 404 franc.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';

import { indexDuSite } from '@/index/charge';
import { estLangue, langue as decrire, type Langue } from '@/i18n/langues';
import SommaireDuVolume from '@/composants/SommaireDuVolume';
import { chemin, cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';
import { detailDuVolume } from '@/ouvrages/detail';

type Proprietes = { params: Promise<{ langue: string; slug: string }> };

export function generateStaticParams({ params }: { params: { langue: string } }) {
  return indexDuSite()
    .index.fiches.filter((f) => f.langue === params.langue)
    .map((f) => ({ slug: f.slug }));
}

/** Un `%` isole n'est pas un echappement : l'identifiant reste tel quel, et ne trouvera rien. */
function decoder(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** La fiche demandee, ou la redirection / le 404 qu'elle appelle. */
async function chercher({ params }: Proprietes) {
  const { langue: code, slug } = await params;
  if (!estLangue(code)) notFound();

  const recherche = detailDuVolume(indexDuSite().index.fiches, code, decoder(slug));
  if (recherche.statut === 'ailleurs') redirect(chemin(code, 'catalogue', { slug: recherche.slug }));
  if (recherche.statut === 'introuvable') notFound();
  return { code: code as Langue, detail: recherche.detail };
}

export async function generateMetadata(proprietes: Proprietes): Promise<Metadata> {
  const { detail } = await chercher(proprietes);
  return { title: `${detail.titre} — Zakali Press`, description: detail.accroche };
}

export default async function FicheDuVolume(proprietes: Proprietes) {
  const { code, detail } = await chercher(proprietes);
  const t = traducteur(code);
  const langues = detail.autresLangues.length + 1;

  return (
    <div className="enveloppe fiche">
      <nav className="fil" aria-label={t('fiche.fil')}>
        <a href={chemin(code, 'catalogue')}>{t('catalogue.titre')}</a>
        <span aria-hidden="true">›</span>
        <a href={chemin(code, 'catalogue', { requete: { discipline: detail.discipline.slug } })}>
          {detail.discipline.libelle}
        </a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{detail.oeuvre.titre}</span>
      </nav>

      <div className="fiche-tete">
        <div className="carte-couverture fiche-couverture">
          {detail.couverture && (
            <Image
              src={cheminDeContenu(detail.couverture)}
              alt=""
              fill
              sizes="(max-width: 700px) 70vw, 360px"
              preload
            />
          )}
        </div>

        <div className="fiche-resume">
          <p className="oeuvre-discipline">
            {detail.oeuvre.titre}
            {detail.oeuvre.volumes > 1 &&
              ` · ${t('fiche.volumeSur', { n: detail.volume, total: detail.oeuvre.volumes })}`}
          </p>
          <h1>{detail.titre}</h1>
          <p className="fiche-accroche">{detail.accroche}</p>
          <p className="oeuvre-mentions">
            {[detail.oeuvre.edition, detail.oeuvre.auteur && t('catalogue.par', { auteur: detail.oeuvre.auteur })]
              .filter(Boolean)
              .join(' · ')}
          </p>

          <div className="fiche-achat">
            <span className="prix prix-grand">{detail.prix}</span>
            {/* Regle 8.3 : sous la portee `work`, la langue n'est pas un choix. */}
            {detail.portee === 'work' && langues > 1 && (
              <p className="fiche-portee">{t('catalogue.portee', { n: langues })}</p>
            )}
          </div>

          <div className="fiche-actions">
            {detail.premierOffert && (
              <a
                className="bouton bouton-principal"
                href={cheminDeLecture(code, detail.slug, detail.premierOffert)}
              >
                {t('fiche.lireOffert')}
              </a>
            )}
            <a className="bouton bouton-discret" href={cheminDeLecture(code, detail.slug)}>
              {t('fiche.voirSommaire')}
            </a>
          </div>

          {detail.extrait && (
            <a className="telechargement" href={cheminDeContenu(detail.extrait.adresse)} download={detail.extrait.nom}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="telechargement-titre">{t('fiche.telechargerExtrait')}</span>
                <span className="telechargement-detail">
                  {t('fiche.extraitContenu', { taille: detail.extrait.taille })}
                </span>
              </span>
            </a>
          )}

          {detail.autresLangues.length > 0 && (
            <p className="fiche-langues">
              {t('fiche.aussiEn')}{' '}
              {detail.autresLangues.map((autre, rang) => (
                <span key={autre.langue}>
                  {rang > 0 && ' · '}
                  <a
                    href={chemin(autre.langue, 'catalogue', { slug: autre.slug })}
                    hrefLang={decrire(autre.langue).htmlLang}
                    lang={decrire(autre.langue).htmlLang}
                  >
                    {decrire(autre.langue).libelle}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      <div className="fiche-corps">
        <section className="fiche-presentation">
          <h2>{t('fiche.presentation')}</h2>
          {detail.description.map((paragraphe, rang) => (
            <p key={rang}>{paragraphe}</p>
          ))}
          {detail.licence && <p className="fiche-licence">{detail.licence}</p>}
        </section>

        <aside className="fiche-contenu">
          <h2>{t('fiche.dansCeVolume')}</h2>
          <ul className="fiche-chiffres">
            <li>
              {detail.chapitres.length === 1
                ? t('catalogue.chapitre')
                : t('catalogue.chapitres', { n: detail.chapitres.length })}
            </li>
            {detail.formats.video && detail.figures > 0 && (
              <li>{t('catalogue.figures', { n: detail.figures })}</li>
            )}
          </ul>

          {detail.pdfs.length > 0 && (
            <>
              <h3>{t('fiche.pdf')}</h3>
              <ul className="fiche-pdfs">
                {detail.pdfs.map((pdf) => (
                  <li key={pdf.adresse}>
                    <span className="fiche-pdf-nom">{pdf.nom}</span>
                    <span className="fiche-pdf-taille">{pdf.taille}</span>
                  </li>
                ))}
              </ul>
              <p className="fiche-note">{t('fiche.pdfNote')}</p>
            </>
          )}
        </aside>
      </div>

      <section className="fiche-sommaire" aria-labelledby="sommaire">
        <h2 id="sommaire">{t('fiche.sommaire')}</h2>
        <SommaireDuVolume langue={code} slug={detail.slug} chapitres={detail.chapitres} />
      </section>

      {detail.autresVolumes.length > 0 && (
        <section className="fiche-serie">
          <h2>{t('fiche.autresVolumes', { oeuvre: detail.oeuvre.titre })}</h2>
          <ul>
            {detail.autresVolumes.map((autre) => (
              <li key={autre.slug}>
                <a href={chemin(code, 'catalogue', { slug: autre.slug })}>{autre.titre}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
