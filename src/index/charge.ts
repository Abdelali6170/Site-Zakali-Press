/**
 * src/index/charge.ts
 * Zakali Press — l'index du site, charge une fois.
 *
 * Regle 4.1 — le site ne regarde jamais le quai pour savoir ce qui existe : il
 * charge l'artefact versionne `donnees/index.json`, fabrique sur le poste par
 * `npm run index`. La lecture a lieu au premier appel, puis la table reste en
 * memoire.
 *
 * Le fichier est lu, et non importe : importe, ce JSON d'un mega-octet serait
 * type champ par champ par le compilateur, a chaque verification.
 */

import fs from 'node:fs';
import path from 'node:path';

import { chargerIndex, type Index, type IndexCharge } from '@/index/index';

const FICHIER = path.join(process.cwd(), 'donnees', 'index.json');

let charge: IndexCharge | null = null;
let modifieLe = 0;

/**
 * L'index du site.
 *
 * Un index absent ou d'une autre version JETTE : la construction s'arrete au
 * lieu de produire un catalogue muet.
 *
 * En developpement, l'index est relu quand le fichier change : un
 * `npm run index` se voit au rechargement de la page, sans relancer le
 * serveur. En production il est fige — il ne change qu'au deploiement.
 */
export function indexDuSite(): IndexCharge {
  if (charge && process.env.NODE_ENV !== 'development') return charge;

  const date = fs.statSync(FICHIER).mtimeMs;
  if (!charge || date !== modifieLe) {
    charge = chargerIndex(JSON.parse(fs.readFileSync(FICHIER, 'utf8')) as Index);
    modifieLe = date;
  }
  return charge;
}
