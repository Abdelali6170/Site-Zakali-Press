/**
 * tests/unit/segments.test.ts
 * Zakali Press — les adresses traduites (regles 7.1 et 7.4).
 *
 * Ces tests figent la seule friction connue du routeur de Next.js. Ils sont
 * ecrits avant les pages, deliberement : c'est le point ou une erreur ne se
 * verrait pas — une page servie sous une adresse qui n'existe pas dans sa
 * langue s'affiche parfaitement.
 */

import { describe, expect, it } from 'vitest';

import { CODES } from '@/i18n/langues';
import { chemin, PAGES, pageDepuisSegment, routeDe, SEGMENTS, segmentDe } from '@/i18n/segments';

describe('un segment appartient a une seule langue', () => {
  it('reconnait le mot de sa propre langue', () => {
    expect(pageDepuisSegment('fr', 'catalogue')).toBe('catalogue');
    expect(pageDepuisSegment('es', 'catalogo')).toBe('catalogue');
    expect(pageDepuisSegment('en', 'read')).toBe('lire');
    expect(pageDepuisSegment('fr', 'lire')).toBe('lire');
  });

  it('refuse le mot d’une autre langue', () => {
    // /es/catalogue est le mot francais sous un prefixe espagnol : il ne
    // designe rien, et doit donner un 404 franc.
    expect(pageDepuisSegment('es', 'catalogue')).toBeNull();
    expect(pageDepuisSegment('fr', 'catalogo')).toBeNull();
    expect(pageDepuisSegment('fr', 'read')).toBeNull();
    expect(pageDepuisSegment('en', 'leer')).toBeNull();
  });

  it('refuse un mot inconnu', () => {
    expect(pageDepuisSegment('fr', 'boutique')).toBeNull();
    expect(pageDepuisSegment('fr', '..')).toBeNull();
  });

  it('l’accueil est le segment vide', () => {
    for (const code of CODES) expect(pageDepuisSegment(code, '')).toBe('accueil');
  });
});

describe('la table des segments est complete et sans collision', () => {
  it('chaque page a un segment dans chaque langue', () => {
    for (const page of PAGES) {
      for (const code of CODES) {
        expect(typeof segmentDe(page, code)).toBe('string');
      }
    }
  });

  it('deux pages ne partagent jamais un mot dans une meme langue', () => {
    for (const code of CODES) {
      const mots = PAGES.filter((p) => p !== 'accueil').map((p) => segmentDe(p, code));
      expect(new Set(mots).size).toBe(mots.length);
    }
  });

  it('aucun segment ne contient de barre oblique ni d’espace', () => {
    for (const page of PAGES) {
      for (const code of CODES) {
        expect(segmentDe(page, code)).not.toMatch(/[/\s]/);
      }
    }
  });
});

describe('les adresses ne s’ecrivent jamais a la main', () => {
  it('compose l’adresse d’une page', () => {
    expect(chemin('fr', 'catalogue')).toBe('/fr/catalogue');
    expect(chemin('es', 'catalogue')).toBe('/es/catalogo');
    expect(chemin('en', 'compte')).toBe('/en/account');
  });

  it('l’accueil n’a pas de segment', () => {
    expect(chemin('fr', 'accueil')).toBe('/fr');
    expect(chemin('es', 'accueil')).toBe('/es');
  });

  it('ajoute un identifiant d’ouvrage', () => {
    expect(chemin('fr', 'lire', { slug: 'biologie-volume-i' })).toBe('/fr/lire/biologie-volume-i');
    expect(chemin('es', 'lire', { slug: 'biologia-volumen-i' })).toBe('/es/leer/biologia-volumen-i');
  });

  it('echappe l’identifiant', () => {
    expect(chemin('fr', 'lire', { slug: 'a b/c' })).toBe('/fr/lire/a%20b%2Fc');
  });

  it('ecarte les parametres vides plutot que de les ecrire', () => {
    expect(chemin('fr', 'catalogue', { requete: { discipline: 'biologie', q: '' } })).toBe(
      '/fr/catalogue?discipline=biologie',
    );
    expect(chemin('fr', 'catalogue', { requete: { q: undefined } })).toBe('/fr/catalogue');
  });
});

describe('le selecteur de langue retrouve la page courante', () => {
  it('reconnait une adresse dans chaque langue', () => {
    expect(routeDe('/es/catalogo')).toMatchObject({ langue: 'es', page: 'catalogue' });
    expect(routeDe('/en/read/biology-volume-i')).toMatchObject({
      langue: 'en',
      page: 'lire',
      slug: 'biology-volume-i',
    });
  });

  it('mene a la meme page traduite, jamais a l’accueil', () => {
    const route = routeDe('/fr/catalogue');
    expect(route?.page).toBe('catalogue');
    expect(chemin('es', route!.page!)).toBe('/es/catalogo');
  });

  it('ne reconnait pas une page sous un prefixe qui n’est pas le sien', () => {
    expect(routeDe('/es/catalogue')?.page).toBeNull();
  });
});

describe('la table elle-meme', () => {
  it('declare les sept pages du site', () => {
    expect(PAGES).toEqual([
      'accueil',
      'catalogue',
      'lire',
      'compte',
      'connexion',
      'inscription',
      'deconnexion',
    ]);
  });

  it('n’oublie aucune langue', () => {
    for (const page of PAGES) {
      expect(Object.keys(SEGMENTS[page]).sort()).toEqual([...CODES].sort());
    }
  });
});
