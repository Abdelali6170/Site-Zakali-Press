/**
 * src/app/[langue]/layout.tsx
 * Zakali Press — enveloppe d'une langue.
 *
 * Pose `<html lang>` avec la langue reellement servie, et l'ossature commune :
 * la barre de navigation, le corps, le pied de page. Une langue inconnue
 * n'arrive jamais ici — le middleware ne laisse passer que celles declarees.
 *
 * Les deux polices sont chargees par `next/font`, qui les heberge avec le
 * site : aucune requete vers un tiers au chargement, et aucun saut de texte
 * quand la police arrive.
 */

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';
import EnTete from '@/composants/EnTete';
import PiedDePage from '@/composants/PiedDePage';
import { disciplinesEnAvant, familles } from '@/contenu/disciplines';
import { CODES, estLangue, langue as decrire } from '@/i18n/langues';

const titre = Playfair_Display({
  subsets: ['latin'],
  variable: '--police-titre',
  display: 'swap',
});

const labeur = Inter({
  subsets: ['latin'],
  variable: '--police-labeur',
  display: 'swap',
});

/** Provisoire : viendra du contenu editorial versionne, a la phase 5. */
const NOM_DE_LA_MAISON = 'Zakali Press';

export const metadata: Metadata = {
  title: NOM_DE_LA_MAISON,
};

/** Les langues sont connues d'avance : les pages sont prerendues. */
export function generateStaticParams() {
  return CODES.map((code) => ({ langue: code }));
}

export default async function EnveloppeLangue({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ langue: string }>;
}) {
  const { langue: code } = await params;
  if (!estLangue(code)) notFound();

  return (
    <html lang={decrire(code).htmlLang} className={`${titre.variable} ${labeur.variable}`}>
      <body>
        <EnTete
          langue={code}
          nomDeLaMaison={NOM_DE_LA_MAISON}
          familles={familles(code)}
          enAvant={disciplinesEnAvant(code)}
        />

        <main className="contenu" id="contenu">
          {children}
        </main>

        <PiedDePage
          langue={code}
          nomDeLaMaison={NOM_DE_LA_MAISON}
          enAvant={disciplinesEnAvant(code)}
          // Figée à la construction, et c'est voulu : le site se reconstruit à
          // chaque poussée. Au pire, la mention reste sur l'année précédente
          // en janvier, jusqu'au déploiement suivant. La calculer à chaque
          // requête coûterait la génération statique de toutes les pages.
          annee={new Date().getFullYear()}
        />
      </body>
    </html>
  );
}
