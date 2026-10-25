/**
 * tests/unit/porte-fichiers.test.ts
 * Zakali Press — `fichiers/porte.php`, la porte du site de fichiers.
 *
 * Regles 4.1 · 4.2 · 8.4. Le script tourne sous le serveur integre de PHP, les
 * adresses sont signees par le code du site : c'est l'accord des deux cotes
 * qui est verifie, pas chacun pour soi.
 *
 * Sans PHP sur le poste (variable `PHP_BIN`, ou `php` dans le PATH), ces
 * tests s'ignorent : un poste neuf n'est pas rouge par conception.
 */

import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { adresseSignee } from '@/porte/signature';
import { TYPES_DE_CONTENU } from '@/porte/types-de-contenu';

const PHP = process.env.PHP_BIN || 'php';
const PHP_PRESENT = spawnSync(PHP, ['-v']).status === 0;
const PORTE = path.resolve('fichiers', 'porte.php');
const SECRET = 'un-secret-de-test-assez-long-pour-etre-admis';

/** La taille du plus gros PDF du quai, a peu pres. */
const GROS = 72 * 1024 * 1024;

let dossier: string;
let base: string;
let php: ChildProcess;

function portLibre(): Promise<number> {
  return new Promise((pret) => {
    const essai = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = essai.address() as net.AddressInfo;
      essai.close(() => pret(port));
    });
  });
}

function ecrire(chemin: string, contenu: string | Buffer): void {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu);
}

/** Une requete dont le chemin part tel quel, sans normalisation. */
function statutBrut(chemin: string): Promise<number> {
  return new Promise((pret, echec) => {
    http
      .get({ host: '127.0.0.1', port: new URL(base).port, path: chemin }, (reponse) => {
        reponse.resume();
        pret(reponse.statusCode ?? 0);
      })
      .on('error', echec);
  });
}

const signee = (adresse: string, options: { duree?: number; nom?: string; maintenant?: number } = {}) =>
  adresseSignee(base, SECRET, adresse, { duree: 300, ...options });

describe.skipIf(!PHP_PRESENT)('la porte du site de fichiers', () => {
  beforeAll(async () => {
    // public_html, et les livres A COTE — jamais dedans.
    dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'zakali-fichiers-'));
    const publique = path.join(dossier, 'public_html');
    const livres = path.join(dossier, 'livres');
    fs.mkdirSync(publique);
    ecrire(path.join(livres, 'oeuvre/fr/index.html'), '<p>sommaire</p>');
    ecrire(path.join(livres, 'oeuvre/fr/media/video/ch01/fig a.mp4'), Buffer.alloc(1000, 7));
    ecrire(path.join(livres, 'oeuvre/fr/extrait.pdf'), Buffer.alloc(GROS, 1));
    // Un fichier hors des livres, qu'aucune adresse ne doit atteindre.
    ecrire(path.join(dossier, 'secret.txt'), 'hors des livres');
    const config = path.join(dossier, 'zakali-fichiers.config.php');
    // La forme du gabarit : les livres designes depuis le fichier lui-meme.
    ecrire(config, `<?php return ['secret' => '${SECRET}', 'livres' => __DIR__ . '/livres'];`);

    const port = await portLibre();
    base = `http://127.0.0.1:${port}`;
    php = spawn(PHP, ['-S', `127.0.0.1:${port}`, '-t', publique, PORTE], {
      env: { ...process.env, ZAKALI_FICHIERS_CONFIG: config },
      stdio: 'ignore',
    });
    for (let essai = 0; essai < 50; essai++) {
      try {
        await fetch(base);
        return;
      } catch {
        await new Promise((attente) => setTimeout(attente, 100));
      }
    }
    throw new Error('Le serveur PHP ne demarre pas.');
  }, 30_000);

  afterAll(() => {
    php?.kill();
    fs.rmSync(dossier, { recursive: true, force: true });
  });

  it('une adresse signee sert le fichier, avec son type', async () => {
    const reponse = await fetch(signee('oeuvre/fr/index.html'));
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(await reponse.text()).toBe('<p>sommaire</p>');
    expect(reponse.headers.get('x-robots-tag')).toMatch(/noindex/);
    expect(reponse.headers.get('x-powered-by')).toBeNull();
  });

  it('un nom de fichier encode se retrouve', async () => {
    const reponse = await fetch(signee('oeuvre/fr/media/video/ch01/fig a.mp4'));
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('content-type')).toBe('video/mp4');
  });

  it('sans signature, ou avec une signature fausse : 403', async () => {
    expect((await fetch(`${base}/oeuvre/fr/index.html`)).status).toBe(403);
    const fausse = new URL(signee('oeuvre/fr/index.html'));
    fausse.searchParams.set('s', '0'.repeat(64));
    expect((await fetch(fausse)).status).toBe(403);
  });

  it('une signature valable pour une adresse n’ouvre pas sa voisine', async () => {
    const vers = new URL(signee('oeuvre/fr/index.html'));
    vers.pathname = '/oeuvre/fr/extrait.pdf';
    expect((await fetch(vers)).status).toBe(403);
  });

  it('une adresse expiree : 403', async () => {
    const passee = signee('oeuvre/fr/index.html', { duree: 60, maintenant: Date.now() - 3_600_000 });
    expect((await fetch(passee)).status).toBe(403);
  });

  it('« .. » est refuse, MEME correctement signe', async () => {
    // Un secret divulgue ne suffit pas a lire hors des livres. La requete part
    // BRUTE : `fetch` resoudrait les `..` avant l'envoi, et le refus ne
    // viendrait que de la signature.
    for (const [adresse, chemin] of [
      ['../secret.txt', '/../secret.txt'],
      ['oeuvre/../../secret.txt', '/oeuvre/../../secret.txt'],
      ['oeuvre/fr/./index.html', '/oeuvre/fr/./index.html'],
      ['../secret.txt', '/%2e%2e/secret.txt'],
    ]) {
      const { search } = new URL(signee(adresse).replace(/^[^?]*/, base));
      expect(await statutBrut(chemin + search), chemin).toBe(403);
    }
  });

  it('un fichier signe mais absent : 404', async () => {
    expect((await fetch(signee('oeuvre/fr/absent.html'))).status).toBe(404);
  });

  it('les plages : 206 et Content-Range, indispensables a la video et a Safari', async () => {
    const adresse = 'oeuvre/fr/media/video/ch01/fig a.mp4';
    const plage = await fetch(signee(adresse), { headers: { Range: 'bytes=10-19' } });
    expect(plage.status).toBe(206);
    expect(plage.headers.get('content-range')).toBe('bytes 10-19/1000');
    expect((await plage.arrayBuffer()).byteLength).toBe(10);

    const fin = await fetch(signee(adresse), { headers: { Range: 'bytes=-100' } });
    expect(fin.headers.get('content-range')).toBe('bytes 900-999/1000');

    const hors = await fetch(signee(adresse), { headers: { Range: 'bytes=5000-' } });
    expect(hors.status).toBe(416);
    expect(hors.headers.get('content-range')).toBe('bytes */1000');
  });

  it('le nom signe donne un telechargement ; change, il est refuse', async () => {
    const vers = new URL(signee('oeuvre/fr/media/video/ch01/fig a.mp4', { nom: 'Biologie-é.mp4' }));
    const reponse = await fetch(vers, { headers: { Range: 'bytes=0-0' } });
    expect(reponse.headers.get('content-disposition')).toBe(
      `attachment; filename="Biologie-.mp4"; filename*=UTF-8''Biologie-%C3%A9.mp4`,
    );
    vers.searchParams.set('n', 'autre.mp4');
    expect((await fetch(vers)).status).toBe(403);
  });

  it('le plus gros PDF part en entier', async () => {
    const reponse = await fetch(signee('oeuvre/fr/extrait.pdf'));
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('content-length')).toBe(String(GROS));
    expect((await reponse.arrayBuffer()).byteLength).toBe(GROS);
  }, 60_000);
});

describe('la table des types de contenu', () => {
  it('porte.php et le site s’accordent', () => {
    const source = fs.readFileSync(path.resolve('fichiers', 'porte.php'), 'utf8');
    const php = Object.fromEntries(
      [...source.matchAll(/'(\.[a-z0-9]+)' => '([^']+)'/g)].map((m) => [m[1], m[2]]),
    );
    expect(php).toEqual(TYPES_DE_CONTENU);
  });
});
