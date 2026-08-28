/**
 * src/app/[langue]/page.tsx
 * Zakali Press — accueil.
 *
 * Provisoire : la page existe pour prouver que la chaine tient — routage par
 * langue, adresses traduites, rendu statique. Son contenu viendra du contenu
 * editorial versionne, a la phase 5.
 */

import { notFound } from 'next/navigation';

import { estLangue, LANGUES } from '@/i18n/langues';
import { chemin } from '@/i18n/segments';

export default async function Accueil({ params }: { params: Promise<{ langue: string }> }) {
  const { langue: code } = await params;
  if (!estLangue(code)) notFound();

  return (
    <main>
      <h1>Zakali Press</h1>
      <p>Socle en place — {code}.</p>

      <nav aria-label="Langues">
        <ul>
          {LANGUES.map((l) => (
            <li key={l.code}>
              <a href={chemin(l.code, 'accueil')} hrefLang={l.htmlLang}>
                {l.libelle}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <p>
        <a href={chemin(code, 'catalogue')}>{chemin(code, 'catalogue')}</a>
      </p>
    </main>
  );
}
