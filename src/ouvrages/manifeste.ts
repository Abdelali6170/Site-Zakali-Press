/**
 * src/ouvrages/manifeste.ts
 * Zakali Press — le manifeste d'un ouvrage : ce que le quai ne dit pas.
 *
 * Regle 1.3 — le manifeste vit avec le code, pas avec les ouvrages.
 * Regle 1.4 — un manifeste douteux est FATAL, jamais devine.
 * Regle 1.9 — rien de ce qui se lit n'est obligatoire.
 *
 * ── Pourquoi les clefs du fichier JSON sont en anglais ─────────────────────
 *
 * Le code de ce depot est en francais. Le manifeste, lui, n'est pas du code :
 * c'est un contrat de donnees, ecrit noir sur blanc dans `docs/REGLES.md` aux
 * regles 1.6 et 1.7, avec ses noms de champs. Le changer ici ferait mentir la
 * specification. Ce fichier est donc la couture : il lit l'anglais du contrat
 * et rend du francais au reste du site.
 */

import { z } from 'zod';

import { CODES, estLangue, type Langue } from '@/i18n/langues';

// ─────────────────────────────────────────────────────────────────────────────
//  Ce que le site manipule
// ─────────────────────────────────────────────────────────────────────────────

/** Les deux facons de vendre un volume (regle 1.7). */
export const PORTEES = ['work', 'edition'] as const;
export type Portee = (typeof PORTEES)[number];

/** Ce qui varie d'un ouvrage a l'autre — un reglage, jamais du code (regle 1.7). */
export type Reglages = {
  /** Combien de chapitres sont offerts a la lecture, au debut de chaque volume. */
  chapitresOfferts: number;
  /** `work` : un achat ouvre toutes les langues du volume. `edition` : une seule. */
  portee: Portee;
  /** Un extrait PDF est-il offert au telechargement. */
  extraitPdf: boolean;
  /** Les sequences video des figures sont-elles servies. */
  videoDeFigure: boolean;
  /** Les pistes audio par figure le sont-elles. */
  audioDeFigure: boolean;
};

/** Les reglages par defaut, tels que la regle 1.7 les fixe. */
export const REGLAGES_PAR_DEFAUT: Reglages = {
  chapitresOfferts: 1,
  portee: 'work',
  extraitPdf: false,
  videoDeFigure: true,
  audioDeFigure: false,
};

/** Le libelle d'une discipline dans une langue, et sa famille de rangement. */
export type LibelleDeDiscipline = { libelle: string; famille: string };

/** Ce que le manifeste declare d'un volume, dans une langue. */
export type TexteDeVolume = {
  /** L'identifiant d'adresse : ce qui apparait dans `/fr/lire/<slug>` (regle 5.6). */
  slug: string;
  titre: string;
  /** Une phrase, pour la vignette du catalogue. */
  accroche: string;
  /** Le texte long de la fiche. */
  description: string;
};

export type Volume = {
  numero: number;
  /** Mise en avant sur l'accueil. */
  enAvant: boolean;
  /** En centimes. Formate a l'affichage, jamais avant (regle 8.2). */
  prix: number;
  textes: Record<Langue, TexteDeVolume>;
};

/** L'ouvrage amont, quand il y en a un. Facultatif (regle 1.9). */
export type OeuvreSource = {
  titre: string;
  editeur?: string;
  adresse?: string;
};

export type Manifeste = {
  /**
   * L'identifiant de l'ouvrage — et son dossier sur le quai, au caractere pres.
   *
   * Le manifeste ne porte AUCUN chemin (regle 1.2). Faire porter le nom du
   * dossier par l'identifiant est ce qui evite d'en introduire un : sans cela,
   * un champ « dossier » rouvrirait la porte aux gabarits de chemin.
   */
  id: string;
  auteur?: string;
  devise: string;
  /** Les langues que CET ouvrage sert — un sous-ensemble de celles du site. */
  langues: Langue[];
  /** Le titre de l'oeuvre entiere, au-dessus des volumes. */
  oeuvre: Record<Langue, { titre: string; edition?: string }>;
  discipline: { slug: string; libelles: Record<Langue, LibelleDeDiscipline> };
  reglages: Reglages;
  oeuvreSource?: OeuvreSource;
  volumes: Volume[];
};

// ─────────────────────────────────────────────────────────────────────────────
//  Le contrat, tel que la regle 1.6 l'ecrit
// ─────────────────────────────────────────────────────────────────────────────

const texteNonVide = z.string().trim().min(1, 'ne doit pas etre vide');

const FORME = z.object({
  id: texteNonVide.regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'ne peut porter que des minuscules, des chiffres et des traits d’union : ' +
      'c’est aussi le nom du dossier sur le quai',
  ),
  author: texteNonVide.optional(),
  currency: texteNonVide.default('EUR'),
  languages: z.array(z.string()).min(1, 'un ouvrage sert au moins une langue'),

  work: z.record(
    z.string(),
    z.object({ title: texteNonVide, edition: texteNonVide.optional() }),
  ),

  category: z.object({ slug: texteNonVide }).catchall(
    z.union([
      z.string(),
      z.object({ label: texteNonVide, group: texteNonVide }),
    ]),
  ),

  settings: z
    .object({
      freeChapters: z.number().int().min(0),
      purchaseScope: z.string(),
      extractPdf: z.boolean(),
      figureVideo: z.boolean(),
      figureAudio: z.boolean(),
    })
    .partial()
    .default({}),

  sourceWork: z
    .object({
      title: texteNonVide,
      publisher: texteNonVide.optional(),
      url: texteNonVide.optional(),
    })
    .optional(),

  volumes: z
    .array(
      z.object({
        number: z.number().int().positive(),
        featured: z.boolean().default(false),
        price: z.number().int().nonnegative(),
      }).catchall(
        z.union([
          z.number(),
          z.boolean(),
          z.object({
            slug: texteNonVide,
            title: texteNonVide,
            tagline: texteNonVide,
            description: texteNonVide,
          }),
        ]),
      ),
    )
    .min(1, 'un ouvrage a au moins un volume'),
});

// ─────────────────────────────────────────────────────────────────────────────
//  La lecture, et son refus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * L'anomalie est fatale, et elle NOMME le champ (regle 1.4).
 *
 * Toutes les anomalies sont relevees avant d'echouer, pas seulement la
 * premiere : corriger un manifeste douteux une ligne a la fois, en relancant
 * l'import a chaque fois, est le genre de boucle qu'on abandonne en route.
 */
export class ManifesteDouteux extends Error {
  constructor(
    readonly source: string,
    readonly anomalies: string[],
  ) {
    super(
      `Manifeste douteux — ${source}\n` + anomalies.map((a) => `  · ${a}`).join('\n'),
    );
    this.name = 'ManifesteDouteux';
  }
}

function cheminDuChamp(chemin: readonly PropertyKey[]): string {
  return chemin.reduce<string>((accumule, morceau) => {
    if (typeof morceau === 'number') return `${accumule}[${morceau}]`;
    return accumule ? `${accumule}.${String(morceau)}` : String(morceau);
  }, '');
}

/**
 * Lit un manifeste deja analyse depuis JSON, et le refuse s'il est douteux.
 *
 * `source` ne sert qu'au message : le nom du fichier, pour qu'on sache lequel
 * relire.
 */
export function lireManifeste(brut: unknown, source: string): Manifeste {
  const analyse = FORME.safeParse(brut);
  if (!analyse.success) {
    throw new ManifesteDouteux(
      source,
      analyse.error.issues.map((souci) => {
        const champ = cheminDuChamp(souci.path);
        return champ ? `${champ} : ${souci.message}` : souci.message;
      }),
    );
  }

  const donnees = analyse.data;
  const anomalies: string[] = [];

  // ── Les langues ────────────────────────────────────────────────────────────
  //
  // Une langue que le site ne sert pas est fatale : le manifeste promettrait
  // une edition dont aucune adresse n'existe.
  const langues: Langue[] = [];
  donnees.languages.forEach((declaree, rang) => {
    if (!estLangue(declaree)) {
      anomalies.push(
        `languages[${rang}] : langue inconnue du site — « ${declaree} ». ` +
          `Le site sert ${CODES.join(', ')}.`,
      );
      return;
    }
    if (langues.includes(declaree)) {
      anomalies.push(`languages[${rang}] : langue declaree deux fois — « ${declaree} ».`);
      return;
    }
    langues.push(declaree);
  });

  // ── La portee de vente ─────────────────────────────────────────────────────
  //
  // Une portee inventee ferait vendre l'ouvrage autrement que ce que sa
  // description promet : c'est l'exemple meme de la regle 1.4.
  const porteeDeclaree = donnees.settings.purchaseScope;
  if (porteeDeclaree !== undefined && !PORTEES.includes(porteeDeclaree as Portee)) {
    anomalies.push(
      `settings.purchaseScope : portee de vente inconnue — « ${porteeDeclaree} ». ` +
        `Les portees sont ${PORTEES.join(', ')}.`,
    );
  }

  const reglages: Reglages = {
    chapitresOfferts: donnees.settings.freeChapters ?? REGLAGES_PAR_DEFAUT.chapitresOfferts,
    portee: (PORTEES.includes(porteeDeclaree as Portee)
      ? porteeDeclaree
      : REGLAGES_PAR_DEFAUT.portee) as Portee,
    extraitPdf: donnees.settings.extractPdf ?? REGLAGES_PAR_DEFAUT.extraitPdf,
    videoDeFigure: donnees.settings.figureVideo ?? REGLAGES_PAR_DEFAUT.videoDeFigure,
    audioDeFigure: donnees.settings.figureAudio ?? REGLAGES_PAR_DEFAUT.audioDeFigure,
  };

  // ── Le titre de l'oeuvre, et la discipline, dans chaque langue declaree ────
  const oeuvre = {} as Record<Langue, { titre: string; edition?: string }>;
  const libelles = {} as Record<Langue, LibelleDeDiscipline>;
  for (const langue of langues) {
    const titre = donnees.work[langue];
    if (!titre) anomalies.push(`work.${langue} : champ manquant.`);
    else oeuvre[langue] = { titre: titre.title, edition: titre.edition };

    const libelle = donnees.category[langue];
    if (libelle === undefined || typeof libelle === 'string') {
      anomalies.push(`category.${langue} : champ manquant — il faut { label, group }.`);
    } else {
      libelles[langue] = { libelle: libelle.label, famille: libelle.group };
    }
  }

  // ── Les volumes ────────────────────────────────────────────────────────────
  const numerosVus = new Set<number>();
  const slugsVus = new Map<string, string>();
  const volumes: Volume[] = [];

  donnees.volumes.forEach((brutVolume, rang) => {
    const numero = brutVolume.number;
    if (numerosVus.has(numero)) {
      anomalies.push(`volumes[${rang}].number : numero de volume declare deux fois — ${numero}.`);
    }
    numerosVus.add(numero);

    const textes = {} as Record<Langue, TexteDeVolume>;
    for (const langue of langues) {
      const texte = brutVolume[langue];
      if (texte === undefined || typeof texte !== 'object') {
        anomalies.push(`volumes[${rang}].${langue} : champ manquant.`);
        continue;
      }
      // Un slug partage par deux volumes rendrait une des deux fiches
      // inatteignable, sans que rien ne le dise.
      const clef = `${langue}/${texte.slug}`;
      const deja = slugsVus.get(clef);
      if (deja) {
        anomalies.push(
          `volumes[${rang}].${langue}.slug : identifiant d'adresse deja pris par ${deja} — ` +
            `« ${texte.slug} ».`,
        );
      }
      slugsVus.set(clef, `volumes[${rang}]`);
      textes[langue] = {
        slug: texte.slug,
        titre: texte.title,
        accroche: texte.tagline,
        description: texte.description,
      };
    }

    volumes.push({
      numero,
      enAvant: brutVolume.featured === true,
      prix: brutVolume.price,
      textes,
    });
  });

  if (anomalies.length > 0) throw new ManifesteDouteux(source, anomalies);

  return {
    id: donnees.id,
    auteur: donnees.author,
    devise: donnees.currency,
    langues,
    oeuvre,
    discipline: { slug: donnees.category.slug, libelles },
    reglages,
    oeuvreSource: donnees.sourceWork && {
      titre: donnees.sourceWork.title,
      editeur: donnees.sourceWork.publisher,
      adresse: donnees.sourceWork.url,
    },
    volumes: volumes.sort((a, b) => a.numero - b.numero),
  };
}

/**
 * La clef d'oeuvre : ce qui relie les editions linguistiques d'un volume
 * (regle 1.5).
 *
 * Un ouvrage MONO-VOLUME n'ecope d'aucun suffixe : sa clef est son
 * identifiant. Le livre sur Claude Code trainerait sinon un `-vol-1` parasite
 * dans ses adresses pour toujours.
 */
export function clefDOeuvre(manifeste: Manifeste, numeroDeVolume: number): string {
  return manifeste.volumes.length === 1
    ? manifeste.id
    : `${manifeste.id}-vol-${numeroDeVolume}`;
}
