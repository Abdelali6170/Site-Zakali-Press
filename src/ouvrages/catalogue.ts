/**
 * src/ouvrages/catalogue.ts
 * Zakali Press — les manifestes versionnes dans ce depot.
 *
 * Regle 1.3 — le manifeste vit avec le code. Ajouter un ouvrage, c'est poser
 * un fichier ici et poser les fichiers sur le quai : aucune ligne de code a
 * toucher.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { lireManifeste, type Manifeste } from '@/ouvrages/manifeste';

/** Le dossier des manifestes, a cote de ce fichier. */
export const DOSSIER_DES_MANIFESTES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'manifestes',
);

/**
 * Tous les manifestes du depot, par ordre d'identifiant.
 *
 * Un manifeste douteux interrompt la lecture de TOUS (regle 1.4) : un
 * catalogue amput d'un ouvrage sans que personne le voie serait pire qu'un
 * arret franc.
 */
export function lireManifestes(dossier: string = DOSSIER_DES_MANIFESTES): Manifeste[] {
  if (!fs.existsSync(dossier)) return [];
  return fs
    .readdirSync(dossier)
    .filter((nom) => nom.endsWith('.json'))
    .sort()
    .map((nom) => {
      const chemin = path.join(dossier, nom);
      return lireManifeste(JSON.parse(fs.readFileSync(chemin, 'utf8')), nom);
    });
}
