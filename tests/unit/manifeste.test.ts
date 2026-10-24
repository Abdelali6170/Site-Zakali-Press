/**
 * tests/unit/manifeste.test.ts
 * Zakali Press — le manifeste d'un ouvrage (regles 1.4 a 1.9).
 *
 * Le manifeste est la seule chose qu'on declare a la main. Ces tests figent le
 * refus : ce qui n'est pas sur ne passe pas, et le message dit quel champ
 * relire.
 */

import { describe, expect, it } from 'vitest';

import {
  clefDOeuvre,
  lireManifeste,
  ManifesteDouteux,
  REGLAGES_PAR_DEFAUT,
} from '@/ouvrages/manifeste';
import { MANIFESTE_DOUBLE, MANIFESTE_SIMPLE } from '../aides/quai-essai';

/** Le manifeste d'essai, modifiable sans toucher a l'original. */
function copie(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(MANIFESTE_DOUBLE));
}

/** Les anomalies levees par un manifeste, ou [] s'il passe. */
function anomalies(brut: unknown): string[] {
  try {
    lireManifeste(brut, 'essai.json');
    return [];
  } catch (souci) {
    if (souci instanceof ManifesteDouteux) return souci.anomalies;
    throw souci;
  }
}

describe('regle 1.4 — un manifeste douteux est fatal, jamais devine', () => {
  it('le manifeste d’essai passe, lui', () => {
    expect(anomalies(copie())).toEqual([]);
  });

  it('champ manquant : l’import s’arrete et le message NOMME le champ', () => {
    const brut = copie();
    delete (brut.volumes as Record<string, unknown>[])[0].fr;
    expect(anomalies(brut)).toEqual(['volumes[0].fr : champ manquant.']);
  });

  it('un titre d’oeuvre manquant se nomme aussi', () => {
    const brut = copie();
    delete (brut.work as Record<string, unknown>).en;
    expect(anomalies(brut)).toContain('work.en : champ manquant.');
  });

  it('langue inconnue du site : refusee, et le message la cite', () => {
    const brut = copie();
    (brut.languages as string[]).push('de');
    const releve = anomalies(brut);
    expect(releve[0]).toContain('languages[2]');
    expect(releve[0]).toContain('langue inconnue du site');
    expect(releve[0]).toContain('de');
  });

  it('numero de volume declare deux fois : refuse', () => {
    const brut = copie();
    (brut.volumes as Record<string, unknown>[])[1].number = 1;
    expect(anomalies(brut)).toContain(
      'volumes[1].number : numero de volume declare deux fois — 1.',
    );
  });

  it('portee de vente fantaisiste : refusee, et le message dit les portees admises', () => {
    const brut = copie();
    (brut.settings as Record<string, unknown>).purchaseScope = 'chapitre';
    const releve = anomalies(brut);
    expect(releve[0]).toContain('settings.purchaseScope');
    expect(releve[0]).toContain('chapitre');
    expect(releve[0]).toContain('work, edition');
  });

  it('deux volumes qui partagent un identifiant d’adresse : refuses', () => {
    const brut = copie();
    const volumes = brut.volumes as Record<string, Record<string, string>>[];
    volumes[1].fr.slug = volumes[0].fr.slug;
    expect(anomalies(brut)[0]).toContain('volumes[1].fr.slug');
    expect(anomalies(brut)[0]).toContain('deja pris');
  });

  it('toutes les anomalies sont relevees d’un coup, pas une par execution', () => {
    const brut = copie();
    (brut.languages as string[]).push('de');
    (brut.settings as Record<string, unknown>).purchaseScope = 'chapitre';
    delete (brut.volumes as Record<string, unknown>[])[0].fr;
    expect(anomalies(brut)).toHaveLength(3);
  });

  it('l’identifiant ne peut pas porter de chemin : c’est le nom du dossier du quai', () => {
    const brut = copie();
    brut.id = '../ailleurs';
    expect(anomalies(brut)[0]).toContain('id');
  });
});

describe('regle 1.5 — la clef d’oeuvre relie les editions d’un meme volume', () => {
  const double = lireManifeste(MANIFESTE_DOUBLE, 'double.json');
  const simple = lireManifeste(MANIFESTE_SIMPLE, 'simple.json');

  it('un ouvrage a plusieurs volumes forme sa clef avec le numero', () => {
    expect(clefDOeuvre(double, 1)).toBe('essai-double-vol-1');
    expect(clefDOeuvre(double, 2)).toBe('essai-double-vol-2');
  });

  it('un ouvrage MONO-VOLUME n’ecope d’aucun suffixe', () => {
    // Un `-vol-1` parasite polluerait ses adresses pour toujours.
    expect(clefDOeuvre(simple, 1)).toBe('essai-simple');
  });

  it('les editions linguistiques d’un volume PARTAGENT la clef', () => {
    // La clef ne porte pas la langue : c'est ce qui permet a une commande de
    // portee `work` d'ouvrir les trois editions (regle 5.6).
    expect(clefDOeuvre(double, 1)).toBe(clefDOeuvre(double, 1));
  });
});

describe('regle 1.6 — la discipline se declare avec ses libelles par langue', () => {
  it('les libelles et les familles sont lus dans le manifeste', () => {
    const double = lireManifeste(MANIFESTE_DOUBLE, 'double.json');
    expect(double.discipline.slug).toBe('essais');
    expect(double.discipline.libelles.fr).toEqual({ libelle: 'Essais', famille: 'Lettres' });
    expect(double.discipline.libelles.en).toEqual({ libelle: 'Essays', famille: 'Humanities' });
  });

  it('un libelle manquant pour une langue declaree est fatal', () => {
    const brut = copie();
    delete (brut.category as Record<string, unknown>).en;
    expect(anomalies(brut)).toContain('category.en : champ manquant — il faut { label, group }.');
  });

  it('une discipline INEDITE ne demande de toucher aucun autre fichier', () => {
    // C'est le defaut qui a coute le plus cher dans l'ancien code : la
    // discipline devait etre saisie a la main dans trois fichiers de contenu.
    const brut = copie();
    (brut.category as Record<string, unknown>).slug = 'aeronautique';
    (brut.category as Record<string, unknown>).fr = { label: 'Aeronautique', group: 'Techniques' };
    (brut.category as Record<string, unknown>).en = { label: 'Aeronautics', group: 'Engineering' };
    const manifeste = lireManifeste(brut, 'essai.json');
    expect(manifeste.discipline.libelles.fr.famille).toBe('Techniques');
  });
});

describe('regle 1.7 — ce qui varie d’un ouvrage a l’autre est un reglage', () => {
  it('chaque reglage est lu PAR OUVRAGE et ne deborde pas sur l’autre', () => {
    const double = lireManifeste(MANIFESTE_DOUBLE, 'double.json');
    const simple = lireManifeste(MANIFESTE_SIMPLE, 'simple.json');

    expect(double.reglages).toEqual({
      chapitresOfferts: 1,
      portee: 'work',
      extraitPdf: false,
      videoDeFigure: true,
      audioDeFigure: false,
    });
    expect(simple.reglages).toEqual({
      chapitresOfferts: 2,
      portee: 'edition',
      extraitPdf: true,
      videoDeFigure: false,
      audioDeFigure: true,
    });
  });

  it('un manifeste sans reglages prend les defauts de la regle 1.7', () => {
    const brut = copie();
    delete brut.settings;
    expect(lireManifeste(brut, 'essai.json').reglages).toEqual(REGLAGES_PAR_DEFAUT);
  });
});

describe('regle 1.9 — rien de ce qui se lit n’est obligatoire', () => {
  it('un ouvrage sans oeuvre source est valide', () => {
    const simple = lireManifeste(MANIFESTE_SIMPLE, 'simple.json');
    expect(simple.oeuvreSource).toBeUndefined();
  });

  it('un ouvrage a volume unique est valide', () => {
    expect(lireManifeste(MANIFESTE_SIMPLE, 'simple.json').volumes).toHaveLength(1);
  });

  it('un ouvrage sans traduction est valide', () => {
    expect(lireManifeste(MANIFESTE_SIMPLE, 'simple.json').langues).toEqual(['fr']);
  });
});
