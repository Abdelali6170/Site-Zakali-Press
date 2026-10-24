/**
 * tests/aides/quai-essai.ts
 * Zakali Press — deux ouvrages d'essai, sur deux quais de forme identique.
 *
 * Regle 1.2 — « Fige par : le test a deux ouvrages d'essai monte deux quais de
 * forme identique, l'un a deux volumes et deux langues, l'autre a volume
 * unique. »
 *
 * Ce quai n'est pas une maquette polie : chaque bizarrerie y est DELIBEREE, et
 * chacune fige une regle.
 *
 *   essai-double — 2 volumes, 2 langues (fr, en)
 *     · vol-1 : deux chapitres, `pages/` en francais et `chapters/` en anglais
 *               — l'interieur d'un volume n'est pas impose (regle 1.2 bis)
 *     · vol-2 : `chapitre_03a` et `chapitre_03b`, DEUX chapitres pour un seul
 *               dossier de medias `ch03` (regle 2.3)
 *     · vol-2/en : ABSENT — une source incomplete est signalee (regle 2.4)
 *     · ch01 fr : 2 narrations, 3 videos — la troisieme est un doublon
 *               enregistre sous un autre nom (regle 3.1)
 *     · ch01 : 2 figures en francais, 1 en anglais — un ecart entre langues
 *               (regle 3.4)
 *     · audio pose sur le quai, `figureAudio: false` — present mais jamais
 *               indexe, donc inatteignable (regle 1.8)
 *     · une preface avec mention de licence
 *
 *   essai-simple — 1 volume, 1 langue (fr)
 *     · MONO-VOLUME : sa clef d'oeuvre n'ecope d'aucun suffixe (regle 1.5)
 *     · reglages opposes a l'autre ouvrage : 2 chapitres offerts, portee
 *               `edition`, audio servi, video non — ils ne debordent pas d'un
 *               ouvrage sur l'autre (regle 1.7)
 *     · PAS de preface, PAS de narration (repli sur l'audio), un chapitre au
 *               nom sans numero : trois cas NORMAUX (regles 1.9 et 3.1)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { lireManifeste, type Manifeste } from '@/ouvrages/manifeste';

// ─────────────────────────────────────────────────────────────────────────────
//  Fabrique de pages
// ─────────────────────────────────────────────────────────────────────────────

type LienDeSommaire = { adresse: string; titre: string };

/**
 * Un sommaire a la maniere de Quarto.
 *
 * Le fil d'Ariane et le pied de page portent la classe `chapter-title` SUR LE
 * LIEN, la ou le sommaire la porte sur un `span` a l'interieur d'un lien
 * `sidebar-link`. C'est la difference que la regle 2.2 exige de voir.
 */
function pageDeSommaire(titre: string, liens: LienDeSommaire[]): string {
  return `<!DOCTYPE html><html><head><title>${titre}</title>
<link href="./style/base.css" rel="stylesheet">
</head><body>
<nav class="quarto-page-breadcrumbs" aria-label="breadcrumb">
  <a href="./index.html" class="chapter-title">${titre}</a>
</nav>
<div class="sidebar-menu-container">
  <ul class="list-unstyled">
${liens
  .map(
    (lien) =>
      `    <li class="sidebar-item"><div class="sidebar-item-container">` +
      `<a href="./${lien.adresse}" class="sidebar-item-text sidebar-link">` +
      `<span class="chapter-title">${lien.titre}</span></a></div></li>`,
  )
  .join('\n')}
  </ul>
</div>
<a href="./manquant.pdf">Telecharger le PDF</a>
</body></html>`;
}

/**
 * Une page de chapitre, avec ses images appelees en relatif.
 *
 * `suivant` reproduit ce que Quarto ecrit dans l'en-tete de chaque chapitre :
 * `<link rel="next">` vers le chapitre d'apres. C'est un `<link href>` qui
 * n'est PAS de l'affichage — il a offert le chapitre 2 des quinze editions
 * reelles jusqu'au 24 octobre 2026 (regle 4.3).
 */
function pageDeChapitre(titre: string, dossier: string, images: string[], suivant?: string): string {
  const remonte = '../'.repeat(dossier ? dossier.split('/').length : 0);
  return `<!DOCTYPE html><html><head><title>${titre}</title>
<link href="${remonte}style/base.css" rel="stylesheet">
${suivant ? `<link href="./${suivant}" rel="next">` : ''}
</head><body>
<nav class="quarto-page-breadcrumbs"><a href="${remonte}index.html" class="chapter-title">${titre}</a></nav>
<h1>${titre}</h1>
${images.map((image) => `<img src="images/${image}" alt="">`).join('\n')}
<nav class="nav-page"><a href="${remonte}index.html" class="chapter-title">Suivant</a></nav>
</body></html>`;
}

function pageDePreface(mentionDeLicence: string | null): string {
  return `<!DOCTYPE html><html><head><title>Preface</title></head><body>
<p>Cette collection propose une lecture guidee, figure par figure.</p>
${mentionDeLicence ? `<p>${mentionDeLicence}</p>` : ''}
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Fabrique de quai
// ─────────────────────────────────────────────────────────────────────────────

function ecrire(chemin: string, contenu: string | Buffer): void {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, contenu);
}

/** Un fichier binaire d'essai, de taille connue. */
function octets(combien: number): Buffer {
  return Buffer.alloc(combien, 7);
}

export type QuaiDEssai = {
  racine: string;
  manifestes: Manifeste[];
  demonter(): void;
};

/**
 * Monte les deux quais d'essai dans un dossier temporaire, et rend les
 * manifestes qui vont avec.
 */
export function monterLeQuaiDEssai(): QuaiDEssai {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'zakali-quai-'));

  // ═══ essai-double ════════════════════════════════════════════════════════
  const double = path.join(racine, 'essai-double');

  // ── vol-1, francais : les chapitres vivent dans `pages/` ─────────────────
  ecrire(
    path.join(double, 'vol-1', 'fr', 'index.html'),
    pageDeSommaire('Le double, tome premier', [
      { adresse: 'preface.html', titre: 'Preface' },
      { adresse: 'pages/chapitre_01.html', titre: 'Chapitre 1 : le commencement' },
      { adresse: 'pages/chapitre_02.html', titre: 'Chapitre 2 : la suite' },
    ]),
  );
  ecrire(
    path.join(double, 'vol-1', 'fr', 'preface.html'),
    pageDePreface(
      'Cet ouvrage s’appuie sur un fonds disponible sous licence Creative Commons ' +
        'Attribution 4.0 International (CC BY 4.0).',
    ),
  );
  ecrire(
    path.join(double, 'vol-1', 'fr', 'pages', 'chapitre_01.html'),
    pageDeChapitre('Chapitre 1', 'pages', ['fleur.png', 'absente.png'], 'chapitre_02.html'),
  );
  ecrire(
    path.join(double, 'vol-1', 'fr', 'pages', 'chapitre_02.html'),
    pageDeChapitre('Chapitre 2', 'pages', ['arbre.png']),
  );
  ecrire(path.join(double, 'vol-1', 'fr', 'pages', 'images', 'fleur.png'), octets(120));
  ecrire(path.join(double, 'vol-1', 'fr', 'pages', 'images', 'arbre.png'), octets(140));
  ecrire(
    path.join(double, 'vol-1', 'fr', 'style', 'base.css'),
    'body { font-family: serif; }\n@font-face { src: url("polices/serif.woff2"); }\n',
  );
  ecrire(path.join(double, 'vol-1', 'fr', 'style', 'polices', 'serif.woff2'), octets(300));
  // Le texte integral du volume, que Quarto depose a la racine. Il ne doit
  // JAMAIS entrer dans l'index (regle 1.8) : il porte les chapitres reserves.
  ecrire(path.join(double, 'vol-1', 'fr', 'search.json'), '[{"text":"tout le volume"}]');

  // ── vol-1, anglais : les memes chapitres dans `chapters/` (regle 1.2 bis) ─
  ecrire(
    path.join(double, 'vol-1', 'en', 'index.html'),
    pageDeSommaire('The double, book one', [
      { adresse: 'preface.html', titre: 'Preface' },
      { adresse: 'chapters/chapitre_01.html', titre: 'Chapter 1: the beginning' },
      { adresse: 'chapters/chapitre_02.html', titre: 'Chapter 2: what follows' },
    ]),
  );
  ecrire(path.join(double, 'vol-1', 'en', 'preface.html'), pageDePreface(null));
  ecrire(
    path.join(double, 'vol-1', 'en', 'chapters', 'chapitre_01.html'),
    pageDeChapitre('Chapter 1', 'chapters', ['flower.png']),
  );
  ecrire(
    path.join(double, 'vol-1', 'en', 'chapters', 'chapitre_02.html'),
    pageDeChapitre('Chapter 2', 'chapters', ['tree.png']),
  );
  ecrire(path.join(double, 'vol-1', 'en', 'chapters', 'images', 'flower.png'), octets(120));
  ecrire(path.join(double, 'vol-1', 'en', 'chapters', 'images', 'tree.png'), octets(140));
  ecrire(path.join(double, 'vol-1', 'en', 'style', 'base.css'), 'body { color: black; }\n');

  // ── vol-2, francais : deux chapitres, UN dossier de medias (regle 2.3) ────
  ecrire(
    path.join(double, 'vol-2', 'fr', 'index.html'),
    pageDeSommaire('Le double, tome second', [
      { adresse: 'pages/chapitre_03a.html', titre: 'Chapitre 3a : premiere partie' },
      { adresse: 'pages/chapitre_03b.html', titre: 'Chapitre 3b : seconde partie' },
    ]),
  );
  ecrire(
    path.join(double, 'vol-2', 'fr', 'pages', 'chapitre_03a.html'),
    pageDeChapitre('Chapitre 3a', 'pages', []),
  );
  ecrire(
    path.join(double, 'vol-2', 'fr', 'pages', 'chapitre_03b.html'),
    pageDeChapitre('Chapitre 3b', 'pages', []),
  );
  ecrire(path.join(double, 'vol-2', 'fr', 'style', 'base.css'), 'body { color: black; }\n');
  // vol-2/en n'existe pas : la source est incomplete, et cela se signale
  // sans faire tomber les autres editions (regle 2.4).

  // ── PDF et couvertures, sous le volume (regle 1.2) ───────────────────────
  ecrire(path.join(double, 'vol-1', 'pdf', 'fr', 'double-tome-1.pdf'), octets(900));
  ecrire(path.join(double, 'vol-1', 'pdf', 'en', 'double-book-1.pdf'), octets(900));
  ecrire(path.join(double, 'vol-2', 'pdf', 'fr', 'double-tome-2.pdf'), octets(800));
  ecrire(path.join(double, 'vol-1', 'couverture', 'fr.png'), octets(500));
  ecrire(path.join(double, 'vol-1', 'couverture', 'en.png'), octets(510));
  ecrire(path.join(double, 'vol-2', 'couverture', 'fr.png'), octets(520));

  // ── Les medias, au niveau de l'OUVRAGE ───────────────────────────────────
  //
  // ch01 francais : 2 narrations, mais TROIS videos. La troisieme est le meme
  // enregistrement sous un second nom — c'est le doublon de la regle 3.1.
  for (const nom of ['fig-a', 'fig-b']) {
    ecrire(path.join(double, 'media', 'fr', 'narration', 'ch01', `${nom}.txt`), 'texte dit');
    ecrire(path.join(double, 'media', 'fr', 'video', 'ch01', `${nom}.mp4`), octets(1000));
    ecrire(path.join(double, 'media', 'fr', 'audio', 'ch01', `${nom}.mp3`), octets(400));
  }
  ecrire(path.join(double, 'media', 'fr', 'video', 'ch01', 'fig-b-bis.mp4'), octets(1000));

  // ch01 anglais : UNE seule figure, la ou le francais en a deux (regle 3.4).
  ecrire(path.join(double, 'media', 'en', 'narration', 'ch01', 'fig-a.txt'), 'spoken text');
  ecrire(path.join(double, 'media', 'en', 'video', 'ch01', 'fig-a.mp4'), octets(1000));

  // ch02 : narration sans video — la video manquante se nomme (regle 4.6).
  ecrire(path.join(double, 'media', 'fr', 'narration', 'ch02', 'fig-c.txt'), 'texte dit');
  ecrire(path.join(double, 'media', 'en', 'narration', 'ch02', 'fig-c.txt'), 'spoken text');
  ecrire(path.join(double, 'media', 'en', 'video', 'ch02', 'fig-c.mp4'), octets(1000));

  // ch03 : partage par les chapitres 3a et 3b (regle 2.3).
  for (const nom of ['fig-d', 'fig-e', 'fig-f']) {
    ecrire(path.join(double, 'media', 'fr', 'narration', 'ch03', `${nom}.txt`), 'texte dit');
    ecrire(path.join(double, 'media', 'fr', 'video', 'ch03', `${nom}.mp4`), octets(1000));
  }

  // ═══ essai-simple ════════════════════════════════════════════════════════
  const simple = path.join(racine, 'essai-simple');

  ecrire(
    path.join(simple, 'vol-1', 'fr', 'index.html'),
    // Pas de preface : un ouvrage propre a la maison n'est l'edition de rien
    // et n'a aucune licence amont a citer (regle 1.9).
    pageDeSommaire('Le simple', [
      { adresse: 'pages/chapitre_01.html', titre: 'Chapitre 1' },
      { adresse: 'pages/chapitre_02.html', titre: 'Chapitre 2' },
      { adresse: 'pages/annexe.html', titre: 'Annexe' },
    ]),
  );
  for (const nom of ['chapitre_01', 'chapitre_02', 'annexe']) {
    ecrire(
      path.join(simple, 'vol-1', 'fr', 'pages', `${nom}.html`),
      pageDeChapitre(nom, 'pages', []),
    );
  }
  ecrire(path.join(simple, 'vol-1', 'fr', 'style', 'base.css'), 'body { color: black; }\n');
  ecrire(path.join(simple, 'vol-1', 'couverture', 'fr.png'), octets(600));
  ecrire(path.join(simple, 'vol-1', 'pdf', 'fr', 'simple.pdf'), octets(700));

  // Aucune narration : le comptage se replie sur l'audio (regle 3.1).
  for (const nom of ['vue-1', 'vue-2']) {
    ecrire(path.join(simple, 'media', 'fr', 'audio', 'ch01', `${nom}.mp3`), octets(400));
    ecrire(path.join(simple, 'media', 'fr', 'video', 'ch01', `${nom}.mp4`), octets(1000));
  }
  ecrire(path.join(simple, 'media', 'fr', 'audio', 'ch02', 'vue-3.mp3'), octets(400));

  return {
    racine,
    manifestes: [MANIFESTE_DOUBLE, MANIFESTE_SIMPLE].map((brut, rang) =>
      lireManifeste(brut, `essai-${rang}.json`),
    ),
    demonter: () => fs.rmSync(racine, { recursive: true, force: true }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Les manifestes des deux ouvrages
// ─────────────────────────────────────────────────────────────────────────────

function texteDeVolume(slug: string, titre: string) {
  return { slug, title: titre, tagline: `Accroche de ${titre}`, description: `Description de ${titre}` };
}

export const MANIFESTE_DOUBLE = {
  id: 'essai-double',
  author: 'Une autrice d’essai',
  currency: 'EUR',
  languages: ['fr', 'en'],
  work: {
    fr: { title: 'Le double', edition: '1re edition' },
    en: { title: 'The double' },
  },
  category: {
    slug: 'essais',
    fr: { label: 'Essais', group: 'Lettres' },
    en: { label: 'Essays', group: 'Humanities' },
  },
  settings: {
    freeChapters: 1,
    purchaseScope: 'work',
    extractPdf: false,
    figureVideo: true,
    figureAudio: false,
  },
  sourceWork: { title: 'Un fonds libre', publisher: 'Une institution' },
  volumes: [
    {
      number: 1,
      featured: true,
      price: 3900,
      fr: texteDeVolume('le-double-tome-1', 'Le double, tome premier'),
      en: texteDeVolume('the-double-book-1', 'The double, book one'),
    },
    {
      number: 2,
      featured: false,
      price: 4500,
      fr: texteDeVolume('le-double-tome-2', 'Le double, tome second'),
      en: texteDeVolume('the-double-book-2', 'The double, book two'),
    },
  ],
} as const;

export const MANIFESTE_SIMPLE = {
  id: 'essai-simple',
  currency: 'EUR',
  languages: ['fr'],
  work: { fr: { title: 'Le simple' } },
  category: { slug: 'ia', fr: { label: 'Intelligence artificielle', group: 'Informatique' } },
  // Tous les reglages a l'oppose de l'autre ouvrage (regle 1.7).
  settings: {
    freeChapters: 2,
    purchaseScope: 'edition',
    extractPdf: true,
    figureVideo: false,
    figureAudio: true,
  },
  // Pas de `sourceWork` : l'ouvrage n'est l'edition de rien (regle 1.9).
  volumes: [
    { number: 1, featured: false, price: 2900, fr: texteDeVolume('le-simple', 'Le simple') },
  ],
} as const;
