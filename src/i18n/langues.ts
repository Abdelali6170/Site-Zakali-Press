/**
 * src/i18n/langues.ts
 * Zakali Press — les langues servies.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  C'EST ICI, ET NULLE PART AILLEURS, QUE LES LANGUES SONT DECLAREES.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Un ouvrage peut n'en servir qu'une — le livre sur Claude Code n'a que le
 * francais et l'anglais. C'est son manifeste qui le dit, pas ce fichier :
 * ici vivent les langues que le SITE sait afficher.
 */

/**
 * `locale` est ce que `Intl` recoit pour ecrire les montants : chaque langue
 * les ecrit a sa maniere (regle 8.2).
 */
export const LANGUES = [
  { code: 'fr', libelle: 'Français', htmlLang: 'fr', locale: 'fr-FR' },
  { code: 'en', libelle: 'English', htmlLang: 'en', locale: 'en-GB' },
  { code: 'es', libelle: 'Español', htmlLang: 'es', locale: 'es-ES' },
] as const;

export type Langue = (typeof LANGUES)[number]['code'];

export const CODES: readonly Langue[] = LANGUES.map((l) => l.code);

export const LANGUE_PAR_DEFAUT: Langue = 'fr';

export function estLangue(valeur: unknown): valeur is Langue {
  return typeof valeur === 'string' && (CODES as readonly string[]).includes(valeur);
}

export function langue(code: Langue) {
  return LANGUES.find((l) => l.code === code)!;
}

/**
 * Meilleure langue pour un visiteur arrive sans prefixe d'adresse.
 *
 * L'ordre est : choix deja exprime (cookie), puis en-tete du navigateur, puis
 * la langue par defaut. Un choix explicite prime toujours sur la detection —
 * quelqu'un qui a cliqué « English » ne doit pas etre renvoye au francais par
 * la configuration de sa machine.
 */
export function negocier({
  cookie,
  accepteLangues,
}: {
  cookie?: string | null;
  accepteLangues?: string | null;
}): Langue {
  if (estLangue(cookie)) return cookie;

  const candidats = String(accepteLangues ?? '')
    .split(',')
    .map((part) => {
      const [etiquette, qualite] = part.trim().split(';q=');
      return {
        etiquette: etiquette.trim().toLowerCase(),
        q: qualite === undefined ? 1 : Number(qualite) || 0,
      };
    })
    .filter((c) => c.etiquette)
    .sort((a, b) => b.q - a.q);

  for (const { etiquette } of candidats) {
    const base = etiquette.split('-')[0];
    if (estLangue(base)) return base;
  }

  return LANGUE_PAR_DEFAUT;
}
