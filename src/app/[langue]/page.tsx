/**
 * src/app/[langue]/page.tsx
 * Zakali Press — accueil.
 *
 * Provisoire. L'ossature — barre de navigation, megamenu, pied de page — est
 * en place et se voit ; le contenu de cette page, lui, viendra du contenu
 * editorial versionne et du catalogue issu de l'index.
 */

import { notFound } from 'next/navigation';

import { estLangue } from '@/i18n/langues';
import { chemin } from '@/i18n/segments';
import { traducteur } from '@/i18n/traduire';

export default async function Accueil({ params }: { params: Promise<{ langue: string }> }) {
  const { langue: code } = await params;
  if (!estLangue(code)) notFound();

  const t = traducteur(code);

  return (
    <div className="enveloppe">
      <h1>Zakali Press</h1>
      <p>Socle en place. Les pages viennent ensuite.</p>
      <p>
        <a href={chemin(code, 'catalogue')}>{t('nav.catalogue')}</a>
      </p>
    </div>
  );
}
