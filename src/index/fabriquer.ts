/**
 * src/index/fabriquer.ts
 * Zakali Press — fabriquer l'index depuis le quai.
 *
 * Regle 4.3 — ce qui est offert l'est par DEDUCTION, pas par liste.
 * Regle 4.4 — la narration est indexee, pas seulement lue.
 * Regle 4.5 — l'index porte aussi les fiches du catalogue.
 * Regle 4.6 — la fabrication INSPECTE le quai et dit ce qui cloche. Elle ne va
 *             rien chercher : elle regarde ce qui est pose et le nomme. Un
 *             portier qui inspecte la livraison, pas un camion qui va a
 *             l'atelier.
 *
 * Elle tourne SUR LE POSTE, la ou vit le quai. Le site, lui, charge l'artefact
 * et ne lit jamais de disque.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Langue } from '@/i18n/langues';
import {
  VERSION_DE_L_INDEX,
  type ChapitreDeFiche,
  type EntreeDIndex,
  type Fiche,
  type FichierDeFiche,
  type Index,
  type NiveauDAcces,
  type SorteDEntree,
} from '@/index/index';
import { clefDOeuvre, type Manifeste } from '@/ouvrages/manifeste';
import {
  dossierEdition,
  dossierPdf,
  fichierCouverture,
  fichierExtrait,
  fichierExtraitRelie,
  nomDeChapitreMedia,
} from '@/quai/chemins';
import { figuresDeChapitre, fichiersDeMedia } from '@/quai/figures';
import { lireLicence } from '@/quai/licence';
import {
  fichiersAppelesParUnePage,
  fichiersAppelesParUneFeuille,
  liensDeNavigation,
} from '@/quai/page';
import { lireSommaire } from '@/quai/sommaire';

export type Fabrication = { index: Index; rapport: string[] };

/**
 * Le fichier qui porte le texte integral d'un volume.
 *
 * Quarto le depose a la racine de chaque volume pour sa recherche interne. Il
 * n'entre PAS dans l'index : il contient le texte des chapitres reserves, et
 * l'offrir avec le sommaire donnerait le volume entier a qui sait le demander.
 * Ce que l'index ignore n'est servi par aucune adresse (regle 1.8).
 */
const HORS_INDEX = new Set(['search.json']);

// ─────────────────────────────────────────────────────────────────────────────
//  Le chantier
// ─────────────────────────────────────────────────────────────────────────────

class Chantier {
  readonly entrees = new Map<string, EntreeDIndex>();

  /**
   * Les remarques, et combien de fois chacune s'est presentee.
   *
   * Un rapport qui repete cinquante fois la meme phrase ne se lit pas — et un
   * rapport qu'on ne lit pas ne sert a rien. Une remarque identique se compte
   * plutot qu'elle ne se redit.
   */
  private readonly remarques = new Map<string, number>();

  /**
   * `derives` : la racine des fichiers que le site fabrique (regle 6.7), ou
   * `null` si cette fabrication n'en lit aucun.
   */
  constructor(
    readonly racine: string,
    readonly derives: string | null,
  ) {}

  signaler(texte: string): void {
    this.remarques.set(texte, (this.remarques.get(texte) ?? 0) + 1);
  }

  get rapport(): string[] {
    return [...this.remarques].map(([texte, fois]) => (fois === 1 ? texte : `${texte}  (×${fois})`));
  }

  /**
   * Inscrit un fichier a l'index.
   *
   * Un fichier deja inscrit ne se dedouble pas ; s'il revient avec un acces
   * plus large, il l'obtient. Deux chapitres partagent un dossier de medias
   * (regle 2.3) : si l'un est offert, ses figures le sont.
   *
   * De meme, un fichier rencontre d'abord comme ressource puis comme page
   * DEVIENT une page : la sorte decide s'il est relaye ou redirige (regle
   * 8.4), et elle ne doit pas dependre de l'ordre de la lecture.
   */
  inscrire(
    adresse: string,
    fichierAbsolu: string,
    sorte: SorteDEntree,
    acces: NiveauDAcces,
  ): boolean {
    if (!fs.existsSync(fichierAbsolu)) return false;

    const fichier = path.relative(this.racine, fichierAbsolu).split(path.sep).join('/');
    const deja = this.entrees.get(adresse);
    if (deja) {
      if (deja.fichier !== fichier) {
        this.signaler(
          `Collision d’adresse : ${adresse} designe a la fois ${deja.fichier} et ${fichier}.`,
        );
      }
      if (acces === 'offert') deja.acces = 'offert';
      if (sorte === 'page') deja.sorte = 'page';
      return true;
    }
    this.entrees.set(adresse, {
      adresse,
      fichier,
      octets: fs.statSync(fichierAbsolu).size,
      sorte,
      acces,
    });
    return true;
  }

  /** Inscrit un fichier fabrique par le site, relatif a la racine des derives. */
  inscrireUnDerive(
    adresse: string,
    fichierAbsolu: string,
    sorte: SorteDEntree,
    acces: NiveauDAcces,
  ): void {
    this.entrees.set(adresse, {
      adresse,
      fichier: path.relative(this.derives!, fichierAbsolu).split(path.sep).join('/'),
      origine: 'derive',
      octets: fs.statSync(fichierAbsolu).size,
      sorte,
      acces,
    });
  }
}

/** Lit un fichier texte du quai. Rend `null` s'il n'est pas la. */
function lireTexte(chemin: string): string | null {
  return fs.existsSync(chemin) ? fs.readFileSync(chemin, 'utf8') : null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Une edition : un volume, dans une langue
// ─────────────────────────────────────────────────────────────────────────────

function fabriquerEdition(
  chantier: Chantier,
  manifeste: Manifeste,
  numeroDeVolume: number,
  langue: Langue,
): Fiche | null {
  const volume = manifeste.volumes.find((v) => v.numero === numeroDeVolume)!;
  const nom = `Volume ${numeroDeVolume} ${langue}`;
  const dossier = dossierEdition(chantier.racine, manifeste.id, numeroDeVolume, langue);

  // ── Regle 2.4 : une source incomplete est SIGNALEE, jamais fatale ─────────
  if (!fs.existsSync(dossier)) {
    chantier.signaler(`${nom} : le dossier de l’edition manque — edition ignoree.`);
    return null;
  }
  const html = lireTexte(path.join(dossier, 'index.html'));
  if (html === null) {
    chantier.signaler(`${nom} : le sommaire (index.html) manque — edition ignoree.`);
    return null;
  }

  const sommaire = lireSommaire(html);
  for (const ecarte of sommaire.ecartes) chantier.signaler(`${nom} : ${ecarte}`);
  if (sommaire.chapitres.length === 0) {
    chantier.signaler(`${nom} : le sommaire ne porte aucun chapitre — edition ignoree.`);
    return null;
  }

  const clef = clefDOeuvre(manifeste, numeroDeVolume);
  const prefixe = `${clef}/${langue}`;
  const adresseDe = (dansLeVolume: string) => `${prefixe}/${dansLeVolume}`;

  /**
   * Inscrit une page ET ce qu'elle appelle pour s'afficher (regle 4.3), en
   * suivant les feuilles de style d'un cran : une page offerte privee de ses
   * polices s'affiche avec des carres a la place des icones.
   */
  const inscrirePage = (dansLeVolume: string, acces: NiveauDAcces): string | null => {
    const absolu = path.join(dossier, dansLeVolume);
    const contenu = lireTexte(absolu);
    if (contenu === null) {
      chantier.signaler(`${nom} : la page ${dansLeVolume} est annoncee par le sommaire, mais absente.`);
      return null;
    }
    chantier.inscrire(adresseDe(dansLeVolume), absolu, 'page', acces);

    for (const appele of fichiersAppelesParUnePage(dansLeVolume, contenu)) {
      if (HORS_INDEX.has(appele)) continue;
      const cible = path.join(dossier, appele);
      if (!chantier.inscrire(adresseDe(appele), cible, 'ressource', acces)) {
        chantier.signaler(`${nom} : ${dansLeVolume} appelle ${appele}, qui n’est pas sur le quai.`);
        continue;
      }
      if (appele.endsWith('.css')) {
        const feuille = lireTexte(cible);
        if (feuille === null) continue;
        for (const ressource of fichiersAppelesParUneFeuille(appele, feuille)) {
          const fichier = path.join(dossier, ressource);
          if (!chantier.inscrire(adresseDe(ressource), fichier, 'ressource', acces)) {
            chantier.signaler(`${nom} : ${appele} appelle ${ressource}, qui n’est pas sur le quai.`);
          }
        }
      }
    }

    // Le nom de la page n'entre pas dans la remarque : un lien mort est le
    // meme defaut qu'il apparaisse sur une page ou sur les quarante du volume.
    // Le compteur dit combien de pages le portent.
    for (const lien of liensDeNavigation(dansLeVolume, contenu)) {
      if (!fs.existsSync(path.join(dossier, lien))) {
        chantier.signaler(`${nom} : lien mort vers ${lien}.`);
      }
    }
    return adresseDe(dansLeVolume);
  };

  // ── Le sommaire et la preface sont offerts (regle 4.3) ───────────────────
  const adresseDuSommaire = inscrirePage('index.html', 'offert') ?? adresseDe('index.html');

  let licence: string | null = null;
  if (sommaire.preface) {
    inscrirePage(sommaire.preface.adresse, 'offert');
    const texte = lireTexte(path.join(dossier, sommaire.preface.adresse));
    if (texte) licence = lireLicence(texte);
  } else {
    chantier.signaler(`${nom} : pas de preface — aucune mention de licence a lire.`);
  }

  // ── Les chapitres, dans l'ordre du sommaire ──────────────────────────────
  const offerts = manifeste.reglages.chapitresOfferts;
  const chapitres: ChapitreDeFiche[] = [];
  const figuresParDossier = new Map<number, number>();

  sommaire.chapitres.forEach((chapitre, rang) => {
    const acces: NiveauDAcces = rang < offerts ? 'offert' : 'reserve';
    inscrirePage(chapitre.adresse, acces);

    let figures = 0;
    if (chapitre.numero !== null) {
      figures = inscrireLesMedias(chantier, manifeste, langue, chapitre.numero, prefixe, acces, nom);
      // Regle 2.3 : `chapter_31a` et `chapter_31b` sont deux chapitres, mais un
      // seul dossier `ch31`. Compter par chapitre donnerait 150 figures a un
      // volume qui en a 137 — le total se fait donc par DOSSIER.
      figuresParDossier.set(chapitre.numero, figures);
    }

    chapitres.push({
      titre: chapitre.titre,
      adresse: adresseDe(chapitre.adresse),
      numero: chapitre.numero,
      suffixe: chapitre.suffixe,
      offert: acces === 'offert',
      figures,
    });
  });

  const totalDeFigures = [...figuresParDossier.values()].reduce((a, b) => a + b, 0);

  // ── Les PDF : reserves, toujours ─────────────────────────────────────────
  const pdfs: FichierDeFiche[] = [];
  const dossierDesPdf = dossierPdf(chantier.racine, manifeste.id, numeroDeVolume, langue);
  if (fs.existsSync(dossierDesPdf)) {
    const ageDuSommaire = fs.statSync(path.join(dossier, 'index.html')).mtimeMs;
    for (const fichier of fs.readdirSync(dossierDesPdf).sort()) {
      if (!fichier.toLowerCase().endsWith('.pdf')) continue;
      const absolu = path.join(dossierDesPdf, fichier);
      const adresse = `${prefixe}/pdf/${fichier}`;
      chantier.inscrire(adresse, absolu, 'pdf', 'reserve');
      pdfs.push({ adresse, nom: fichier, octets: fs.statSync(absolu).size });
      if (fs.statSync(absolu).mtimeMs < ageDuSommaire) {
        chantier.signaler(
          `${nom} : ${fichier} est plus ancien que le site HTML — le quai est en retard.`,
        );
      }
    }
  } else {
    chantier.signaler(`${nom} : aucun PDF sur le quai.`);
  }

  // ── La couverture : offerte, c'est le catalogue ──────────────────────────
  const couverture = fichierCouverture(chantier.racine, manifeste.id, numeroDeVolume, langue);
  const adresseDeCouverture = `${prefixe}/couverture.png`;
  const aUneCouverture = chantier.inscrire(
    adresseDeCouverture,
    couverture,
    'couverture',
    'offert',
  );
  if (!aUneCouverture) chantier.signaler(`${nom} : la couverture manque.`);

  const textes = volume.textes[langue];
  const extrait = manifeste.reglages.extraitPdf
    ? inscrireLExtrait(chantier, manifeste.id, numeroDeVolume, langue, `${prefixe}/extrait.pdf`, nom, textes.slug)
    : null;
  return {
    clefDOeuvre: clef,
    ouvrage: manifeste.id,
    volume: numeroDeVolume,
    langue,
    slug: textes.slug,
    titre: textes.titre,
    accroche: textes.accroche,
    description: textes.description,
    prix: volume.prix,
    devise: manifeste.devise,
    enAvant: volume.enAvant,
    portee: manifeste.reglages.portee,
    auteur: manifeste.auteur,
    oeuvre: manifeste.oeuvre[langue],
    discipline: {
      slug: manifeste.discipline.slug,
      libelle: manifeste.discipline.libelles[langue].libelle,
      famille: manifeste.discipline.libelles[langue].famille,
    },
    sommaire: adresseDuSommaire,
    couverture: aUneCouverture ? adresseDeCouverture : null,
    licence,
    chapitres,
    figures: totalDeFigures,
    formats: {
      pdf: pdfs.length > 0,
      video: manifeste.reglages.videoDeFigure && totalDeFigures > 0,
      audio: manifeste.reglages.audioDeFigure && totalDeFigures > 0,
    },
    pdfs,
    extrait,
  };
}

/**
 * L'extrait gratuit, quand l'ouvrage en offre un (reglage `extractPdf`).
 *
 * Regle 6.7 — l'extrait LIVRE garde les liens de l'atelier et n'est jamais
 * servi. Seule sa copie RELIEE, fabriquee par `npm run extraits`, entre dans
 * l'index. Chaque etape manquante se nomme dans le rapport, et l'extrait reste
 * alors hors de l'index : mieux vaut pas d'extrait qu'un extrait aux liens
 * morts.
 */
function inscrireLExtrait(
  chantier: Chantier,
  ouvrage: string,
  numeroDeVolume: number,
  langue: Langue,
  adresse: string,
  nom: string,
  slug: string,
): FichierDeFiche | null {
  const livre = fichierExtrait(chantier.racine, ouvrage, numeroDeVolume, langue);
  if (!fs.existsSync(livre)) {
    chantier.signaler(`${nom} : l’ouvrage offre un extrait PDF, mais il n’est pas livre.`);
    return null;
  }
  const relie = chantier.derives && fichierExtraitRelie(chantier.derives, ouvrage, numeroDeVolume, langue);
  if (!relie || !fs.existsSync(relie)) {
    chantier.signaler(`${nom} : l’extrait est livre mais pas relie — lancer npm run extraits.`);
    return null;
  }
  if (fs.statSync(relie).mtimeMs < fs.statSync(livre).mtimeMs) {
    chantier.signaler(`${nom} : l’extrait relie est plus ancien que sa livraison — relancer npm run extraits.`);
    return null;
  }
  chantier.inscrireUnDerive(adresse, relie, 'extrait', 'offert');
  return { adresse, nom: `${slug}-extrait.pdf`, octets: fs.statSync(relie).size };
}

/**
 * Les medias d'un chapitre, au meme niveau d'acces que lui (regle 4.4).
 *
 * La NARRATION fait foi : elle donne la liste des figures, et rien d'autre ne
 * la donne (regles 3.1 et 3.2). Une video dont le nom de base n'est pas dans
 * cette liste n'est PAS indexee — c'est ce qui ramene les 385 fichiers video de
 * Biology aux 383 figures reelles, sans qu'aucun doublon ait a etre reconnu.
 *
 * Rend le nombre de figures du chapitre.
 */
function inscrireLesMedias(
  chantier: Chantier,
  manifeste: Manifeste,
  langue: Langue,
  numeroDeChapitre: number,
  prefixe: string,
  acces: NiveauDAcces,
  nom: string,
): number {
  const figures = figuresDeChapitre(chantier.racine, manifeste.id, langue, numeroDeChapitre);
  const chapitre = nomDeChapitreMedia(numeroDeChapitre);
  if (figures.reference === 'aucune') return 0;
  if (figures.reference === 'audio') {
    chantier.signaler(
      `${nom} : ${chapitre} n’a pas de narration — les figures sont comptees sur l’audio.`,
    );
  }

  const sortes: { sorte: 'narration' | 'video' | 'audio'; servie: boolean }[] = [
    // La narration entre TOUJOURS dans l'index : c'est elle qui enumere les
    // figures. Un serveur qui ne l'aurait pas n'afficherait aucune video, meme
    // en ayant les fichiers (regle 4.4).
    { sorte: 'narration', servie: true },
    { sorte: 'video', servie: manifeste.reglages.videoDeFigure },
    { sorte: 'audio', servie: manifeste.reglages.audioDeFigure },
  ];

  for (const { sorte, servie } of sortes) {
    // Regle 1.8 : un reglage n'efface rien sur le quai — il empeche l'index de
    // connaitre les fichiers. Remettre le reglage a `true` les remet en ligne.
    if (!servie) continue;
    const poses = fichiersDeMedia(chantier.racine, manifeste.id, langue, sorte, numeroDeChapitre);
    for (const base of figures.noms) {
      const fichier = poses.get(base);
      if (!fichier) {
        if (sorte !== 'audio') {
          chantier.signaler(`${nom} : ${chapitre} — la ${sorte} de « ${base} » manque.`);
        }
        continue;
      }
      chantier.inscrire(
        `${prefixe}/media/${sorte}/${chapitre}/${fichier}`,
        path.join(
          chantier.racine,
          manifeste.id,
          'media',
          langue,
          sorte,
          chapitre,
          fichier,
        ),
        sorte,
        acces,
      );
    }
  }
  return figures.noms.length;
}

// ─────────────────────────────────────────────────────────────────────────────
//  L'ouvrage entier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regle 3.4 — un ecart entre les langues est SIGNALE, pas corrige. C'est
 * presque toujours un defaut de rendu en amont ; le corriger en silence
 * masquerait le vrai probleme.
 */
function comparerLesLangues(chantier: Chantier, fiches: Fiche[], numeroDeVolume: number): void {
  const parLangue = fiches.filter((f) => f.volume === numeroDeVolume);
  if (parLangue.length < 2) return;

  for (const mesure of ['chapitres', 'figures'] as const) {
    const valeurs = parLangue.map((f) => ({
      langue: f.langue,
      valeur: mesure === 'chapitres' ? f.chapitres.length : f.figures,
    }));
    const distinctes = new Set(valeurs.map((v) => v.valeur));
    if (distinctes.size === 1) continue;
    chantier.signaler(
      `Volume ${numeroDeVolume} : ${mesure} — ` +
        valeurs.map((v) => `${v.valeur} en ${v.langue}`).join(', ') +
        '. Les editions ne s’accordent pas.',
    );
  }
}

/** Deux couvertures identiques au bit pres montreraient deux fois la meme fiche. */
function comparerLesCouvertures(chantier: Chantier, manifeste: Manifeste): void {
  const empreintes = new Map<string, string[]>();
  for (const volume of manifeste.volumes) {
    for (const langue of manifeste.langues) {
      const fichier = fichierCouverture(chantier.racine, manifeste.id, volume.numero, langue);
      if (!fs.existsSync(fichier)) continue;
      const empreinte = createHash('sha256').update(fs.readFileSync(fichier)).digest('hex');
      const deja = empreintes.get(empreinte) ?? [];
      deja.push(`vol-${volume.numero}/${langue}`);
      empreintes.set(empreinte, deja);
    }
  }
  for (const partagee of empreintes.values()) {
    const volumes = new Set(partagee.map((e) => e.split('/')[0]));
    if (volumes.size > 1) {
      chantier.signaler(
        `${manifeste.id} : une seule et meme image sert de couverture a ${partagee.join(', ')}.`,
      );
    }
  }
}

/**
 * Fabrique l'index de tous les ouvrages declares.
 *
 * `maintenant` est passe de l'exterieur : un artefact versionne ne doit pas
 * changer parce qu'on le refabrique deux fois de suite dans un test.
 *
 * `derives` est la racine des fichiers fabriques par le site (regle 6.7). Sans
 * elle, aucun extrait n'est indexe — et le rapport le dit.
 */
export function fabriquerIndex(
  racine: string,
  manifestes: Manifeste[],
  maintenant: string,
  derives: string | null = null,
): Fabrication {
  const chantier = new Chantier(racine, derives);
  const fiches: Fiche[] = [];

  for (const manifeste of manifestes) {
    if (!fs.existsSync(path.join(racine, manifeste.id))) {
      chantier.signaler(`${manifeste.id} : rien sous ce nom sur le quai — ouvrage ignore.`);
      continue;
    }
    const duManifeste: Fiche[] = [];
    for (const volume of manifeste.volumes) {
      for (const langue of manifeste.langues) {
        const fiche = fabriquerEdition(chantier, manifeste, volume.numero, langue);
        if (fiche) duManifeste.push(fiche);
      }
      comparerLesLangues(chantier, duManifeste, volume.numero);
    }
    comparerLesCouvertures(chantier, manifeste);
    fiches.push(...duManifeste);
  }

  return {
    index: {
      version: VERSION_DE_L_INDEX,
      fabriqueLe: maintenant,
      fiches,
      entrees: [...chantier.entrees.values()].sort((a, b) => a.adresse.localeCompare(b.adresse)),
    },
    rapport: chantier.rapport,
  };
}
