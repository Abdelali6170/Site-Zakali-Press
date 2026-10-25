/**
 * tests/unit/porte-route.test.ts
 * Zakali Press — `/contenu/<adresse>` derriere un proxy.
 *
 * Regle 4.7. En ligne, l'application tourne derriere le proxy de Hostinger
 * et se voit a `https://0.0.0.0:3000`. Un renvoi compose sur l'adresse de la
 * requete y envoyait le navigateur : aucune video de figure ne se lisait, et
 * le retour au sommaire etait casse. Les renvois sont donc RELATIFS.
 *
 * Contre l'index versionne : c'est lui que le site deploie.
 */

import { describe, expect, it } from 'vitest';

import { GET } from '@/app/contenu/[...adresse]/route';
import { indexDuSite } from '@/index/charge';

/** L'adresse que l'application voit en ligne, derriere le proxy. */
const INTERNE = 'https://0.0.0.0:3000';

async function demander(adresse: string): Promise<Response> {
  return GET(new Request(`${INTERNE}/contenu/${adresse}`), {
    params: Promise.resolve({ adresse: adresse.split('/') }),
  });
}

describe('regle 4.7 — un renvoi ne revele jamais l’adresse interne du serveur', () => {
  const video = indexDuSite().index.entrees.find((e) => e.sorte === 'video' && e.acces === 'offert')!;
  const [oeuvre, langue, ...reste] = video.adresse.split('/');

  it('la video appelee depuis le dossier d’une page renvoie a son adresse canonique, en relatif', async () => {
    const reponse = await demander([oeuvre, langue, 'chapitres', ...reste].join('/'));
    expect(reponse.status).toBe(308);
    expect(reponse.headers.get('location')).toBe(`/contenu/${video.adresse}`);
  });

  it('le dossier d’une edition renvoie a son sommaire, en relatif', async () => {
    const reponse = await demander(`${oeuvre}/${langue}`);
    expect(reponse.status).toBe(308);
    expect(reponse.headers.get('location')).toBe(`/contenu/${oeuvre}/${langue}/index.html`);
  });

  it('un renvoi porte un cache borne : sans consigne, un navigateur garde un 308 sans fin', async () => {
    const reponse = await demander(`${oeuvre}/${langue}`);
    expect(reponse.headers.get('cache-control')).toBe('public, max-age=3600');
  });
});
