/**
 * tests/unit/quai-lecture.test.ts
 * Zakali Press — lire le quai (regles 2.1 a 2.3, 3.3, 4.3).
 *
 * Tout ce qui peut etre lu est lu, jamais reformule. Ces tests figent la
 * lecture elle-meme, sur des fragments de balisage — la fabrication complete
 * est verifiee ailleurs, sur un quai monte de bout en bout.
 */

import { describe, expect, it } from 'vitest';

import { lireLicence } from '@/quai/licence';
import {
  fichiersAppelesParUneFeuille,
  fichiersAppelesParUnePage,
  liensDeNavigation,
  resoudreDansLeVolume,
} from '@/quai/page';
import { lireSommaire } from '@/quai/sommaire';

/**
 * Un sommaire a la maniere de Quarto : le fil d'Ariane EN TETE et le pied de
 * page « suivant » EN FIN portent la classe `chapter-title` sur le lien
 * lui-meme ; les entrees du sommaire la portent sur un `span` a l'interieur
 * d'un lien `sidebar-link`.
 */
const SOMMAIRE = `<!DOCTYPE html><html><body>
<nav class="quarto-page-breadcrumbs" aria-label="breadcrumb">
  <a href="./index.html" class="chapter-title">Fil d’Ariane</a>
</nav>
<div class="sidebar-menu-container"><ul>
  <li><a href="./index.html" class="sidebar-item-text sidebar-link active"><span class="chapter-title">index.html</span></a></li>
  <li><a href="./chapitres_fr/preface.fr.html" class="sidebar-item-text sidebar-link"><span class="chapter-title">Préface</span></a></li>
  <li><a class="sidebar-item-text sidebar-link text-start" data-bs-toggle="collapse"><span class="menu-text">Partie I</span></a></li>
  <li><a href="./chapitres_fr/chapter_31a.fr.html" class="sidebar-item-text sidebar-link"><span class="chapter-title">Chapitre 31a&nbsp;: premi&egrave;re partie</span></a></li>
  <li><a href="./chapitres_fr/chapter_31b.fr.html" class="sidebar-item-text sidebar-link"><span class="chapter-title">Chapitre 31b : seconde partie</span></a></li>
  <li><a href="./chapitres_fr/annexe.fr.html" class="sidebar-item-text sidebar-link"><span class="chapter-title">Annexe</span></a></li>
</ul></div>
<nav class="nav-page"><a href="./chapitres_fr/chapter_31a.fr.html" class="chapter-title">Chapitre suivant</a></nav>
</body></html>`;

describe('regle 2.2 — un chapitre est un lien de sommaire, pas un fichier trouve', () => {
  const sommaire = lireSommaire(SOMMAIRE);

  it('prend les chapitres DANS L’ORDRE du sommaire', () => {
    expect(sommaire.chapitres.map((c) => c.adresse)).toEqual([
      'chapitres_fr/chapter_31a.fr.html',
      'chapitres_fr/chapter_31b.fr.html',
      'chapitres_fr/annexe.fr.html',
    ]);
  });

  it('ecarte le fil d’Ariane et le pied de page, qui portent la MEME classe', () => {
    // Meme classe `chapter-title`, mais pas la meme structure : eux la portent
    // sur le lien, le sommaire la porte sur un span dans un `sidebar-link`.
    expect(sommaire.chapitres.some((c) => c.titre.includes('Ariane'))).toBe(false);
    expect(sommaire.chapitres.some((c) => c.titre.includes('suivant'))).toBe(false);
  });

  it('ecarte l’en-tete de partie, qui n’est pas un chapitre', () => {
    expect(sommaire.chapitres.some((c) => c.titre === 'Partie I')).toBe(false);
  });

  it('separe l’accueil et la preface des chapitres', () => {
    expect(sommaire.accueil?.adresse).toBe('index.html');
    expect(sommaire.preface?.adresse).toBe('chapitres_fr/preface.fr.html');
    expect(sommaire.preface?.titre).toBe('Préface');
  });

  it('rend les titres tels que le sommaire les ecrit, entites resolues', () => {
    expect(sommaire.chapitres[0].titre).toBe('Chapitre 31a : première partie');
  });
});

describe('regle 2.3 — le suffixe de lettre fait partie de l’identite d’un chapitre', () => {
  const sommaire = lireSommaire(SOMMAIRE);

  it('31a et 31b sont DEUX chapitres distincts', () => {
    const [a, b] = sommaire.chapitres;
    expect(a.adresse).not.toBe(b.adresse);
    expect([a.suffixe, b.suffixe]).toEqual(['a', 'b']);
  });

  it('mais ils partagent un seul dossier de medias', () => {
    const [a, b] = sommaire.chapitres;
    expect(a.numero).toBe(31);
    expect(b.numero).toBe(31);
  });

  it('un chapitre dont le nom ne porte pas de numero n’a pas de dossier de medias', () => {
    // Cas normal : une autre source nommera autrement, et zero figure est un
    // comptage valide (regle 1.9).
    expect(sommaire.chapitres[2].numero).toBeNull();
  });
});

describe('regle 2.1 — aucun chemin n’est devine, parce qu’aucun n’est compose', () => {
  it('resout une image appelee en relatif depuis la page', () => {
    expect(resoudreDansLeVolume('chapters/chapter_01.html', 'media/fig.png')).toBe(
      'chapters/media/fig.png',
    );
  });

  it('resout une feuille appelee en remontant', () => {
    expect(resoudreDansLeVolume('chapters/chapter_01.html', '../site_libs/a.css')).toBe(
      'site_libs/a.css',
    );
  });

  it('refuse tout ce qui sort du volume', () => {
    expect(resoudreDansLeVolume('chapters/c.html', '../../ailleurs.png')).toBeNull();
    expect(resoudreDansLeVolume('index.html', '../secret')).toBeNull();
    expect(resoudreDansLeVolume('index.html', '/etc/passwd')).toBeNull();
    expect(resoudreDansLeVolume('index.html', 'https://ailleurs.test/x.png')).toBeNull();
    expect(resoudreDansLeVolume('index.html', 'data:image/png;base64,AAA')).toBeNull();
  });

  it('un lien de sommaire remontant hors du volume est ecarte, pas suivi', () => {
    const sommaire = lireSommaire(
      '<div class="sidebar-menu-container">' +
        '<a href="../../ailleurs.html" class="sidebar-link"><span class="chapter-title">X</span></a>' +
        '</div>',
    );
    expect(sommaire.chapitres).toHaveLength(0);
    expect(sommaire.ecartes).toHaveLength(1);
  });
});

describe('regle 4.3 — ce qui est offert l’est par deduction, pas par liste', () => {
  const PAGE = `<html><head>
<link href="../style/base.css" rel="stylesheet">
<script src="../site_libs/nav.js"></script>
</head><body>
<img src="media/figure.png" alt="">
<video poster="media/vignette.png"><source src="media/clip.mp4"></video>
<a href="chapter_02.html">Chapitre suivant</a>
<a href="../pdf/livre.pdf">Telecharger</a>
</body></html>`;

  it('releve les fichiers que la page appelle POUR S’AFFICHER', () => {
    expect(fichiersAppelesParUnePage('chapters/chapter_01.html', PAGE).sort()).toEqual([
      'chapters/media/clip.mp4',
      'chapters/media/figure.png',
      'chapters/media/vignette.png',
      'site_libs/nav.js',
      'style/base.css',
    ]);
  });

  it('ne compte JAMAIS un lien comme une dependance', () => {
    // Le sommaire cite tous les chapitres du volume : compter ses liens
    // offrirait le volume entier. Une page de chapitre non offerte reste
    // reservee meme si une page offerte y renvoie.
    const appeles = fichiersAppelesParUnePage('chapters/chapter_01.html', PAGE);
    expect(appeles).not.toContain('chapters/chapter_02.html');
    expect(appeles).not.toContain('pdf/livre.pdf');
  });

  it('les liens restent lisibles a part, pour le rapport de fabrication', () => {
    expect(liensDeNavigation('chapters/chapter_01.html', PAGE).sort()).toEqual([
      'chapters/chapter_02.html',
      'pdf/livre.pdf',
    ]);
  });

  it('suit les polices qu’une feuille de style appelle', () => {
    // Une page offerte privee de ses polices s'affiche avec des carres a la
    // place des icones : la deduction ne s'arrete pas au premier niveau.
    const css = '@font-face { src: url("fonts/icones.woff2") format("woff2"); }\n' +
      '.fond { background: url(../images/trame.png); }';
    expect(fichiersAppelesParUneFeuille('site_libs/bootstrap/icones.css', css).sort()).toEqual([
      'site_libs/bootstrap/fonts/icones.woff2',
      'site_libs/images/trame.png',
    ]);
  });
});

describe('regle 1.9 — la licence se lit dans la preface, quand il y en a une', () => {
  it('rend la mention telle que la preface l’ecrit', () => {
    const preface = `<html><body>
<p>Chaque figure recoit un explicatif dit.</p>
<p>Ce livre s’inspire du contenu d’OpenStax Biology 2e (Rice University),
disponible librement sous licence Creative Commons Attribution 4.0
International (CC BY 4.0).</p>
</body></html>`;
    expect(lireLicence(preface)).toBe(
      'Ce livre s’inspire du contenu d’OpenStax Biology 2e (Rice University), ' +
        'disponible librement sous licence Creative Commons Attribution 4.0 ' +
        'International (CC BY 4.0).',
    );
  });

  it('une preface sans licence amont rend null, sans se plaindre', () => {
    // Un ouvrage propre a la maison n'est l'edition de rien.
    expect(lireLicence('<html><body><p>Bonne lecture.</p></body></html>')).toBeNull();
  });
});
