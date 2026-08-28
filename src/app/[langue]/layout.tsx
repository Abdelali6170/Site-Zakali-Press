/**
 * src/app/[langue]/layout.tsx
 * Zakali Press — enveloppe d'une langue.
 *
 * Pose `<html lang>` avec la langue reellement servie. Une langue inconnue
 * n'arrive jamais ici : le middleware ne laisse passer que celles declarees.
 *
 * Les deux polices sont chargees par `next/font`, qui les heberge avec le
 * site : aucune requete vers un tiers au chargement, et aucun saut de texte
 * quand la police arrive.
 */

import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';
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

export const metadata: Metadata = {
  title: 'Zakali Press',
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
      <body>{children}</body>
    </html>
  );
}
