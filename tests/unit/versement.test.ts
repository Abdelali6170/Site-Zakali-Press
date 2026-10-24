/**
 * tests/unit/versement.test.ts
 * Zakali Press — le plan d'un versement vers le site de fichiers.
 *
 * Regles 4.2 · 10.2.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fabriquerIndex } from '@/index/fabriquer';
import type { EntreeDIndex, Index } from '@/index/index';
import { planDeVersement, type Releve } from '@/versement/plan';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

let quai: QuaiDEssai;
let index: Index;

beforeAll(() => {
  quai = monterLeQuaiDEssai();
  index = fabriquerIndex(quai.racine, quai.manifestes, '2026-10-25T00:00:00.000Z').index;
});

afterAll(() => quai.demonter());

/** Le quai tel que l'index l'a releve, modifie a l'instant 100. */
const fidele = (entree: EntreeDIndex): Releve => ({ octets: entree.octets, modifieLe: 100 });
const vide = new Map<string, Releve>();

describe('regle 10.2 — le versement ne transporte que ce que l’index connait, par niveau', () => {
  it('par defaut, la part offerte seule', () => {
    const plan = planDeVersement(index, 'offert', fidele, vide);
    expect(plan.aEnvoyer.length).toBeGreaterThan(0);
    expect(plan.aEnvoyer.every((entree) => entree.acces === 'offert')).toBe(true);
    expect(plan.aEnvoyer.map((e) => e.adresse)).not.toContain('essai-double-vol-1/fr/pdf/double-tome-1.pdf');
  });

  it('le reserve emporte l’offert avec lui', () => {
    const plan = planDeVersement(index, 'reserve', fidele, vide);
    expect(plan.aEnvoyer).toHaveLength(index.entrees.length);
  });

  it('ce qui n’est pas dans l’index ne part pas : l’audio desindexe, `search.json`', () => {
    const adresses = planDeVersement(index, 'reserve', fidele, vide).aEnvoyer.map((e) => e.adresse);
    expect(adresses.some((a) => a.endsWith('search.json'))).toBe(false);
    // L'ouvrage double ne sert pas l'audio par figure (regle 1.8) : present
    // sur le quai, il ne part pas.
    expect(adresses).not.toContain('essai-double-vol-1/fr/media/audio/ch01/fig-a.mp3');
  });
});

describe('seulement ce qui a change', () => {
  it('un fichier deja la, de meme taille et envoye apres sa modification, est a jour', () => {
    const deja = new Map(index.entrees.map((e) => [e.adresse, { octets: e.octets, modifieLe: 200 }]));
    const plan = planDeVersement(index, 'offert', fidele, deja);
    expect(plan.aEnvoyer).toEqual([]);
    expect(plan.aJour).toBeGreaterThan(0);
  });

  it('modifie sur le quai depuis l’envoi, ou d’une autre taille : il repart', () => {
    const chapitre = 'essai-double-vol-1/fr/pages/chapitre_01.html';
    const octets = index.entrees.find((e) => e.adresse === chapitre)!.octets;
    for (const labas of [{ octets, modifieLe: 50 }, { octets: octets + 1, modifieLe: 200 }]) {
      const plan = planDeVersement(index, 'offert', fidele, new Map([[chapitre, labas]]));
      expect(plan.aEnvoyer.map((e) => e.adresse)).toContain(chapitre);
    }
  });
});

describe('ce que le versement signale', () => {
  it('un fichier du quai qui n’a plus la taille relevee par l’index ne part pas', () => {
    const plan = planDeVersement(index, 'offert', (e) => ({ octets: e.octets + 1, modifieLe: 100 }), vide);
    expect(plan.aEnvoyer).toEqual([]);
    expect(plan.divergents.length).toBeGreaterThan(0);
  });

  it('regle 4.2 — un fichier du site de fichiers est reconnu par son adresse d’index', () => {
    const labas = new Map([
      ['essai-double-vol-1/fr/index.html', { octets: 1, modifieLe: 0 }],
      ['essai-double-vol-1/fr/ancien.html', { octets: 1, modifieLe: 0 }],
    ]);
    expect(planDeVersement(index, 'offert', fidele, labas).inconnus).toEqual(['essai-double-vol-1/fr/ancien.html']);
  });
});
