/**
 * tests/unit/quai-reel.test.ts
 * Zakali Press — la fabrication, contre le QUAI REEL.
 *
 * Les ouvrages d'essai figent les regles sur un quai qu'on a ecrit soi-meme,
 * donc sur un quai qui dit ce qu'on croit. Celui-ci n'a pas ete ecrit pour
 * nous : c'est lui qui a appris les regles au projet, et c'est contre lui
 * qu'elles doivent tenir.
 *
 * ── Ces tests s'ignorent d'eux-memes quand le quai n'est pas la ────────────
 *
 * Le quai n'est pas versionne (plusieurs gigaoctets) et n'existe pas sur un
 * poste neuf ni sur le serveur. Un test qui exigerait sa presence serait rouge
 * partout ailleurs que sur le poste de l'editeur — et un test rouge par
 * conception finit par ne plus etre lu.
 *
 * ── Les chiffres sont des reperes, pas des cibles ──────────────────────────
 *
 * Ils changent si le quai change. Ce qui est fige ici, ce sont les RAPPORTS
 * entre les chiffres : 385 fichiers video pour 383 figures, 150 figures
 * comptees par chapitre pour 137 reelles. Ces ecarts-la sont la raison d'etre
 * des regles 3.1 et 2.3, et ils ne doivent pas se reboucher en silence.
 */

import fs from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { fabriquerIndex, type Fabrication } from '@/index/fabriquer';
import { lireManifestes } from '@/ouvrages/catalogue';

/** Le quai, s'il est declare ET pose. Sinon, ces tests ne tournent pas. */
function racineSiPresente(): string | null {
  try {
    process.loadEnvFile();
  } catch {
    // Pas de .env : le quai n'est pas declare, et c'est un cas normal.
  }
  const declare = process.env.LIVRES_DIR?.trim();
  if (!declare) return null;
  const racine = path.resolve(declare);
  return fs.existsSync(path.join(racine, 'biology-2e')) ? racine : null;
}

const RACINE = racineSiPresente();

describe.skipIf(RACINE === null)('le quai reel — biology-2e', () => {
  let fabrication: Fabrication;

  beforeAll(() => {
    fabrication = fabriquerIndex(RACINE!, lireManifestes(), '2026-08-28T00:00:00.000Z');
  });

  const fiches = () => fabrication.index.fiches.filter((f) => f.ouvrage === 'biology-2e');
  const adresses = () => fabrication.index.entrees.map((e) => e.adresse);

  it('lit les quinze editions — cinq volumes, trois langues', () => {
    expect(fiches()).toHaveLength(15);
    expect(new Set(fiches().map((f) => f.volume))).toEqual(new Set([1, 2, 3, 4, 5]));
    expect(new Set(fiches().map((f) => f.langue))).toEqual(new Set(['fr', 'en', 'es']));
  });

  it('regle 3.1 — 385 fichiers video sur le quai, 383 figures indexees', () => {
    // Deux figures ont ete enregistrees en double sous un second nom de
    // fichier, memes octets. La narration ne les connait pas ; l'index non
    // plus. Aucun doublon n'a eu a etre reconnu pour cela.
    const surLeQuai = fs
      .readdirSync(path.join(RACINE!, 'biology-2e', 'media', 'fr', 'video'))
      .reduce(
        (somme, chapitre) =>
          somme +
          fs.readdirSync(path.join(RACINE!, 'biology-2e', 'media', 'fr', 'video', chapitre)).length,
        0,
      );
    const indexees = adresses().filter((a) => /^biology-2e-vol-\d+\/fr\/media\/video\//.test(a));

    expect(surLeQuai).toBe(385);
    expect(indexees).toHaveLength(383);
    expect(fiches().filter((f) => f.langue === 'fr').reduce((s, f) => s + f.figures, 0)).toBe(383);
  });

  it('regle 2.3 — le volume IV compte 150 figures par chapitre, et 137 reelles', () => {
    // `chapter_31a` et `chapter_31b` sont deux chapitres du sommaire, et un
    // seul dossier de medias `ch31`. C'est l'ecart exact que la regle cite.
    const volume = fiches().find((f) => f.volume === 4 && f.langue === 'fr')!;
    const parChapitre = volume.chapitres.reduce((somme, c) => somme + c.figures, 0);

    expect(volume.chapitres).toHaveLength(14);
    expect(volume.chapitres.filter((c) => c.numero === 31).map((c) => c.suffixe)).toEqual(['a', 'b']);
    expect(parChapitre).toBe(150);
    expect(volume.figures).toBe(137);
  });

  it('regle 3.4 — les trois langues s’accordent sur les comptages', () => {
    for (const numero of [1, 2, 3, 4, 5]) {
      const duVolume = fiches().filter((f) => f.volume === numero);
      expect(new Set(duVolume.map((f) => f.figures)).size).toBe(1);
      expect(new Set(duVolume.map((f) => f.chapitres.length)).size).toBe(1);
    }
    expect(fabrication.rapport.filter((l) => l.includes('ne s’accordent pas'))).toEqual([]);
  });

  it('regle 1.9 — la licence est lue dans la preface, dans les trois langues', () => {
    for (const fiche of fiches()) {
      expect(fiche.licence, `${fiche.volume} ${fiche.langue}`).toContain('CC BY 4.0');
    }
    // Chaque langue rend SA phrase, jamais une traduction fabriquee.
    const vol1 = (langue: string) => fiches().find((f) => f.volume === 1 && f.langue === langue)!;
    expect(vol1('fr').licence).toContain('s’inspire');
    expect(vol1('en').licence).toContain('is inspired by');
    expect(vol1('es').licence).toContain('se inspira');
  });

  it('regle 1.2 bis — les trois langues rangent leurs chapitres autrement', () => {
    // `chapters/`, `chapitres_fr/`, `chapitres_es/` : trois arborescences, et
    // aucune n'est ecrite dans le code. Le sommaire donne l'adresse.
    const chemin = (langue: string) =>
      fiches().find((f) => f.volume === 1 && f.langue === langue)!.chapitres[0].adresse;
    expect(chemin('en')).toContain('/chapters/');
    expect(chemin('fr')).toContain('/chapitres_fr/');
    expect(chemin('es')).toContain('/chapitres_es/');
  });

  it('regle 4.3 — le chapitre offert est le premier, le reste est reserve', () => {
    for (const fiche of fiches()) {
      expect(fiche.chapitres.filter((c) => c.offert)).toHaveLength(1);
      expect(fiche.chapitres[0].offert).toBe(true);
      expect(fiche.chapitres.slice(1).every((c) => !c.offert)).toBe(true);
    }
  });

  it('regle 4.3 — le texte integral du volume n’est jamais indexe', () => {
    // `search.json` porte le texte des chapitres reserves.
    expect(adresses().filter((a) => a.endsWith('search.json'))).toEqual([]);
  });

  it('regle 1.8 — aucun audio n’est indexe', () => {
    // `figureAudio: false` dans le manifeste. Depuis la livraison du 24 octobre
    // 2026, le quai reel ne porte plus d'audio du tout ; le cas « pose mais
    // ignore » est fige sur le quai d'essai (index-fabrication.test.ts).
    expect(adresses().filter((a) => a.includes('/media/audio/'))).toEqual([]);
  });

  it('regle 4.2 — chaque adresse est prefixee de sa clef d’oeuvre et de sa langue', () => {
    const attendu = /^biology-2e-vol-[1-5]\/(fr|en|es)\//;
    expect(adresses().filter((a) => !attendu.test(a))).toEqual([]);
  });

  it('regle 4.6 — le rapport nomme ce qui cloche, sans faire tomber le reste', () => {
    // Le quai a de vrais defauts : des liens vers des PDF qui n'y sont pas, et
    // une image de couverture que chaque page d'accueil appelle sans qu'elle
    // soit livree. Aucun n'empeche l'index d'exister.
    expect(fabrication.rapport.length).toBeGreaterThan(0);
    expect(fiches()).toHaveLength(15);
    expect(fabrication.rapport.some((l) => l.includes('lien mort'))).toBe(true);
  });
});
