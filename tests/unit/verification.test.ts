/**
 * tests/unit/verification.test.ts
 * Zakali Press — regle 10.3 : ce que la verification d'apres mise en ligne vise.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex, entreeDe, type IndexCharge } from '@/index/index';
import { ciblesDeVerification, type Cibles } from '@/verification/cibles';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

let quai: QuaiDEssai;
let charge: IndexCharge;
let cibles: Cibles;

beforeAll(() => {
  quai = monterLeQuaiDEssai();
  charge = chargerIndex(fabriquerIndex(quai.racine, quai.manifestes, '2026-10-25T00:00:00.000Z').index);
  cibles = ciblesDeVerification(charge.index);
});

afterAll(() => quai.demonter());

const acces = (adresse: string | null) => (adresse ? entreeDe(charge, adresse)?.acces : undefined);

describe('regle 10.3 — la verification qui compte est le 403', () => {
  it('les cibles reservees sont dans l’index : un 403, pas un 404 qui ne prouverait rien', () => {
    expect(acces(cibles.pageReservee)).toBe('reserve');
    expect(acces(cibles.fichierReserve)).toBe('reserve');
    expect(entreeDe(charge, cibles.fichierReserve)?.sorte).not.toBe('page');
  });

  it('les cibles offertes le sont', () => {
    for (const adresse of [cibles.chapitreOffert, cibles.feuille, cibles.video, cibles.couverture]) {
      expect(acces(adresse), adresse ?? '').toBe('offert');
    }
  });

  it('toutes viennent de la meme edition', () => {
    const prefixe = `${cibles.fiche.clefDOeuvre}/${cibles.fiche.langue}/`;
    for (const adresse of [cibles.chapitreOffert, cibles.feuille, cibles.pageReservee, cibles.fichierReserve]) {
      expect(adresse.startsWith(prefixe), adresse).toBe(true);
    }
  });
});
