/**
 * tests/unit/indexation.test.ts
 * Zakali Press — regle 10.4 : une recette ne s'indexe pas.
 *
 * Les deux moities — `robots.txt` et l'en-tete `X-Robots-Tag` — viennent de
 * la meme variable, et se verifient ensemble.
 */

import { afterEach, describe, expect, it } from 'vitest';

import robots from '@/app/robots';
import { indexationOuverte } from '@/site/indexation';
import configuration from '../../next.config';

const avant = process.env.INDEXATION;
afterEach(() => {
  if (avant === undefined) delete process.env.INDEXATION;
  else process.env.INDEXATION = avant;
});

async function lesDeux(valeur: string | undefined) {
  if (valeur === undefined) delete process.env.INDEXATION;
  else process.env.INDEXATION = valeur;
  return { robots: robots().rules, entetes: await configuration.headers!() };
}

describe('regle 10.4 — une recette ne s’indexe pas', () => {
  it('sans variable, les deux ferment : l’oubli ferme, il n’ouvre jamais', async () => {
    const { robots, entetes } = await lesDeux(undefined);
    expect(robots).toEqual({ userAgent: '*', disallow: '/' });
    expect(entetes).toEqual([
      { source: '/:chemin*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]);
  });

  it('« fermee » ferme les deux', async () => {
    const { robots, entetes } = await lesDeux('fermee');
    expect(robots).toEqual({ userAgent: '*', disallow: '/' });
    expect(entetes).toHaveLength(1);
  });

  it('« ouverte » ouvre les deux ensemble', async () => {
    const { robots, entetes } = await lesDeux('ouverte');
    expect(robots).toEqual({ userAgent: '*', allow: '/' });
    expect(entetes).toEqual([]);
  });

  it('une faute de frappe ne decide de rien en silence', () => {
    expect(() => indexationOuverte({ INDEXATION: 'ouvert' })).toThrow(/ouverte/);
  });
});
