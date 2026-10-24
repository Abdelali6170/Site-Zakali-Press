/**
 * tests/unit/extraits.test.ts
 * Zakali Press — l'extrait PDF gratuit : ses liens, et sa place dans l'index.
 *
 * Regles 1.7 · 6.4, 6.5, 6.7.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { cibleDUnLien, relierLesLiens, validerDomaine } from '@/extraits/relier';
import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex, type IndexCharge } from '@/index/index';
import { fichierExtrait, fichierExtraitRelie } from '@/quai/chemins';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

let quai: QuaiDEssai;
let derives: string;
let charge: IndexCharge;

beforeAll(() => {
  quai = monterLeQuaiDEssai();
  derives = fs.mkdtempSync(path.join(os.tmpdir(), 'zakali-derives-'));
  charge = chargerIndex(fabriquerIndex(quai.racine, quai.manifestes, '2026-10-24T00:00:00.000Z').index);
});

afterAll(() => {
  quai.demonter();
  fs.rmSync(derives, { recursive: true, force: true });
});

const DOMAINE = 'https://exemple.org';
const tome1 = () => charge.index.fiches.find((f) => f.slug === 'le-double-tome-1')!;

describe('regle 6.4 — le domaine n’a pas de valeur par defaut', () => {
  it('il est obligatoire', () => {
    expect(() => validerDomaine(undefined)).toThrow(/obligatoire/);
  });

  it('une adresse locale est refusee, et le http aussi', () => {
    for (const refuse of ['https://localhost', 'https://127.0.0.1:3000', 'https://poste.local', 'http://zakalipress.com']) {
      expect(() => validerDomaine(refuse), refuse).toThrow();
    }
  });

  it('le domaine seul, sans chemin', () => {
    expect(() => validerDomaine('https://zakalipress.com/fr')).toThrow(/sans chemin/);
    expect(validerDomaine('https://zakalipress.com/')).toBe('https://zakalipress.com');
  });
});

describe('regles 6.4 et 6.5 — ou mene chaque lien de l’extrait', () => {
  const cible = (uri: string) => cibleDUnLien(uri, tome1(), charge, DOMAINE);

  it('le bouton « Voir la video » mene a la FIGURE dans la liseuse, jamais au fichier', () => {
    expect(cible('https://miroir.example/zakali/html/Vol/pages/media/video/ch01/fig-a.mp4')).toBe(
      'https://exemple.org/fr/lire/le-double-tome-1?chapitre=1&figure=fig-a',
    );
  });

  it('le lien d’illustration vers le disque de l’editeur aussi', () => {
    expect(cible('file:///C:/atelier/livre/_book/pages/media/fig-a.png')).toBe(
      'https://exemple.org/fr/lire/le-double-tome-1?chapitre=1&figure=fig-a',
    );
  });

  it('une figure d’un chapitre reserve n’est pas reliee : elle n’est pas offerte', () => {
    expect(cible('https://miroir.example/x/media/video/ch02/fig-c.mp4')).toBeNull();
  });

  it('ce que l’index ne connait pas reste tel quel', () => {
    expect(cible('https://miroir.example/x/media/video/ch01/inconnue.mp4')).toBeNull();
    expect(cible('https://openstax.org/details/books/biology-2e')).toBeNull();
  });
});

describe('la reecriture dans un vrai PDF', () => {
  /** Un PDF d'une page, portant un lien par adresse donnee. */
  async function pdfAvecLiens(adresses: string[]): Promise<Uint8Array> {
    const document = await PDFDocument.create();
    const page = document.addPage([300, 300]);
    const annotations = adresses.map((uri, rang) =>
      document.context.register(
        document.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [10, 10 + rang * 40, 200, 40 + rang * 40],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) },
        }),
      ),
    );
    page.node.set(PDFName.of('Annots'), document.context.obj(annotations));
    return document.save();
  }

  async function adressesDe(octets: Uint8Array): Promise<string[]> {
    const document = await PDFDocument.load(octets);
    const annotations = document.getPage(0).node.lookup(PDFName.of('Annots'), PDFArray);
    return annotations.asArray().map((_, i) => {
      const action = annotations.lookup(i, PDFDict).lookup(PDFName.of('A'), PDFDict);
      return (action.lookup(PDFName.of('URI'), PDFString)).decodeText();
    });
  }

  it('relie ce qui est connu, laisse le reste, et le dit lien par lien', async () => {
    const source = await pdfAvecLiens([
      'https://miroir.example/x/media/video/ch01/fig-a.mp4',
      'https://miroir.example/x/media/video/ch02/fig-c.mp4',
    ]);
    const { octets, liens } = await relierLesLiens(source, (uri) => cibleDUnLien(uri, tome1(), charge, DOMAINE));

    expect(await adressesDe(octets)).toEqual([
      'https://exemple.org/fr/lire/le-double-tome-1?chapitre=1&figure=fig-a',
      'https://miroir.example/x/media/video/ch02/fig-c.mp4',
    ]);
    expect(liens.map((l) => l.apres === null)).toEqual([false, true]);
  });
});

describe('regle 6.7 — seul l’extrait RELIE entre dans l’index', () => {
  // essai-simple offre un extrait (`extractPdf: true`) ; essai-double non.
  const livre = () => fichierExtrait(quai.racine, 'essai-simple', 1, 'fr');
  const relie = () => fichierExtraitRelie(derives, 'essai-simple', 1, 'fr');
  const fabriquer = () => fabriquerIndex(quai.racine, quai.manifestes, '2026-10-24T00:00:00.000Z', derives);
  const simple = (f: ReturnType<typeof fabriquer>) => f.index.fiches.find((x) => x.ouvrage === 'essai-simple')!;

  function poser(fichier: string, date: Date): void {
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    fs.writeFileSync(fichier, '%PDF-1.7 essai');
    fs.utimesSync(fichier, date, date);
  }

  it('non livre : pas d’extrait, et le rapport le dit', () => {
    const fabrication = fabriquer();
    expect(simple(fabrication).extrait).toBeNull();
    expect(fabrication.rapport.some((l) => l.includes('pas livre'))).toBe(true);
  });

  it('livre mais pas relie : il n’est servi a personne', () => {
    poser(livre(), new Date('2026-10-24T10:00:00Z'));
    const fabrication = fabriquer();
    expect(simple(fabrication).extrait).toBeNull();
    expect(fabrication.index.entrees.some((e) => e.sorte === 'extrait')).toBe(false);
    expect(fabrication.rapport.some((l) => l.includes('pas relie'))).toBe(true);
  });

  it('relie : offert, et lu hors du quai', () => {
    poser(relie(), new Date('2026-10-24T11:00:00Z'));
    const fabrication = fabriquer();
    // Mono-volume : la clef d'oeuvre n'ecope d'aucun suffixe (regle 1.5).
    expect(simple(fabrication).extrait).toMatchObject({
      adresse: 'essai-simple/fr/extrait.pdf',
      nom: 'le-simple-extrait.pdf',
    });
    expect(fabrication.index.entrees.find((e) => e.sorte === 'extrait')).toMatchObject({
      acces: 'offert',
      origine: 'derive',
      fichier: 'extraits/essai-simple/vol-1/fr.pdf',
    });
  });

  it('relie AVANT une nouvelle livraison : il n’est plus servi', () => {
    poser(livre(), new Date('2026-10-24T12:00:00Z'));
    const fabrication = fabriquer();
    expect(simple(fabrication).extrait).toBeNull();
    expect(fabrication.rapport.some((l) => l.includes('plus ancien que sa livraison'))).toBe(true);
  });

  it('regle 1.7 — un ouvrage qui n’offre pas d’extrait n’en a pas, meme livre', () => {
    poser(fichierExtrait(quai.racine, 'essai-double', 1, 'fr'), new Date());
    poser(fichierExtraitRelie(derives, 'essai-double', 1, 'fr'), new Date());
    const fabrication = fabriquer();
    expect(fabrication.index.fiches.filter((f) => f.ouvrage === 'essai-double').every((f) => !f.extrait)).toBe(true);
  });
});
