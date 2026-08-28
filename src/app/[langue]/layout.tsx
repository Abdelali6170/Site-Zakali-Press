/**
 * src/app/[langue]/layout.tsx
 * Zakali Press — enveloppe d'une langue.
 *
 * Pose `<html lang>` avec la langue reellement servie. Une langue inconnue
 * n'arrive jamais ici : le middleware ne laisse passer que les trois declarees.
 */

import { notFound } from 'next/navigation';

import '../globals.css';
import { CODES, estLangue, langue as decrire } from '@/i18n/langues';

/** Les trois langues sont connues d'avance : les pages sont prerendues. */
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
    <html lang={decrire(code).htmlLang}>
      <body>{children}</body>
    </html>
  );
}
