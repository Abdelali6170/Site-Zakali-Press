/**
 * src/composants/PiedDePage.tsx
 * Zakali Press — le pied de page.
 *
 * Reprend l'interface du site archive. Aucun etat, donc composant serveur.
 *
 * Les disciplines viennent des ouvrages presents, jamais d'une liste ecrite a
 * la main : c'est le defaut F-24 de l'audit du projet precedent, ou le pied de
 * page renvoyait vers des rubriques vides.
 */

import Image from 'next/image';

import type { Discipline } from '@/contenu/disciplines';
import type { Langue } from '@/i18n/langues';
import { chemin } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

type Proprietes = {
  langue: Langue;
  nomDeLaMaison: string;
  enAvant: Discipline[];
  annee: number;
};

export default function PiedDePage({ langue, nomDeLaMaison, enAvant, annee }: Proprietes) {
  const t = traducteur(langue);

  return (
    <footer className="pied">
      <div className="pied-corps">
        <div className="pied-marque">
          {/* Variante claire : le texte du logo d'origine, brun fonce, se perdrait
              sur le fond sombre. L'embleme garde ses couleurs. */}
          <Image
            className="pied-logo"
            src="/images/logo-zakali-press-clair.png"
            alt={nomDeLaMaison}
            width={1199}
            height={312}
          />
          <p className="pied-accroche">{t('pied.accroche')}</p>
        </div>

        {enAvant.length > 0 && (
          <div className="pied-colonne">
            <p className="pied-titre">{t('nav.disciplines')}</p>
            <ul>
              {enAvant.slice(0, 5).map((discipline) => (
                <li key={discipline.slug}>
                  <a href={chemin(langue, 'catalogue', { requete: { discipline: discipline.slug } })}>
                    {discipline.libelle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="pied-colonne">
          <p className="pied-titre">{t('pied.liens')}</p>
          <ul>
            <li>
              <a href={chemin(langue, 'catalogue')}>{t('nav.catalogue')}</a>
            </li>
            <li>
              <a href={chemin(langue, 'connexion')}>{t('nav.connexion')}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="pied-bas">
        <p>{t('pied.mention', { annee })}</p>
      </div>
    </footer>
  );
}
