/**
 * outils/normaliser-quai.ts
 * Zakali Press — amener un quai de livraison a la forme de la regle 1.2.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  OUTIL A USAGE UNIQUE. IL EST DESTINE A ETRE SUPPRIME.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le jour ou l'atelier depose directement en forme canonique, ce fichier n'a
 * plus de raison d'etre et s'efface. Rien du site ne l'importe : le verifier
 * revient a le lancer, et il ne dit rien s'il n'a rien a faire.
 *
 * CE QU'IL EST, ET CE QU'IL N'EST PAS
 *
 * Il n'entre pas dans l'atelier et n'en connait aucun chemin (regle 1.1) : il
 * ouvre le quai, regarde ce qui y est pose, et le range. Il ne descend jamais
 * DANS un volume (regle 1.2 bis) — les pages d'un volume s'appellent en
 * relatif, et deplacer quoi que ce soit sous `<volume>/<langue>/` casserait
 * ces liens. La seule exception est la couverture, qui est COPIEE et non
 * deplacee, justement pour que l'original reste ou la page l'appelle.
 *
 * CE QU'IL SAIT DE LA FORME ACTUELLE
 *
 * Un outil de transition connait forcement la forme d'ou il part. La voici,
 * en toutes lettres, pour qu'on sache quoi relire le jour ou elle change :
 *
 *   html/<nom>-Volume-<ROMAIN>/       le volume anglais
 *   html/<nom>-Volume-<ROMAIN>-FR/    le meme, en francais
 *   html/<nom>-Volume-<ROMAIN>-ES/    le meme, en espagnol
 *   media/{En,Fr,Es}/<sorte>/chNN/    langue capitalisee
 *   <nom>-Volume-<ROMAIN>[-FR|-ES][-suffixe].pdf   a la racine
 *
 * L'absence de suffixe de langue vaut anglais : c'est la langue d'origine de
 * la chaine de production, les traductions seules etant marquees.
 *
 * SES GARANTIES
 *
 *   — blanc par defaut : sans `--appliquer`, il dit ce qu'il ferait ;
 *   — il DEPLACE, il ne copie pas : meme volume physique, donc instantane, et
 *     aucun gigaoctet duplique. Seules les couvertures sont copiees ;
 *   — il n'ecrase jamais une destination existante : il s'arrete ;
 *   — il est rejouable : sur un quai deja canonique, son plan est vide ;
 *   — ce qu'il ne sait pas classer, il le NOMME et n'y touche pas.
 *
 * Usage :
 *   npm run quai:normaliser                    -- blanc, sur tous les ouvrages
 *   npm run quai:normaliser -- Biology         -- blanc, sur un ouvrage
 *   npm run quai:normaliser -- Biology --appliquer
 */

import fs from 'node:fs';
import path from 'node:path';

import { CODES, type Langue } from '@/i18n/langues';
import { nomDeVolume, racineDuQuai } from '@/quai/chemins';

// ─────────────────────────────────────────────────────────────────────────────
//  Le plan
// ─────────────────────────────────────────────────────────────────────────────

type Geste =
  | { sorte: 'deplacer'; de: string; vers: string; pourquoi: string }
  | { sorte: 'copier'; de: string; vers: string; pourquoi: string }
  | { sorte: 'supprimer-dossier-vide'; de: string; pourquoi: string };

type Plan = {
  ouvrage: string;
  gestes: Geste[];
  /** Ce que l'outil a vu sans savoir le classer. Il n'y touche pas. */
  laisses: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
//  Lecture de la forme actuelle
// ─────────────────────────────────────────────────────────────────────────────

const ROMAINS: Record<string, number> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

/** `III` → 3. Rend `null` si ce n'est pas un nombre romain. */
function depuisRomain(mot: string): number | null {
  if (!/^[IVXLCDM]+$/.test(mot)) return null;
  let total = 0;
  for (let i = 0; i < mot.length; i += 1) {
    const valeur = ROMAINS[mot[i]];
    const suivante = i + 1 < mot.length ? ROMAINS[mot[i + 1]] : 0;
    total += valeur < suivante ? -valeur : valeur;
  }
  return total;
}

/**
 * `Biology-2e-Volume-III-FR` → `{ volume: 3, langue: 'fr' }`.
 *
 * Le suffixe de langue est cherche en fin de nom, et son absence vaut anglais.
 */
function lireVolumeEtLangue(nom: string): { volume: number; langue: Langue } | null {
  const suffixe = /-(FR|ES)$/i.exec(nom);
  const langue = (suffixe ? suffixe[1].toLowerCase() : 'en') as Langue;
  if (!CODES.includes(langue)) return null;

  const sansSuffixe = suffixe ? nom.slice(0, -suffixe[0].length) : nom;
  const marque = /-Volume-([IVXLCDM]+)$/i.exec(sansSuffixe);
  if (!marque) return null;

  const volume = depuisRomain(marque[1].toUpperCase());
  return volume === null ? null : { volume, langue };
}

/**
 * `Biology-2e-Volume-I-ES-Curso.pdf` → `{ volume: 1, langue: 'es' }`.
 *
 * Le PDF porte un suffixe de variante — `Cours`, `Exercices`, `Curso` — qui ne
 * nous interesse pas : le rangement n'a besoin que du volume et de la langue.
 * Le nom du fichier, lui, est conserve tel quel.
 */
function lirePdf(nom: string): { volume: number; langue: Langue } | null {
  const marque = /-Volume-([IVXLCDM]+)(?=-|\.)/i.exec(nom);
  if (!marque) return null;
  const volume = depuisRomain(marque[1].toUpperCase());
  if (volume === null) return null;

  const apres = nom.slice(marque.index + marque[0].length);
  const suffixe = /^-(FR|ES)(?=-|\.)/i.exec(apres);
  const langue = (suffixe ? suffixe[1].toLowerCase() : 'en') as Langue;
  return CODES.includes(langue) ? { volume, langue } : null;
}

function estDossier(chemin: string): boolean {
  return fs.existsSync(chemin) && fs.statSync(chemin).isDirectory();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Construction du plan
// ─────────────────────────────────────────────────────────────────────────────

function planifier(racine: string, ouvrage: string): Plan {
  const base = path.join(racine, ouvrage);
  const gestes: Geste[] = [];
  const laisses: string[] = [];

  // ── Les volumes : html/<nom>-Volume-<ROMAIN>[-XX] → vol-<n>/<langue> ──────
  //
  // La source de la couverture est relevee ici, sur le dossier d'origine : le
  // plan doit pouvoir s'afficher sans que rien n'ait encore bouge.
  const html = path.join(base, 'html');
  if (estDossier(html)) {
    for (const entree of fs.readdirSync(html, { withFileTypes: true })) {
      const de = path.join(html, entree.name);
      if (!entree.isDirectory()) {
        laisses.push(`${path.relative(racine, de)} — fichier a la racine de html/`);
        continue;
      }
      const lu = lireVolumeEtLangue(entree.name);
      if (!lu) {
        laisses.push(`${path.relative(racine, de)} — ni volume ni langue reconnus`);
        continue;
      }
      const vers = path.join(base, nomDeVolume(lu.volume), lu.langue);
      gestes.push({
        sorte: 'deplacer',
        de,
        vers,
        pourquoi: `volume ${lu.volume}, ${lu.langue}`,
      });
      // La couverture se lit dans le volume tel qu'il est POSE aujourd'hui, mais
      // se copiera depuis le volume tel qu'il sera DEPLACE : le geste ci-dessus
      // s'execute avant, et un chemin d'origine serait perime a ce moment-la.
      planifierCouverture(racine, de, vers, lu.volume, lu.langue, gestes, laisses);
    }
    gestes.push({
      sorte: 'supprimer-dossier-vide',
      de: html,
      pourquoi: 'la forme canonique n’a pas de dossier html/',
    });
  }

  // ── Les volumes deja canoniques ──────────────────────────────────────────
  //
  // Un quai peut etre a moitie range — deuxieme passage, ou execution
  // interrompue. Les volumes deja en place sont relus ici, pour que ce qui
  // leur manque encore soit fait : c'est ce qui rend l'outil rejouable.
  for (const entree of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entree.isDirectory() || !/^vol-\d+$/.test(entree.name)) continue;
    const volume = Number(entree.name.slice('vol-'.length));
    for (const langue of CODES) {
      const dossier = path.join(base, entree.name, langue);
      if (!estDossier(dossier)) continue;
      planifierCouverture(racine, dossier, dossier, volume, langue, gestes, laisses);
    }
  }

  // ── Les medias : media/En → media/en ─────────────────────────────────────
  const media = path.join(base, 'media');
  if (estDossier(media)) {
    for (const entree of fs.readdirSync(media, { withFileTypes: true })) {
      if (!entree.isDirectory()) continue;
      const minuscule = entree.name.toLowerCase();
      if (entree.name === minuscule) continue;
      if (!CODES.includes(minuscule as Langue)) {
        laisses.push(`${path.relative(racine, path.join(media, entree.name))} — langue inconnue`);
        continue;
      }
      gestes.push({
        sorte: 'deplacer',
        de: path.join(media, entree.name),
        vers: path.join(media, minuscule),
        pourquoi: 'les dossiers du quai sont en minuscules (regle 2.1)',
      });
    }
  }

  // ── Les PDF : <nom>-Volume-<ROMAIN>[-XX]*.pdf → vol-<n>/pdf/<langue>/ ─────
  for (const entree of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entree.isFile()) continue;
    const de = path.join(base, entree.name);
    if (!entree.name.toLowerCase().endsWith('.pdf')) {
      laisses.push(`${path.relative(racine, de)} — n’est pas un PDF`);
      continue;
    }
    const lu = lirePdf(entree.name);
    if (!lu) {
      laisses.push(`${path.relative(racine, de)} — aucun volume lisible dans le nom`);
      continue;
    }
    gestes.push({
      sorte: 'deplacer',
      de,
      vers: path.join(base, nomDeVolume(lu.volume), 'pdf', lu.langue, entree.name),
      pourquoi: `volume ${lu.volume}, ${lu.langue}`,
    });
  }

  return { ouvrage, gestes, laisses };
}

/**
 * La couverture est COPIEE hors du volume, jamais deplacee.
 *
 * `index.html` l'appelle en relatif, `covers/…png`. La sortir casserait la
 * page ; l'y laisser priverait le catalogue d'un emplacement fixe. On la
 * duplique donc — quelques centaines de kilo-octets, la seule copie de tout
 * l'outil.
 */
function planifierCouverture(
  racine: string,
  dossierActuel: string,
  dossierCanonique: string,
  volume: number,
  langue: Langue,
  gestes: Geste[],
  laisses: string[],
): void {
  const vers = path.join(path.dirname(dossierCanonique), 'couverture', `${langue}.png`);
  if (fs.existsSync(vers)) return;

  const covers = path.join(dossierActuel, 'covers');
  if (!estDossier(covers)) {
    laisses.push(`${path.relative(racine, dossierActuel)} — aucune couverture trouvee`);
    return;
  }
  const images = fs.readdirSync(covers).filter((n) => n.toLowerCase().endsWith('.png'));
  if (images.length !== 1) {
    laisses.push(
      `${path.relative(racine, covers)} — ${images.length} images, il en faut une seule`,
    );
    return;
  }
  gestes.push({
    sorte: 'copier',
    // Le dossier CANONIQUE : quand ce geste s'executera, le volume y sera deja.
    de: path.join(dossierCanonique, 'covers', images[0]),
    vers,
    pourquoi: `couverture du volume ${volume}, ${langue} — l’original reste ou la page l’appelle`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renomme, y compris quand seule la casse change.
 *
 * `media/En` → `media/en` designe le meme dossier pour Windows : le passage
 * par un nom intermediaire est ce qui rend le renommage reel des deux cotes.
 */
function deplacer(de: string, vers: string): void {
  fs.mkdirSync(path.dirname(vers), { recursive: true });
  if (de.toLowerCase() === vers.toLowerCase() && de !== vers) {
    const etape = `${vers}.normalisation-en-cours`;
    fs.renameSync(de, etape);
    fs.renameSync(etape, vers);
    return;
  }
  fs.renameSync(de, vers);
}

function appliquer(plan: Plan): void {
  for (const geste of plan.gestes) {
    if (geste.sorte === 'supprimer-dossier-vide') {
      if (estDossier(geste.de) && fs.readdirSync(geste.de).length === 0) fs.rmdirSync(geste.de);
      continue;
    }
    if (!fs.existsSync(geste.de)) {
      throw new Error(`La source a disparu depuis le plan : ${geste.de}`);
    }
    // Un renommage de casse pure — `media/En` vers `media/en` — designe la MEME
    // entree sur un systeme de fichiers insensible a la casse : la destination
    // « existe » forcement, et ce n'est pas un ecrasement.
    const casseSeule = geste.de !== geste.vers && geste.de.toLowerCase() === geste.vers.toLowerCase();
    if (!casseSeule && fs.existsSync(geste.vers)) {
      throw new Error(
        `La destination existe deja : ${geste.vers}. L’outil n’ecrase rien — arret.`,
      );
    }
    if (geste.sorte === 'copier') {
      fs.mkdirSync(path.dirname(geste.vers), { recursive: true });
      fs.copyFileSync(geste.de, geste.vers);
    } else {
      deplacer(geste.de, geste.vers);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Le programme
// ─────────────────────────────────────────────────────────────────────────────

function principal(): void {
  const arguments_ = process.argv.slice(2);
  const enVrai = arguments_.includes('--appliquer');
  const demandes = arguments_.filter((a) => !a.startsWith('--'));

  const racine = racineDuQuai();
  if (!estDossier(racine)) throw new Error(`Le quai est introuvable : ${racine}`);

  const ouvrages =
    demandes.length > 0
      ? demandes
      : fs
          .readdirSync(racine, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);

  console.log(`Quai : ${racine}`);
  console.log(enVrai ? 'Mode : APPLIQUE\n' : 'Mode : blanc — rien ne sera touche\n');

  let total = 0;
  for (const ouvrage of ouvrages) {
    if (!estDossier(path.join(racine, ouvrage))) {
      throw new Error(`Ouvrage introuvable sur le quai : ${ouvrage}`);
    }
    const plan = planifier(racine, ouvrage);
    total += plan.gestes.length;

    console.log(`── ${ouvrage} ${'─'.repeat(Math.max(0, 68 - ouvrage.length))}`);
    if (plan.gestes.length === 0) {
      console.log('   deja en forme canonique (regle 1.2)');
    }
    for (const geste of plan.gestes) {
      const de = path.relative(racine, geste.de);
      if (geste.sorte === 'supprimer-dossier-vide') {
        console.log(`   supprimer si vide  ${de}`);
        continue;
      }
      const verbe = geste.sorte === 'copier' ? 'copier   ' : 'deplacer ';
      console.log(`   ${verbe}  ${de}`);
      console.log(`         ->  ${path.relative(racine, geste.vers)}   (${geste.pourquoi})`);
    }
    for (const laisse of plan.laisses) {
      console.log(`   LAISSE EN PLACE    ${laisse}`);
    }
    console.log('');

    if (enVrai) appliquer(plan);
  }

  if (!enVrai && total > 0) {
    console.log(`${total} gestes. Relancer avec --appliquer pour les executer.`);
  }
}

process.loadEnvFile();
principal();
