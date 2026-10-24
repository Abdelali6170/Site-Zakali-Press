/**
 * src/app/[langue]/lire/[slug]/page.tsx
 * Zakali Press — lire un volume : `/fr/lire/<volume>?chapitre=<rang>`.
 *
 * Sans `chapitre`, le sommaire du volume. Avec, le chapitre a cette place du
 * sommaire (a partir de 1) :
 *   - offert, il s'ouvre dans la liseuse, sous l'en-tete du site ;
 *   - reserve, la page l'explique en entier — couverture, prix, ce que
 *     contient le volume, son sommaire — avec le menu et le pied de page.
 *
 * Le contenu lui-meme reste servi par la porte : c'est elle qui decide, et
 * elle seule (regles 4.1 et 4.3). Cette page ne fait que choisir quoi montrer.
 *
 * Regle 7.4 — un identifiant d'une autre langue redirige vers l'edition de
 * cette langue, au meme chapitre.
 */

import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound, redirect } from 'next/navigation';

import Liseuse from '@/composants/Liseuse';
import SommaireDuVolume from '@/composants/SommaireDuVolume';
import { indexDuSite } from '@/index/charge';
import { estLangue, type Langue } from '@/i18n/langues';
import { chemin, cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';
import { detailDuVolume, type DetailDuVolume } from '@/ouvrages/detail';

type Proprietes = {
  params: Promise<{ langue: string; slug: string }>;
  searchParams: Promise<{ chapitre?: string | string[]; figure?: string | string[] }>;
};

/** Un nom de base de figure, et rien d'autre : il finit dans une expression de recherche. */
const FIGURE = /^[\w-]{1,200}$/;

/** Un `%` isole n'est pas un echappement : l'identifiant reste tel quel, et ne trouvera rien. */
function decoder(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

/** Le volume, le rang demande s'il est valide, ou la redirection / le 404 qu'ils appellent. */
async function chercher({ params, searchParams }: Proprietes) {
  const { langue: code, slug } = await params;
  if (!estLangue(code)) notFound();

  const requete = await searchParams;
  const demande = Number(requete.chapitre);
  const figure = typeof requete.figure === 'string' && FIGURE.test(requete.figure) ? requete.figure : null;
  const recherche = detailDuVolume(indexDuSite().index.fiches, code, decoder(slug));
  if (recherche.statut === 'introuvable') notFound();

  const chapitres =
    recherche.statut === 'trouve'
      ? recherche.detail.chapitres.length
      : Number.MAX_SAFE_INTEGER; // verifie apres la redirection
  const rang = Number.isInteger(demande) && demande >= 1 && demande <= chapitres ? demande : null;

  if (recherche.statut === 'ailleurs') {
    redirect(cheminDeLecture(code, recherche.slug, rang ?? undefined, figure ?? undefined));
  }
  return { code: code as Langue, detail: recherche.detail, rang, figure };
}

export async function generateMetadata(proprietes: Proprietes): Promise<Metadata> {
  const { detail, rang } = await chercher(proprietes);
  const chapitre = rang ? detail.chapitres[rang - 1] : null;
  return {
    title: `${chapitre ? `${chapitre.titre} — ` : ''}${detail.titre} — Zakali Press`,
    description: detail.accroche,
  };
}

export default async function Lire(proprietes: Proprietes) {
  const { code, detail, rang, figure } = await chercher(proprietes);
  const chapitre = rang ? detail.chapitres[rang - 1] : null;

  if (chapitre && !chapitre.offert) {
    return <ChapitreReserve langue={code} detail={detail} rang={rang!} />;
  }

  return (
    <Liseuse
      langue={code}
      slug={detail.slug}
      titreDuVolume={detail.titre}
      fiche={chemin(code, 'catalogue', { slug: detail.slug })}
      sommaire={cheminDeContenu(detail.sommaire)}
      chapitres={detail.chapitres.map((c) => ({
        titre: c.titre,
        contenu: cheminDeContenu(c.adresse),
        offert: c.offert,
      }))}
      rangInitial={rang}
      figure={rang ? figure : null}
      extrait={
        detail.extrait
          ? { href: cheminDeContenu(detail.extrait.adresse), nom: detail.extrait.nom }
          : null
      }
    />
  );
}

/** Un chapitre reserve : une page du site, en pleine largeur. */
function ChapitreReserve({ langue, detail, rang }: { langue: Langue; detail: DetailDuVolume; rang: number }) {
  const t = traducteur(langue);
  const chapitre = detail.chapitres[rang - 1];
  const langues = detail.autresLangues.length + 1;
  const formats = (['pdf', 'video', 'audio'] as const).filter((f) => detail.formats[f]);

  return (
    <>
      <section className="reserve-bande">
        <div className="reserve-corps">
          <div className="carte-couverture reserve-couverture">
            {detail.couverture && (
              <Image src={cheminDeContenu(detail.couverture)} alt="" fill sizes="280px" preload />
            )}
          </div>

          <div>
            <nav className="fil" aria-label={t('fiche.fil')}>
              <a href={chemin(langue, 'catalogue')}>{t('catalogue.titre')}</a>
              <span aria-hidden="true">›</span>
              <a href={chemin(langue, 'catalogue', { slug: detail.slug })}>{detail.titre}</a>
            </nav>

            <p className="oeuvre-discipline">
              {t('reserve.volume', { oeuvre: detail.oeuvre.titre, n: detail.volume })}
            </p>
            <p className="etiquette reserve-etiquette">
              <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                <rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" />
                <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              {t('fiche.reserve')}
            </p>
            <h1>{chapitre.titre}</h1>
            <p className="reserve-message">{t('reserve.message', { volume: detail.titre })}</p>

            <p className="carte-mesures">
              {t('catalogue.chapitres', { n: detail.chapitres.length })}
              {detail.formats.video && detail.figures > 0 && (
                <> · {t('catalogue.figures', { n: detail.figures })}</>
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

            <div className="fiche-achat">
              <span className="prix prix-grand">{detail.prix}</span>
              {detail.portee === 'work' && langues > 1 && (
                <p className="fiche-portee">{t('catalogue.portee', { n: langues })}</p>
              )}
            </div>

            <div className="fiche-actions">
              <a className="bouton bouton-principal" href={chemin(langue, 'catalogue', { slug: detail.slug })}>
                {t('reserve.decouvrir')}
              </a>
              {detail.premierOffert && (
                <a className="bouton bouton-discret" href={cheminDeLecture(langue, detail.slug, detail.premierOffert)}>
                  {t('fiche.lireOffert')}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="enveloppe reserve-sommaire" aria-labelledby="sommaire-du-volume">
        <h2 id="sommaire-du-volume">{t('reserve.sommaireDuVolume')}</h2>
        <SommaireDuVolume langue={langue} slug={detail.slug} chapitres={detail.chapitres} courant={rang} />
      </section>
    </>
  );
}
