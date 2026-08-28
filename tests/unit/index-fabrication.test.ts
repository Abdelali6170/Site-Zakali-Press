/**
 * tests/unit/index-fabrication.test.ts
 * Zakali Press — la fabrication de l'index, sur deux quais d'essai.
 *
 * Regles 1.2, 1.5, 1.7, 1.8 · 2.3, 2.4 · 3.1, 3.2, 3.4 · 4.1 a 4.6.
 *
 * Les deux ouvrages sont montes sur des quais de FORME IDENTIQUE — l'un a deux
 * volumes et deux langues, l'autre a volume unique. C'est le test que la regle
 * 1.2 designe, et il porte tout le reste avec lui.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex, entreeDe, ficheDe, VERSION_DE_L_INDEX, type Index } from '@/index/index';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

let quai: QuaiDEssai;
let index: Index;
let rapport: string[];

beforeAll(() => {
  quai = monterLeQuaiDEssai();
  const fabrication = fabriquerIndex(quai.racine, quai.manifestes, '2026-08-28T00:00:00.000Z');
  index = fabrication.index;
  rapport = fabrication.rapport;
});

afterAll(() => quai.demonter());

/** Les remarques du rapport qui parlent de ce sujet. */
function remarques(motif: string | RegExp): string[] {
  const test = typeof motif === 'string' ? (l: string) => l.includes(motif) : (l: string) => motif.test(l);
  return rapport.filter(test);
}

function adresses(): string[] {
  return index.entrees.map((e) => e.adresse);
}

describe('regle 1.2 — deux quais de forme identique, deux ouvrages differents', () => {
  it('le meme code lit un ouvrage a deux volumes et un ouvrage a volume unique', () => {
    const parOuvrage = new Map<string, number>();
    for (const fiche of index.fiches) {
      parOuvrage.set(fiche.ouvrage, (parOuvrage.get(fiche.ouvrage) ?? 0) + 1);
    }
    // essai-double : 2 volumes x 2 langues, moins vol-2/en qui manque = 3.
    expect(parOuvrage.get('essai-double')).toBe(3);
    expect(parOuvrage.get('essai-simple')).toBe(1);
  });

  it('l’interieur d’un volume n’est pas impose (regle 1.2 bis)', () => {
    // Le meme volume range ses chapitres dans `pages/` en francais et dans
    // `chapters/` en anglais. Les deux se lisent, parce que le sommaire donne
    // l'adresse et que rien ne la compose.
    expect(adresses()).toContain('essai-double-vol-1/fr/pages/chapitre_01.html');
    expect(adresses()).toContain('essai-double-vol-1/en/chapters/chapitre_01.html');
  });
});

describe('regle 4.2 — l’adresse garde la forme d’un chemin', () => {
  it('`<clef d’oeuvre>/<langue>/<chemin dans le volume>`', () => {
    const entree = entreeDe(chargerIndex(index), 'essai-double-vol-1/fr/pages/chapitre_01.html');
    expect(entree?.sorte).toBe('page');
  });

  it('un ouvrage mono-volume n’ecope d’aucun suffixe dans ses adresses (regle 1.5)', () => {
    expect(adresses()).toContain('essai-simple/fr/pages/chapitre_01.html');
    expect(adresses().some((a) => a.startsWith('essai-simple-vol-1/'))).toBe(false);
  });
});

describe('regle 4.3 — ce qui est offert l’est par deduction, pas par liste', () => {
  const offert = (adresse: string) =>
    index.entrees.find((e) => e.adresse === adresse)?.acces ?? 'absente';

  it('le sommaire, la preface et le premier chapitre sont offerts', () => {
    expect(offert('essai-double-vol-1/fr/index.html')).toBe('offert');
    expect(offert('essai-double-vol-1/fr/preface.html')).toBe('offert');
    expect(offert('essai-double-vol-1/fr/pages/chapitre_01.html')).toBe('offert');
  });

  it('les fichiers que ces pages appellent pour s’afficher le sont aussi', () => {
    expect(offert('essai-double-vol-1/fr/pages/images/fleur.png')).toBe('offert');
    expect(offert('essai-double-vol-1/fr/style/base.css')).toBe('offert');
    // Deduction a deux niveaux : la feuille appelle sa police.
    expect(offert('essai-double-vol-1/fr/style/polices/serif.woff2')).toBe('offert');
  });

  it('un chapitre CITE par le sommaire mais non offert reste reserve', () => {
    // Le sommaire est offert et le cite ; cela ne lui donne aucun droit.
    expect(offert('essai-double-vol-1/fr/pages/chapitre_02.html')).toBe('reserve');
    expect(offert('essai-double-vol-1/fr/pages/images/arbre.png')).toBe('reserve');
  });

  it('le texte integral du volume n’entre jamais dans l’index', () => {
    // `search.json` porte le texte des chapitres RESERVES. L'offrir avec le
    // sommaire donnerait le volume entier a qui sait le demander.
    expect(adresses().some((a) => a.endsWith('search.json'))).toBe(false);
  });

  it('la couverture est offerte : c’est le catalogue', () => {
    expect(offert('essai-double-vol-1/fr/couverture.png')).toBe('offert');
  });

  it('les PDF sont reserves', () => {
    expect(offert('essai-double-vol-1/fr/pdf/double-tome-1.pdf')).toBe('reserve');
  });
});

describe('regle 4.4 — la narration est indexee, pas seulement lue', () => {
  it('elle entre dans l’index au meme niveau d’acces que son chapitre', () => {
    const charge = chargerIndex(index);
    // Chapitre 1 offert : sa narration l'est.
    expect(entreeDe(charge, 'essai-double-vol-1/fr/media/narration/ch01/fig-a.txt')?.acces).toBe(
      'offert',
    );
    // Chapitre 2 reserve : la sienne aussi.
    expect(entreeDe(charge, 'essai-double-vol-1/fr/media/narration/ch02/fig-c.txt')?.acces).toBe(
      'reserve',
    );
  });
});

describe('regle 3.1 — la narration fait foi, l’audio est un repli, la video jamais', () => {
  it('trois videos posees, deux figures comptees', () => {
    const fiche = index.fiches.find((f) => f.ouvrage === 'essai-double' && f.volume === 1 && f.langue === 'fr')!;
    const chapitre = fiche.chapitres.find((c) => c.numero === 1)!;
    expect(chapitre.figures).toBe(2);
  });

  it('le doublon video n’est pas indexe — pas meme a son adresse exacte', () => {
    // Le fichier EST sur le quai. Son nom de base n'etant pas dans la
    // narration, aucune adresse ne le designe.
    expect(adresses()).toContain('essai-double-vol-1/fr/media/video/ch01/fig-b.mp4');
    expect(adresses()).not.toContain('essai-double-vol-1/fr/media/video/ch01/fig-b-bis.mp4');
  });

  it('faute de narration, on compte l’audio', () => {
    const fiche = index.fiches.find((f) => f.ouvrage === 'essai-simple')!;
    expect(fiche.chapitres.find((c) => c.numero === 1)!.figures).toBe(2);
    expect(remarques('n’a pas de narration')).toHaveLength(2);
  });

  it('on ne compte JAMAIS la video', () => {
    // `essai-simple` a deux videos posees pour ch01 et ne les sert pas : le
    // comptage vaut 2 grace a l'audio, pas grace a la video.
    expect(adresses().some((a) => a.startsWith('essai-simple/fr/media/video/'))).toBe(false);
  });
});

describe('regle 3.2 — les noms de figure sortent de la reference de comptage', () => {
  it('la liste vient du dossier de narration, jamais d’un dossier de media', () => {
    const video = adresses().filter((a) => a.startsWith('essai-double-vol-1/fr/media/video/ch01/'));
    const narration = adresses().filter((a) =>
      a.startsWith('essai-double-vol-1/fr/media/narration/ch01/'),
    );
    expect(narration).toHaveLength(2);
    expect(video).toHaveLength(2); // trois fichiers poses, deux figures connues
  });
});

describe('regle 2.3 — le suffixe de lettre fait partie de l’identite d’un chapitre', () => {
  const fiche = () => index.fiches.find((f) => f.ouvrage === 'essai-double' && f.volume === 2)!;

  it('3a et 3b sont deux chapitres du sommaire', () => {
    expect(fiche().chapitres.map((c) => c.suffixe)).toEqual(['a', 'b']);
    expect(fiche().chapitres).toHaveLength(2);
  });

  it('mais un seul dossier de medias, compte UNE fois', () => {
    // Compter les figures par chapitre plutot que par dossier de medias
    // donnait 150 figures a un volume qui en a 137.
    const sommeParChapitre = fiche().chapitres.reduce((a, c) => a + c.figures, 0);
    expect(sommeParChapitre).toBe(6);
    expect(fiche().figures).toBe(3);
  });
});

describe('regle 1.7 — les reglages sont lus par ouvrage et ne debordent pas', () => {
  it('l’un offre un chapitre, l’autre en offre deux', () => {
    const double = index.fiches.find((f) => f.ouvrage === 'essai-double' && f.volume === 1 && f.langue === 'fr')!;
    const simple = index.fiches.find((f) => f.ouvrage === 'essai-simple')!;
    expect(double.chapitres.filter((c) => c.offert)).toHaveLength(1);
    expect(simple.chapitres.filter((c) => c.offert)).toHaveLength(2);
  });

  it('l’un sert la video et pas l’audio, l’autre l’inverse', () => {
    expect(adresses().some((a) => a.startsWith('essai-double-vol-1/fr/media/video/'))).toBe(true);
    expect(adresses().some((a) => a.startsWith('essai-double-vol-1/fr/media/audio/'))).toBe(false);
    expect(adresses().some((a) => a.startsWith('essai-simple/fr/media/audio/'))).toBe(true);
    expect(adresses().some((a) => a.startsWith('essai-simple/fr/media/video/'))).toBe(false);
  });

  it('les portees de vente ne se melangent pas', () => {
    expect(index.fiches.find((f) => f.ouvrage === 'essai-double')!.portee).toBe('work');
    expect(index.fiches.find((f) => f.ouvrage === 'essai-simple')!.portee).toBe('edition');
  });
});

describe('regle 1.8 — un reglage n’efface rien sur le quai', () => {
  it('l’audio est POSE mais l’index ne le connait pas', () => {
    const charge = chargerIndex(index);
    // Le fichier existe reellement sous `essai-double/media/fr/audio/ch01/`.
    // Aucune adresse ne le designe — pas meme celle-ci, qui est exacte.
    expect(entreeDe(charge, 'essai-double-vol-1/fr/media/audio/ch01/fig-a.mp3')).toBeUndefined();
  });
});

describe('regle 2.4 — une source incomplete est signalee, jamais fatale', () => {
  it('l’edition manquante est NOMMEE', () => {
    expect(remarques('Volume 2 en')[0]).toContain('le dossier de l’edition manque');
  });

  it('les autres editions continuent', () => {
    expect(index.fiches.some((f) => f.ouvrage === 'essai-double' && f.volume === 2 && f.langue === 'fr')).toBe(true);
    expect(index.fiches.some((f) => f.langue === 'en' && f.volume === 2)).toBe(false);
  });
});

describe('regle 3.4 — un ecart entre les langues est signale, pas corrige', () => {
  it('la fabrication dit l’ecart et poursuit', () => {
    // Le francais compte 3 figures sur le volume 1, l'anglais 2.
    const ecart = remarques(/Volume 1 : figures/);
    expect(ecart).toHaveLength(1);
    expect(ecart[0]).toContain('3 en fr');
    expect(ecart[0]).toContain('2 en en');
    expect(index.fiches.filter((f) => f.volume === 1)).toHaveLength(3);
  });
});

describe('regle 4.6 — la fabrication inspecte le quai et dit ce qui cloche', () => {
  it('nomme un fichier appele par une page mais absent du quai', () => {
    expect(remarques('absente.png')[0]).toContain('n’est pas sur le quai');
  });

  it('nomme une video manquante, sans echouer sur le reste', () => {
    expect(remarques(/la video de « fig-c » manque/)).toHaveLength(1);
    expect(index.fiches.length).toBeGreaterThan(0);
  });

  it('nomme un lien mort, et compte combien de pages le portent', () => {
    expect(remarques('lien mort vers manquant.pdf').length).toBeGreaterThan(0);
  });

  it('elle ne va rien chercher : elle regarde ce qui est pose', () => {
    // Aucune remarque ne mentionne un chemin hors du quai d'essai.
    expect(rapport.every((ligne) => !ligne.includes(':\\') && !ligne.startsWith('/'))).toBe(true);
  });
});

describe('regle 4.5 — l’index porte aussi les fiches du catalogue', () => {
  it('tout est calcule a la fabrication et range dans l’index', () => {
    const fiche = index.fiches.find((f) => f.slug === 'le-double-tome-1')!;
    expect(fiche).toMatchObject({
      clefDOeuvre: 'essai-double-vol-1',
      langue: 'fr',
      titre: 'Le double, tome premier',
      prix: 3900,
      devise: 'EUR',
      enAvant: true,
      portee: 'work',
    });
    expect(fiche.discipline).toEqual({ slug: 'essais', libelle: 'Essais', famille: 'Lettres' });
    expect(fiche.formats).toEqual({ pdf: true, video: true, audio: false });
    expect(fiche.licence).toContain('CC BY 4.0');
  });

  it('un ouvrage sans licence amont a une fiche sans licence (regle 1.9)', () => {
    expect(index.fiches.find((f) => f.ouvrage === 'essai-simple')!.licence).toBeNull();
  });

  it('une fiche se retrouve par son identifiant d’adresse (regle 5.6)', () => {
    expect(ficheDe(chargerIndex(index), 'fr', 'le-double-tome-2')?.volume).toBe(2);
    expect(ficheDe(chargerIndex(index), 'en', 'le-double-tome-2')).toBeUndefined();
  });
});

describe('regle 4.1 — aucun chemin ne vient d’une requete', () => {
  const charge = () => chargerIndex(index);

  it('une adresse malicieuse n’atteint rien', () => {
    for (const malicieuse of [
      '../../../etc/passwd',
      'essai-double-vol-1/fr/../../../etc/passwd',
      'essai-double-vol-1/fr/pages/../../../../secret',
      '/etc/passwd',
      'essai-double-vol-1\\fr\\index.html',
      'essai-double-vol-1/fr/index.html%00.png',
    ]) {
      expect(entreeDe(charge(), malicieuse)).toBeUndefined();
    }
  });

  it('un fichier reellement present mais NON indexe n’est atteint par rien', () => {
    // C'est la propriete qui rend la traversee de repertoire impossible PAR
    // CONSTRUCTION : il n'y a pas de filtre a contourner, il y a une table.
    expect(entreeDe(charge(), 'essai-double-vol-1/fr/search.json')).toBeUndefined();
    expect(entreeDe(charge(), 'essai-double-vol-1/fr/media/audio/ch01/fig-a.mp3')).toBeUndefined();
  });

  it('l’index refuse d’etre charge sous une autre version de forme', () => {
    expect(() => chargerIndex({ ...index, version: VERSION_DE_L_INDEX + 1 })).toThrow(
      /Refabriquer l'index/,
    );
  });
});
