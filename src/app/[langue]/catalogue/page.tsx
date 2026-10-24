/**
 * src/app/[langue]/catalogue/page.tsx
 * Zakali Press — le catalogue.
 *
 * Tout vient de l'index (regle 4.5) : il n'y a pas de table des ouvrages. La
 * page montre une seule langue, la sienne (regle 8.1), et range les volumes
 * sous leur oeuvre. Les disciplines sont un vrai axe de navigation : le filtre
 * est celui que le megamenu et le pied de page designent deja,
 * `?discipline=<slug>`.
 *
 * Une discipline inconnue n'est pas une erreur : elle ne filtre rien, et le
 * catalogue entier s'affiche.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import CarteVolume from '@/composants/CarteVolume';
import { disciplines } from '@/contenu/disciplines';
import { indexDuSite } from '@/index/charge';
import { estLangue, langue as decrire } from '@/i18n/langues';
import { chemin } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';
import { vitrine } from '@/ouvrages/vitrine';

type Proprietes = {
  params: Promise<{ langue: string }>;
  searchParams: Promise<{ discipline?: string | string[] }>;
};

export async function generateMetadata({ params }: Proprietes): Promise<Metadata> {
  const { langue: code } = await params;
  if (!estLangue(code)) return {};
  return { title: `${traducteur(code)('catalogue.titre')} — Zakali Press` };
}

export default async function Catalogue({ params, searchParams }: Proprietes) {
  const { langue: code } = await params;
  if (!estLangue(code)) notFound();

  const t = traducteur(code);
  const demandee = (await searchParams).discipline;
  const toutes = disciplines(code);
  const active = toutes.find((d) => d.slug === demandee) ?? null;
  const oeuvres = vitrine(indexDuSite().index.fiches, code, active?.slug ?? null);

  return (
    <div className="enveloppe catalogue">
      <header className="catalogue-tete">
        <h1>{active ? active.libelle : t('catalogue.titre')}</h1>
        <p className="catalogue-intro">{t('catalogue.intro')}</p>

        {toutes.length > 1 && (
          <nav className="filtres" aria-label={t('catalogue.filtrer')}>
            <a
              className="filtre"
              href={chemin(code, 'catalogue')}
              aria-current={active ? undefined : 'page'}
            >
              {t('catalogue.toutes')}
            </a>
            {toutes.map((discipline) => (
              <a
                key={discipline.slug}
                className="filtre"
                href={chemin(code, 'catalogue', { requete: { discipline: discipline.slug } })}
                aria-current={active?.slug === discipline.slug ? 'page' : undefined}
              >
                {discipline.libelle}
              </a>
            ))}
          </nav>
        )}
      </header>

      {oeuvres.length === 0 && <p className="catalogue-vide">{t('catalogue.vide')}</p>}

      {oeuvres.map((oeuvre, rang) => (
        <section className="oeuvre" key={oeuvre.ouvrage} aria-labelledby={`oeuvre-${oeuvre.ouvrage}`}>
          <header className="oeuvre-tete">
            <p className="oeuvre-discipline">{oeuvre.discipline.libelle}</p>
            <h2 id={`oeuvre-${oeuvre.ouvrage}`}>{oeuvre.titre}</h2>
            <p className="oeuvre-mentions">
              {[
                oeuvre.edition,
                oeuvre.auteur && t('catalogue.par', { auteur: oeuvre.auteur }),
                oeuvre.monoVolume
                  ? t('catalogue.volumeUnique')
                  : t('catalogue.volumes', { n: oeuvre.volumes.length }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {oeuvre.langues.length > 1 && (
              <p className="oeuvre-langues">
                {t('catalogue.disponibleEn', {
                  langues: oeuvre.langues.map((l) => decrire(l).libelle).join(' · '),
                })}
                {/* Regle 8.3 : sous la portee `work`, la langue n'est pas un choix. */}
                {oeuvre.portee === 'work' && <> — {t('catalogue.portee', { n: oeuvre.langues.length })}</>}
              </p>
            )}
          </header>

          <ul className={`volumes${oeuvre.monoVolume ? ' volumes-unique' : ''}`}>
            {oeuvre.volumes.map((volume, place) => (
              <CarteVolume
                key={volume.slug}
                langue={code}
                volume={volume}
                premiere={rang === 0 && place === 0}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
