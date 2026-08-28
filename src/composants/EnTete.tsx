'use client';

/**
 * src/composants/EnTete.tsx
 * Zakali Press — la barre de navigation.
 *
 * Reprend l'interface du site archive. Le code est ecrit de zero ; c'est le
 * comportement qui est reproduit, et il compte plus que l'apparence :
 *
 *   - le panneau des disciplines POSE ET RETIRE reellement `hidden`. Ferme, il
 *     sort du flux, de l'ordre de tabulation et de l'arbre d'accessibilite.
 *     Dans une version anterieure une regle CSS annulait `hidden`, et les
 *     lecteurs d'ecran lisaient le menu ferme ;
 *   - `aria-expanded` et `aria-controls` sur le declencheur ;
 *   - fermeture a la touche Echap, au clic hors du panneau, et des que le
 *     focus quitte le menu au clavier ;
 *   - sur mobile la barre se replie, et le choix de langue passe dans le menu.
 *
 * Composant client : c'est le seul de l'ossature a avoir besoin d'etat.
 */

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { Discipline, Famille } from '@/contenu/disciplines';
import { LANGUES, type Langue } from '@/i18n/langues';
import { chemin, routeDe } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

type Proprietes = {
  langue: Langue;
  nomDeLaMaison: string;
  familles: Famille[];
  enAvant: Discipline[];
};

export default function EnTete({ langue, nomDeLaMaison, familles, enAvant }: Proprietes) {
  const t = traducteur(langue);

  // La page courante se lit dans le chemin, cote navigateur : l'adresse y est
  // celle que le visiteur voit — /es/catalogo — et non la clef interne vers
  // laquelle le middleware a reecrit. Passer par un en-tete du middleware
  // aurait force l'enveloppe a se rendre a chaque requete, et fait perdre la
  // generation statique.
  const page = routeDe(usePathname() ?? '')?.page ?? null;

  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [menuOuvert, setMenuOuvert] = useState(false);

  const declencheur = useRef<HTMLButtonElement>(null);
  const panneau = useRef<HTMLDivElement>(null);

  // Echap ferme le panneau et rend le focus au declencheur.
  useEffect(() => {
    if (!panneauOuvert) return;

    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key !== 'Escape') return;
      setPanneauOuvert(false);
      declencheur.current?.focus();
    };

    const auClic = (evenement: MouseEvent) => {
      const cible = evenement.target as Node;
      if (panneau.current?.contains(cible)) return;
      if (declencheur.current?.contains(cible)) return;
      setPanneauOuvert(false);
    };

    document.addEventListener('keydown', auClavier);
    document.addEventListener('click', auClic);
    return () => {
      document.removeEventListener('keydown', auClavier);
      document.removeEventListener('click', auClic);
    };
  }, [panneauOuvert]);

  /** Le focus a quitte le menu au clavier : on ferme. */
  const auFocusSorti = (evenement: React.FocusEvent<HTMLDivElement>) => {
    const suivant = evenement.relatedTarget as Node | null;
    if (suivant && panneau.current?.contains(suivant)) return;
    if (suivant && declencheur.current?.contains(suivant)) return;
    setPanneauOuvert(false);
  };

  const versDiscipline = (slug: string) =>
    chemin(langue, 'catalogue', { requete: { discipline: slug } });

  return (
    <header className="entete">
      <nav className="barre" aria-label={t('nav.principale')}>
        <a className="marque" href={chemin(langue, 'accueil')}>
          <span className="signature">{nomDeLaMaison}</span>
        </a>

        <ul className="liens">
          {familles.length > 0 && (
            <li className="deroulant">
              <button
                type="button"
                className="lien bascule"
                ref={declencheur}
                aria-expanded={panneauOuvert}
                aria-controls="panneau-disciplines"
                onClick={(evenement) => {
                  evenement.stopPropagation();
                  setPanneauOuvert((ouvert) => !ouvert);
                }}
              >
                {t('nav.disciplines')}
                <svg className="chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2 4l4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {/* `hidden` est réellement posé : fermé, le panneau n'existe ni
                  pour le clavier ni pour les lecteurs d'écran. */}
              <div
                className="mega"
                id="panneau-disciplines"
                ref={panneau}
                hidden={!panneauOuvert}
                onBlur={auFocusSorti}
              >
                <div className="mega-corps">
                  {familles.map((famille) => (
                    <div className="mega-colonne" key={famille.libelle}>
                      <p className="mega-titre">{famille.libelle}</p>
                      <ul>
                        {famille.disciplines.map((discipline) => (
                          <li key={discipline.slug}>
                            <a href={versDiscipline(discipline.slug)}>{discipline.libelle}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mega-pied">
                  <a href={chemin(langue, 'catalogue')}>{t('nav.toutLeCatalogue')}</a>
                </div>
              </div>
            </li>
          )}

          <li>
            <a
              className={`lien${page === 'catalogue' ? ' est-courant' : ''}`}
              href={chemin(langue, 'catalogue')}
            >
              {t('nav.catalogue')}
            </a>
          </li>
        </ul>

        <div className="actions">
          <div className="langues" role="group" aria-label={t('nav.choisirLangue')}>
            {LANGUES.map((autre) => {
              const courante = autre.code === langue;
              return (
                <a
                  key={autre.code}
                  className={`langue${courante ? ' est-courant' : ''}`}
                  href={chemin(autre.code, page ?? 'accueil')}
                  hrefLang={autre.htmlLang}
                  lang={autre.htmlLang}
                  aria-current={courante ? true : undefined}
                >
                  {autre.code.toUpperCase()}
                </a>
              );
            })}
          </div>

          <a className="lien" href={chemin(langue, 'connexion')}>
            {t('nav.connexion')}
          </a>
          <a className="bouton bouton-principal" href={chemin(langue, 'inscription')}>
            {t('nav.inscription')}
          </a>
        </div>

        <button
          type="button"
          className="hamburger"
          aria-expanded={menuOuvert}
          aria-controls="menu-mobile"
          aria-label={menuOuvert ? t('nav.fermerMenu') : t('nav.ouvrirMenu')}
          onClick={() => setMenuOuvert((ouvert) => !ouvert)}
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className="menu-mobile" id="menu-mobile" hidden={!menuOuvert}>
        {enAvant.length > 0 && (
          <>
            <p className="mobile-titre">{t('nav.disciplines')}</p>
            <ul className="mobile-liste">
              {enAvant.map((discipline) => (
                <li key={discipline.slug}>
                  <a href={versDiscipline(discipline.slug)}>{discipline.libelle}</a>
                </li>
              ))}
              <li>
                <a href={chemin(langue, 'catalogue')}>{t('nav.catalogueComplet')}</a>
              </li>
            </ul>
          </>
        )}

        <p className="mobile-titre">{t('nav.langue')}</p>
        <ul className="mobile-liste">
          {LANGUES.map((autre) => (
            <li key={autre.code}>
              <a
                href={chemin(autre.code, page ?? 'accueil')}
                hrefLang={autre.htmlLang}
                lang={autre.htmlLang}
                aria-current={autre.code === langue ? true : undefined}
              >
                {autre.libelle}
              </a>
            </li>
          ))}
        </ul>

        <p className="mobile-titre">{t('nav.compte')}</p>
        <ul className="mobile-liste">
          <li>
            <a href={chemin(langue, 'connexion')}>{t('nav.connexion')}</a>
          </li>
          <li>
            <a href={chemin(langue, 'inscription')}>{t('nav.inscription')}</a>
          </li>
        </ul>
      </div>
    </header>
  );
}
