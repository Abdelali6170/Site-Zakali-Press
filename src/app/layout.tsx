/**
 * src/app/layout.tsx
 * Zakali Press — enveloppe racine.
 *
 * Elle ne fait que passer : toutes les pages du site vivent sous un prefixe de
 * langue, et c'est `[langue]/layout.tsx` qui pose `<html lang>` — l'attribut
 * doit porter la langue reellement servie, que seule cette couche connait.
 */

export default function EnveloppeRacine({ children }: { children: React.ReactNode }) {
  return children;
}
