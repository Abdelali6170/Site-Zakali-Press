/**
 * tests/unit/porte-livraison.test.ts
 * Zakali Press — comment un fichier autorise rejoint le navigateur.
 *
 * Regles 4.2 · 8.4 · 10.1. Le site de fichiers est simule par un petit
 * serveur qui verifie les signatures comme le fera `fichiers/porte.php`, et
 * range chaque fichier sous son adresse d'index.
 */

import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex, entreeDe, type EntreeDIndex, type IndexCharge } from '@/index/index';
import {
  dispositionDeTelechargement,
  dureeDeSignature,
  nomDeTelechargement,
  seRelaie,
} from '@/porte/livraison';
import { adresseSignee, signer } from '@/porte/signature';
import { stockageDepuis } from '@/porte/stockage';
import { servirDepuisLeSiteDeFichiers, type Distant } from '@/porte/stockage-distant';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

const SECRET = 'un-secret-de-test-assez-long-pour-etre-admis';

let quai: QuaiDEssai;
let charge: IndexCharge;
let serveur: http.Server;
let distant: Distant;
/** Ce que le faux site de fichiers a recu : chaque adresse, et sa plage. */
const recues: { adresse: string; plage?: string }[] = [];
/** Pour simuler une panne, une reponse forcee. */
let forcee: number | null = null;

beforeAll(async () => {
  quai = monterLeQuaiDEssai();
  charge = chargerIndex(fabriquerIndex(quai.racine, quai.manifestes, '2026-10-25T00:00:00.000Z').index);

  serveur = http.createServer((requete, reponse) => {
    const url = new URL(requete.url ?? '/', 'http://fichiers');
    const adresse = url.pathname.slice(1).split('/').map(decodeURIComponent).join('/');
    recues.push({ adresse, plage: requete.headers.range });
    if (forcee) return reponse.writeHead(forcee).end();

    const e = Number(url.searchParams.get('e'));
    const s = url.searchParams.get('s') ?? '';
    const n = url.searchParams.get('n') ?? undefined;
    if (e < Date.now() / 1000 || s !== signer(SECRET, adresse, e, n)) return reponse.writeHead(403).end();

    // Regle 4.2 : la clef de stockage EST l'adresse d'index.
    const entree = entreeDe(charge, adresse);
    if (!entree) return reponse.writeHead(404).end();
    const octets = fs.readFileSync(path.join(quai.racine, entree.fichier));
    const plage = /^bytes=(\d+)-(\d+)$/.exec(requete.headers.range ?? '');
    if (plage) {
      const [debut, fin] = [Number(plage[1]), Number(plage[2])];
      reponse.writeHead(206, { 'Content-Range': `bytes ${debut}-${fin}/${octets.length}` });
      return reponse.end(octets.subarray(debut, fin + 1));
    }
    reponse.writeHead(200, { 'Content-Length': octets.length }).end(octets);
  });
  await new Promise<void>((pret) => serveur.listen(0, '127.0.0.1', pret));
  distant = { base: `http://127.0.0.1:${(serveur.address() as AddressInfo).port}`, secret: SECRET };
});

afterAll(() => {
  serveur.close();
  quai.demonter();
});

const entree = (adresse: string): EntreeDIndex => {
  const trouvee = entreeDe(charge, adresse);
  if (!trouvee) throw new Error(`absente de l’index : ${adresse}`);
  return trouvee;
};

const CHAPITRE = 'essai-double-vol-1/fr/pages/chapitre_01.html';

describe('regle 8.4 — ce qui porte des liens est relaye, le poids est redirige', () => {
  it('relaye : la page, la feuille, la police qu’elle appelle, la narration, la couverture', () => {
    for (const adresse of [
      CHAPITRE,
      'essai-double-vol-1/fr/style/base.css',
      'essai-double-vol-1/fr/style/polices/serif.woff2',
      'essai-double-vol-1/fr/media/narration/ch01/fig-a.txt',
      'essai-double-vol-1/fr/couverture.png',
    ]) {
      expect(seRelaie(entree(adresse)), adresse).toBe(true);
    }
  });

  it('redirige : les images des pages, les videos', () => {
    expect(seRelaie(entree('essai-double-vol-1/fr/pages/images/fleur.png'))).toBe(false);
    expect(seRelaie(entree('essai-double-vol-1/fr/media/video/ch01/fig-a.mp4'))).toBe(false);
  });

  it('une page relayee rend ses octets sous l’adresse du site : chaque image repasse par la porte', async () => {
    const reponse = await servirDepuisLeSiteDeFichiers(distant, entree(CHAPITRE), null, undefined);
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('location')).toBeNull();
    expect(reponse.headers.get('content-type')).toMatch(/^text\/html/);

    // Le navigateur resout les liens contre l'adresse ou il a recu la page.
    const ici = new URL(`/contenu/${CHAPITRE}`, 'https://zakalipress.com');
    const html = await reponse.text();
    const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => new URL(m[1], ici));
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image.origin).toBe(ici.origin);
      expect(image.pathname.startsWith('/contenu/')).toBe(true);
    }
  });

  it('une feuille relayee garde ses polices sous la porte', async () => {
    const feuille = 'essai-double-vol-1/fr/style/base.css';
    const reponse = await servirDepuisLeSiteDeFichiers(distant, entree(feuille), null, undefined);
    expect(reponse.status).toBe(200);
    const police = /url\("([^"]+)"\)/.exec(await reponse.text())![1];
    const resolue = new URL(police, new URL(`/contenu/${feuille}`, 'https://zakalipress.com'));
    expect(resolue.pathname).toBe('/contenu/essai-double-vol-1/fr/style/polices/serif.woff2');
  });

  it('une image est redirigee vers une adresse signee, que le site de fichiers accepte', async () => {
    const reponse = await servirDepuisLeSiteDeFichiers(
      distant,
      entree('essai-double-vol-1/fr/pages/images/fleur.png'),
      null,
      undefined,
    );
    expect(reponse.status).toBe(307);
    // Une redirection mise en cache survivrait a sa signature.
    expect(reponse.headers.get('cache-control')).toBe('no-store');
    const vers = reponse.headers.get('location')!;
    expect(vers.startsWith(`${distant.base}/essai-double-vol-1/fr/pages/images/fleur.png?`)).toBe(true);
    expect((await fetch(vers)).status).toBe(200);
  });

  it('la plage demandee est transmise au site de fichiers, et la 206 rendue telle quelle', async () => {
    const reponse = await servirDepuisLeSiteDeFichiers(
      distant,
      entree('essai-double-vol-1/fr/couverture.png'),
      'bytes=10-19',
      undefined,
    );
    expect(reponse.status).toBe(206);
    expect(reponse.headers.get('content-range')).toBe('bytes 10-19/500');
    expect((await reponse.arrayBuffer()).byteLength).toBe(10);
    expect(recues.at(-1)?.plage).toBe('bytes=10-19');
  });
});

describe('regle 8.4 — la duree d’une adresse signee', () => {
  it('quelques minutes pour une image', () => {
    expect(dureeDeSignature(entree('essai-double-vol-1/fr/pages/images/fleur.png'))).toBe(300);
  });

  it('des heures pour une video : chaque plage revient avec la meme adresse', () => {
    expect(dureeDeSignature(entree('essai-double-vol-1/fr/media/video/ch01/fig-a.mp4'))).toBeGreaterThanOrEqual(
      3600,
    );
  });
});

describe('le nom de telechargement', () => {
  it('un PDF de fiche porte son nom, signe dans l’adresse', async () => {
    const adresse = 'essai-double-vol-1/fr/pdf/double-tome-1.pdf';
    const nom = nomDeTelechargement(charge.index.fiches, adresse);
    expect(nom).toBe('double-tome-1.pdf');

    const reponse = await servirDepuisLeSiteDeFichiers(distant, entree(adresse), null, nom);
    const vers = new URL(reponse.headers.get('location')!);
    expect(vers.searchParams.get('n')).toBe(nom);
    expect((await fetch(vers)).status).toBe(200);

    // Le nom change, la signature ne tient plus.
    vers.searchParams.set('n', 'autre.pdf');
    expect((await fetch(vers)).status).toBe(403);
  });

  it('une image n’a pas de nom de telechargement', () => {
    expect(nomDeTelechargement(charge.index.fiches, 'essai-double-vol-1/fr/pages/images/fleur.png')).toBeUndefined();
  });

  it('l’en-tete porte une forme ASCII et une forme UTF-8', () => {
    expect(dispositionDeTelechargement('Biologie-é.pdf')).toBe(
      `attachment; filename="Biologie-.pdf"; filename*=UTF-8''Biologie-%C3%A9.pdf`,
    );
  });
});

describe('le relais face a un site de fichiers en difficulte', () => {
  const relayer = () => servirDepuisLeSiteDeFichiers(distant, entree(CHAPITRE), null, undefined);

  it('un fichier indexe mais pas verse repond 404', async () => {
    forcee = 404;
    expect((await relayer()).status).toBe(404);
    forcee = null;
  });

  it('un refus du site de fichiers est une faute de configuration : 502', async () => {
    const faux = { ...distant, secret: 'un-autre-secret-de-test-assez-long-lui-aussi' };
    expect((await servirDepuisLeSiteDeFichiers(faux, entree(CHAPITRE), null, undefined)).status).toBe(502);
  });

  it('un site de fichiers injoignable repond 503', async () => {
    const injoignable = { ...distant, base: 'http://127.0.0.1:1' };
    expect((await servirDepuisLeSiteDeFichiers(injoignable, entree(CHAPITRE), null, undefined)).status).toBe(
      503,
    );
  });
});

describe('regle 4.2 — l’adresse signee est l’adresse d’index', () => {
  it('chaque segment est encode a part, la forme de chemin survit', () => {
    const vers = new URL(
      adresseSignee('https://fichiers.exemple', SECRET, 'oeuvre/fr/un dossier/é.png', { duree: 60, maintenant: 0 }),
    );
    expect(vers.pathname).toBe('/oeuvre/fr/un%20dossier/%C3%A9.png');
    expect(vers.searchParams.get('e')).toBe('60');
  });

  it('la signature est un HMAC-SHA256 hexadecimal de « adresse \\n expiration \\n nom »', () => {
    // La meme valeur, en PHP : hash_hmac('sha256', "a/b\n60\nnom.pdf", 'k').
    expect(signer('k', 'a/b', 60, 'nom.pdf')).toBe(
      '3c336854b3d2840509f7e530dcfa8234fd2f39e8c76f65303900155f5d2e04a8',
    );
    // Sans nom, la troisieme ligne est vide — pas absente.
    expect(signer('k', 'a/b', 60)).toBe(signer('k', 'a/b', 60, ''));
  });
});

describe('regle 10.1 — le mode de stockage vient de la configuration', () => {
  const secret = 'x'.repeat(32);

  it('sans variable, le stockage est local : c’est le poste', () => {
    expect(stockageDepuis({})).toEqual({ mode: 'local' });
  });

  it('les deux variables donnent le site de fichiers, sans barre finale', () => {
    expect(stockageDepuis({ FICHIERS_URL: 'https://fichiers.exemple/', FICHIERS_SECRET: secret })).toEqual({
      mode: 'distant',
      base: 'https://fichiers.exemple',
      secret,
    });
  });

  it('une configuration partielle est fatale, et nomme ce qui manque', () => {
    expect(() => stockageDepuis({ FICHIERS_URL: 'https://fichiers.exemple' })).toThrow(/FICHIERS_SECRET/);
    expect(() => stockageDepuis({ FICHIERS_SECRET: secret })).toThrow(/FICHIERS_URL/);
  });

  it('en ligne, le http est refuse ; un secret court aussi', () => {
    expect(() => stockageDepuis({ FICHIERS_URL: 'http://fichiers.exemple', FICHIERS_SECRET: secret })).toThrow(
      /https/,
    );
    expect(() => stockageDepuis({ FICHIERS_URL: 'https://fichiers.exemple', FICHIERS_SECRET: 'court' })).toThrow(
      /trop court/,
    );
  });
});
