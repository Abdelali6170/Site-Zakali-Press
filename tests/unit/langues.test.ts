/**
 * tests/unit/langues.test.ts
 * Zakali Press — les langues servies et le choix de la langue.
 */

import { describe, expect, it } from 'vitest';

import { CODES, estLangue, LANGUE_PAR_DEFAUT, LANGUES, negocier } from '@/i18n/langues';

describe('les langues declarees', () => {
  it('sert trois langues, dans l’ordre d’affichage du selecteur', () => {
    expect(CODES).toEqual(['fr', 'en', 'es']);
  });

  it('le francais est la langue par defaut', () => {
    expect(LANGUE_PAR_DEFAUT).toBe('fr');
    expect(CODES).toContain(LANGUE_PAR_DEFAUT);
  });

  it('chaque langue porte un libelle dans sa propre langue', () => {
    expect(LANGUES.map((l) => l.libelle)).toEqual(['Français', 'English', 'Español']);
  });

  it('reconnait une langue servie, et rien d’autre', () => {
    expect(estLangue('fr')).toBe(true);
    expect(estLangue('es')).toBe(true);
    expect(estLangue('de')).toBe(false);
    expect(estLangue('')).toBe(false);
    expect(estLangue(null)).toBe(false);
    expect(estLangue(undefined)).toBe(false);
    expect(estLangue('FR')).toBe(false);
  });
});

describe('le choix de la langue pour une arrivee sans prefixe', () => {
  it('un choix deja exprime prime sur la detection', () => {
    // Quelqu'un qui a clique « English » ne doit pas etre renvoye au francais
    // par la configuration de sa machine.
    expect(negocier({ cookie: 'en', accepteLangues: 'fr-FR,fr;q=0.9' })).toBe('en');
  });

  it('a defaut, suit l’en-tete du navigateur', () => {
    expect(negocier({ accepteLangues: 'es-ES,es;q=0.9,en;q=0.8' })).toBe('es');
    expect(negocier({ accepteLangues: 'en-GB,en;q=0.9' })).toBe('en');
  });

  it('respecte l’ordre de preference, pas l’ordre d’ecriture', () => {
    expect(negocier({ accepteLangues: 'de;q=1.0,es;q=0.9,fr;q=0.2' })).toBe('es');
  });

  it('ignore une langue que le site ne sert pas', () => {
    expect(negocier({ accepteLangues: 'de-DE,de;q=0.9' })).toBe('fr');
  });

  it('retombe sur la langue par defaut quand rien n’est exploitable', () => {
    expect(negocier({})).toBe('fr');
    expect(negocier({ cookie: 'klingon', accepteLangues: '' })).toBe('fr');
    expect(negocier({ accepteLangues: ',,;q=' })).toBe('fr');
  });
});
