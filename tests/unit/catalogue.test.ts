/**
 * tests/unit/catalogue.test.ts
 * Zakali Press — le catalogue et la porte, sur les deux ouvrages d'essai.
 *
 * Regles 1.6 · 4.1, 4.3 · 7.2 · 8.1, 8.2, 8.3.
 *
 * Les deux ouvrages d'essai sont ceux de la fabrication : un ouvrage a deux
 * volumes dont le second manque en anglais, et un ouvrage mono-volume d'une
 * autre discipline. C'est ce que le catalogue doit savoir montrer.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { disciplinesDepuis } from '@/contenu/disciplines';
import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex, type Index } from '@/index/index';
import { cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { vueDAccueil } from '@/ouvrages/accueil';
import { detailDuVolume } from '@/ouvrages/detail';
import { formaterPrix } from '@/ouvrages/prix';
import { vitrine } from '@/ouvrages/vitrine';
import { lectureDuChapitre, sortieVersLaLiseuse } from '@/porte/page-reservee';
import { decider } from '@/porte/porte';
import { monterLeQuaiDEssai, type QuaiDEssai } from '../aides/quai-essai';

let quai: QuaiDEssai;
let index: Index;

beforeAll(() => {
  quai = monterLeQuaiDEssai();
  index = fabriquerIndex(quai.racine, quai.manifestes, '2026-10-24T00:00:00.000Z').index;
});

afterAll(() => quai.demonter());

/** Espaces insecables comprises : seul compte ce que le lecteur voit. */
const aplanir = (texte: string) => texte.replace(/\s/gu, ' ');

describe('regle 8.1 — le catalogue ne montre qu’une langue', () => {
  it('en francais, deux oeuvres ; en anglais, l’ouvrage sans anglais disparait', () => {
    expect(vitrine(index.fiches, 'fr').map((o) => o.ouvrage)).toEqual(['essai-double', 'essai-simple']);
    expect(vitrine(index.fiches, 'en').map((o) => o.ouvrage)).toEqual(['essai-double']);
  });

  it('chaque fiche n’apparait qu’une fois, dans la langue de la page', () => {
    const volumes = vitrine(index.fiches, 'fr').flatMap((o) => o.volumes.map((v) => v.slug));
    expect(volumes).toEqual(['le-double-tome-1', 'le-double-tome-2', 'le-simple']);
  });
});

describe('l’oeuvre est un niveau au-dessus de l’edition', () => {
  it('les volumes se rangent sous leur oeuvre, dans l’ordre de leur numero', () => {
    const double = vitrine(index.fiches, 'fr').find((o) => o.ouvrage === 'essai-double')!;
    expect(double.volumes.map((v) => v.volume)).toEqual([1, 2]);
    expect(double.titre).toBe('Le double');
  });

  it('un ouvrage mono-volume se signale, pour s’afficher autrement', () => {
    const [double, simple] = vitrine(index.fiches, 'fr');
    expect(double.monoVolume).toBe(false);
    expect(simple.monoVolume).toBe(true);
  });

  it('un volume manquant dans une langue n’en fait pas un ouvrage mono-volume', () => {
    // `vol-2/en` n'est pas livre : l'anglais n'a qu'un volume a montrer, mais
    // l'ouvrage en a deux.
    const [double] = vitrine(index.fiches, 'en');
    expect(double.volumes).toHaveLength(1);
    expect(double.monoVolume).toBe(false);
  });

  it('les langues d’un ouvrage sont toutes nommees, pas seulement celle de la page', () => {
    expect(vitrine(index.fiches, 'fr')[0].langues).toEqual(['fr', 'en']);
  });

  it('regle 8.3 — la portee voyage avec l’oeuvre', () => {
    const [double, simple] = vitrine(index.fiches, 'fr');
    expect(double.portee).toBe('work');
    expect(simple.portee).toBe('edition');
  });
});

describe('regle 8.2 — les prix sont des entiers, formates a l’affichage', () => {
  it('chaque langue ecrit le montant a sa maniere', () => {
    expect(aplanir(formaterPrix(3900, 'EUR', 'fr'))).toBe('39,00 €');
    expect(aplanir(formaterPrix(3900, 'EUR', 'es'))).toBe('39,00 €');
    expect(formaterPrix(3900, 'EUR', 'en')).toBe('€39.00');
  });

  it('la vitrine ne livre que la chaine, jamais le montant brut', () => {
    const tome2 = vitrine(index.fiches, 'fr')[0].volumes[1];
    expect(aplanir(tome2.prix)).toBe('45,00 €');
    expect(tome2).not.toHaveProperty('devise');
  });
});

describe('regle 1.6 — les disciplines se deduisent des ouvrages presents', () => {
  it('chaque discipline vient d’un manifeste, avec son libelle dans la langue', () => {
    expect(disciplinesDepuis(index.fiches, 'fr').map((d) => [d.slug, d.libelle, d.famille])).toEqual([
      ['essais', 'Essais', 'Lettres'],
      ['ia', 'Intelligence artificielle', 'Informatique'],
    ]);
  });

  it('une discipline sans ouvrage dans cette langue n’existe pas', () => {
    expect(disciplinesDepuis(index.fiches, 'en').map((d) => d.slug)).toEqual(['essais']);
  });

  it('elle est mise en avant si l’un de ses volumes l’est', () => {
    const [essais, ia] = disciplinesDepuis(index.fiches, 'fr');
    expect(essais.miseEnAvant).toBe(true);
    expect(ia.miseEnAvant).toBe(false);
  });

  it('le filtre de discipline ne garde que ses oeuvres', () => {
    expect(vitrine(index.fiches, 'fr', 'ia').map((o) => o.ouvrage)).toEqual(['essai-simple']);
  });
});

describe('la porte unique — regles 4.1 et 4.3', () => {
  const statut = (adresse: string) => decider(chargerIndex(index), adresse).statut;

  it('ce qui est offert passe : la couverture, le sommaire, le chapitre offert', () => {
    expect(statut('essai-double-vol-1/fr/couverture.png')).toBe(200);
    expect(statut('essai-double-vol-1/fr/pages/chapitre_01.html')).toBe(200);
  });

  it('ce qui est reserve repond 403, et non 404', () => {
    expect(statut('essai-double-vol-1/fr/pages/chapitre_02.html')).toBe(403);
    expect(statut('essai-double-vol-1/fr/pdf/double-tome-1.pdf')).toBe(403);
  });

  it('un fichier present sur le quai mais non indexe n’atteint rien', () => {
    expect(statut('essai-double-vol-1/fr/search.json')).toBe(404);
  });

  it('une adresse de dossier renvoie vers sa page d’accueil indexee', () => {
    // C'est ce que demande le sommaire une fois que `quarto-nav.js` a retire
    // `index.html` de ses liens.
    const charge = chargerIndex(index);
    expect(decider(charge, 'essai-double-vol-1/fr')).toEqual({
      statut: 308,
      vers: 'essai-double-vol-1/fr/index.html',
    });
    expect(decider(charge, 'essai-double-vol-1/fr/')).toMatchObject({ statut: 308 });
    // Un dossier sans page d'accueil indexee ne mene nulle part.
    expect(decider(charge, 'essai-double-vol-1/fr/pages').statut).toBe(404);
  });

  it('regle 4.7 — un media appele depuis le dossier d’une page renvoie a son adresse canonique', () => {
    // La page `pages/chapitre_01.html` calcule ses videos en relatif :
    // `pages/media/video/ch01/…`. L'index les connait a `media/video/ch01/…`.
    const charge = chargerIndex(index);
    expect(decider(charge, 'essai-double-vol-1/fr/pages/media/video/ch01/fig-a.mp4')).toEqual({
      statut: 308,
      vers: 'essai-double-vol-1/fr/media/video/ch01/fig-a.mp4',
    });
    // Un media que l'index ne connait pas ne mene nulle part.
    expect(decider(charge, 'essai-double-vol-1/fr/pages/media/video/ch01/inconnue.mp4').statut).toBe(404);
    // Le renvoi ne traverse pas les editions : la meme figure, mais en anglais.
    expect(decider(charge, 'essai-double-vol-1/en/pages/media/video/ch01/fig-b.mp4').statut).toBe(404);
  });

  it('une adresse malicieuse ne correspond a rien', () => {
    for (const adresse of [
      '../../../etc/passwd',
      'essai-double-vol-1/fr/../../essai-simple/fr/pages/chapitre_01.html',
      'essai-double-vol-1/fr/pages/chapitre_02.html%00.png',
      'essai-double-vol-1\\fr\\couverture.png',
      '',
    ]) {
      expect(statut(adresse), adresse).toBe(404);
    }
  });
});

describe('la fiche d’un volume', () => {
  const trouver = (langue: 'fr' | 'en', slug: string) => {
    const recherche = detailDuVolume(index.fiches, langue, slug);
    if (recherche.statut !== 'trouve') throw new Error(`fiche ${langue}/${slug} : ${recherche.statut}`);
    return recherche.detail;
  };

  it('porte l’oeuvre, sa serie et la meme edition dans les autres langues', () => {
    const tome1 = trouver('fr', 'le-double-tome-1');
    expect(tome1.oeuvre).toMatchObject({ titre: 'Le double', volumes: 2 });
    expect(tome1.autresVolumes.map((v) => v.slug)).toEqual(['le-double-tome-2']);
    expect(tome1.autresLangues).toEqual([{ langue: 'en', slug: 'the-double-book-1' }]);
  });

  it('designe le premier chapitre offert, et lui seul', () => {
    const tome1 = trouver('fr', 'le-double-tome-1');
    expect(tome1.premierOffert).toBe(1);
    expect(tome1.chapitres[0].adresse).toBe('essai-double-vol-1/fr/pages/chapitre_01.html');
    expect(tome1.chapitres.filter((c) => c.offert)).toHaveLength(1);
  });

  it('regle 8.2 — prix et tailles arrivent ecrits dans la langue', () => {
    const tome1 = trouver('fr', 'le-double-tome-1');
    expect(aplanir(tome1.prix)).toBe('39,00 €');
    expect(tome1.pdfs.every((p) => /Mo$/.test(p.taille))).toBe(true);
    expect(trouver('en', 'the-double-book-1').pdfs.every((p) => /MB$/.test(p.taille))).toBe(true);
  });

  it('la mention de licence n’est rappelee que si la description ne la porte pas', () => {
    const fiche = index.fiches.find((f) => f.slug === 'le-double-tome-1')!;
    expect(trouver('fr', 'le-double-tome-1').licence).toBe(fiche.licence);

    const deja = { ...fiche, description: `${fiche.description}\n\n${fiche.licence}` };
    const recherche = detailDuVolume([deja], 'fr', 'le-double-tome-1');
    expect(recherche.statut === 'trouve' && recherche.detail.licence).toBeNull();
  });

  it('regle 7.4 — un identifiant d’une autre langue designe l’edition de cette langue', () => {
    // Le selecteur de langue garde l'identifiant : /en/catalogue/le-double-tome-1.
    expect(detailDuVolume(index.fiches, 'en', 'le-double-tome-1')).toEqual({
      statut: 'ailleurs',
      slug: 'the-double-book-1',
    });
  });

  it('regle 7.4 — ou rien, si l’oeuvre n’existe pas dans cette langue', () => {
    // vol-2/en n'est pas livre ; l'ouvrage simple n'a pas d'anglais.
    expect(detailDuVolume(index.fiches, 'en', 'le-double-tome-2').statut).toBe('introuvable');
    expect(detailDuVolume(index.fiches, 'en', 'le-simple').statut).toBe('introuvable');
    expect(detailDuVolume(index.fiches, 'fr', 'inexistant').statut).toBe('introuvable');
  });
});

describe('regle 4.3 — un chapitre reserve mene a sa page dans le site', () => {
  const RESERVE = 'essai-double-vol-1/fr/pages/chapitre_02.html';

  it('le chapitre est retrouve : son edition, et sa place au sommaire', () => {
    expect(lectureDuChapitre(index.fiches, RESERVE)).toEqual({
      langue: 'fr',
      slug: 'le-double-tome-1',
      rang: 2,
    });
    // Une image reservee n'est pas un chapitre : elle garde un 403 nu.
    expect(lectureDuChapitre(index.fiches, 'essai-double-vol-1/fr/pages/images/arbre.png')).toBeNull();
  });

  it('le refus emmene la fenetre ENTIERE vers la liseuse, jamais le seul cadre', () => {
    const html = sortieVersLaLiseuse({ langue: 'fr', slug: 'le-double-tome-1', rang: 2 });
    expect(html).toContain('window.top.location.replace("/fr/lire/le-double-tome-1?chapitre=2")');
    // Sans JavaScript, le lien sort lui aussi du cadre.
    expect(html).toContain('href="/fr/lire/le-double-tome-1?chapitre=2" target="_top"');
  });

  it('l’adresse ne peut pas sortir du script', () => {
    const html = sortieVersLaLiseuse({ langue: 'fr', slug: '</script><script>alert(1)', rang: 1 });
    expect(html.match(/<script>/g)).toHaveLength(1);
  });
});

describe('l’accueil — tout ce qu’il montre des ouvrages vient de l’index', () => {
  it('l’oeuvre a la une est celle du volume mis en avant', () => {
    const vue = vueDAccueil(index.fiches, 'fr');
    expect(vue.aLaUne?.ouvrage).toBe('essai-double');
    expect(vue.chapitreOffert).toEqual({ slug: 'le-double-tome-1', rang: 1 });
  });

  it('les chiffres se comptent dans la langue de la page', () => {
    const fr = vueDAccueil(index.fiches, 'fr').chiffres;
    expect(fr.volumes).toBe(3);
    expect(fr.langues).toBe(2);
    // L'ouvrage simple ne sert pas la video : ses figures ne comptent pas.
    const figuresDuDouble = index.fiches
      .filter((f) => f.langue === 'fr' && f.ouvrage === 'essai-double')
      .reduce((s, f) => s + f.figures, 0);
    expect(fr.figures).toBe(figuresDuDouble);

    expect(vueDAccueil(index.fiches, 'en').chiffres.volumes).toBe(1);
  });

  it('les disciplines comptent leurs oeuvres et leurs volumes', () => {
    expect(vueDAccueil(index.fiches, 'fr').disciplines).toEqual([
      { slug: 'essais', libelle: 'Essais', famille: 'Lettres', oeuvres: 1, volumes: 2 },
      { slug: 'ia', libelle: 'Intelligence artificielle', famille: 'Informatique', oeuvres: 1, volumes: 1 },
    ]);
  });

  it('un catalogue vide ne casse pas la page', () => {
    expect(vueDAccueil([], 'fr')).toEqual({
      aLaUne: null,
      chapitreOffert: null,
      chiffres: { volumes: 0, langues: 0, figures: 0 },
      disciplines: [],
    });
  });
});

describe('regle 7.2 — les adresses de contenu n’ont pas de prefixe de langue', () => {
  it('l’adresse d’index devient l’adresse publique, segment par segment', () => {
    expect(cheminDeContenu('essai-double-vol-1/fr/couverture.png')).toBe(
      '/contenu/essai-double-vol-1/fr/couverture.png',
    );
    expect(cheminDeContenu('ouvrage/fr/une page.html')).toBe('/contenu/ouvrage/fr/une%20page.html');
  });

  it('la liseuse, elle, est une page traduite : le chapitre par sa place au sommaire', () => {
    expect(cheminDeLecture('fr', 'le-double-tome-1')).toBe('/fr/lire/le-double-tome-1');
    expect(cheminDeLecture('en', 'the-double-book-1', 2)).toBe('/en/read/the-double-book-1?chapitre=2');
    expect(cheminDeLecture('es', 'x', 3)).toBe('/es/leer/x?chapitre=3');
  });
});
