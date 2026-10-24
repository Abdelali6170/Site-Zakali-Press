/**
 * src/ouvrages/prix.ts
 * Zakali Press — la seule facon d'ecrire un prix.
 *
 * Regle 8.2 — les prix sont des entiers en centimes, formates a l'affichage
 * par cette fonction et par elle seule. Les gabarits recoivent la chaine,
 * jamais le montant brut : c'est ce qui rend impossible le « 4900.00 € » que
 * l'audit du projet precedent avait releve.
 */

import { langue as decrire, type Langue } from '@/i18n/langues';

/** `3900, 'EUR', 'fr'` → `39,00 €` ; en anglais, `€39.00`. */
export function formaterPrix(centimes: number, devise: string, langue: Langue): string {
  return new Intl.NumberFormat(decrire(langue).locale, {
    style: 'currency',
    currency: devise,
  }).format(centimes / 100);
}
