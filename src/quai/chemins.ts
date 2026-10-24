/**
 * src/quai/chemins.ts
 * Zakali Press — la forme du quai, et rien d'autre.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  C'EST ICI, ET NULLE PART AILLEURS, QUE LE SITE SAIT OU LES CHOSES SONT.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Regle 1.2 — le quai a des emplacements fixes, les memes pour tous les
 * ouvrages. Un seul fichier les connait ; tout le reste passe par lui.
 *
 * Regle 1.2 bis — la forme s'arrete au dossier `<volume>/<langue>/`. Ce qui
 * vit EN DESSOUS n'est pas impose, parce qu'il n'est jamais devine : le
 * sommaire donne l'adresse de chaque chapitre, une page donne l'adresse de
 * ses images. Aucune fonction de ce fichier ne descend donc dans un volume.
 *
 * Regle 1.1 — aucun chemin de la machine de production n'est ecrit ici. La
 * racine vient de `LIVRES_DIR`, qui n'existe que dans le `.env` local.
 */

import path from 'node:path';

import type { Langue } from '@/i18n/langues';

/** Les trois sortes de medias que l'atelier depose par chapitre. */
export const SORTES_DE_MEDIA = ['narration', 'video', 'audio'] as const;
export type SorteDeMedia = (typeof SORTES_DE_MEDIA)[number];

/**
 * La racine du quai, telle que le poste la declare.
 *
 * Le site en production ne lit jamais de disque — il charge l'index (regle
 * 4.1). Cette fonction ne sert donc qu'a la fabrication, sur le poste ou vit
 * le quai. Elle jette plutot que de retomber sur une valeur par defaut : un
 * defaut silencieux fabriquerait un index vide sans que personne le voie.
 */
export function racineDuQuai(): string {
  const declare = process.env.LIVRES_DIR?.trim();
  if (!declare) {
    throw new Error(
      'LIVRES_DIR n’est pas renseigne. Le quai de livraison se declare dans le .env local ; ' +
        'voir .env.example.',
    );
  }
  return path.resolve(declare);
}

/** `vol-1`, `vol-2`… — le dossier d'un volume sur le quai. */
export function nomDeVolume(numero: number): string {
  return `vol-${numero}`;
}

/** `ch01`, `ch31`… — le dossier de medias d'un chapitre (regle 2.3). */
export function nomDeChapitreMedia(numero: number): string {
  return `ch${String(numero).padStart(2, '0')}`;
}

/** `<quai>/<ouvrage>/` */
export function dossierOuvrage(racine: string, ouvrage: string): string {
  return path.join(racine, ouvrage);
}

/** `<quai>/<ouvrage>/<volume>/<langue>/` — la racine du site HTML d'une edition. */
export function dossierEdition(
  racine: string,
  ouvrage: string,
  volume: number,
  langue: Langue,
): string {
  return path.join(racine, ouvrage, nomDeVolume(volume), langue);
}

/** `<quai>/<ouvrage>/<volume>/pdf/<langue>/` */
export function dossierPdf(
  racine: string,
  ouvrage: string,
  volume: number,
  langue: Langue,
): string {
  return path.join(racine, ouvrage, nomDeVolume(volume), 'pdf', langue);
}

/** `<quai>/<ouvrage>/<volume>/couverture/<langue>.png` */
export function fichierCouverture(
  racine: string,
  ouvrage: string,
  volume: number,
  langue: Langue,
): string {
  return path.join(racine, ouvrage, nomDeVolume(volume), 'couverture', `${langue}.png`);
}

/**
 * `<quai>/<ouvrage>/<volume>/extrait/<langue>.pdf` — l'extrait tel que l'atelier
 * le livre, avec ses liens d'origine. Il n'est jamais servi (regle 6.7).
 */
export function fichierExtrait(
  racine: string,
  ouvrage: string,
  volume: number,
  langue: Langue,
): string {
  return path.join(racine, ouvrage, nomDeVolume(volume), 'extrait', `${langue}.pdf`);
}

/**
 * La racine des DERIVES : ce que le site fabrique a partir du quai, sur le
 * poste. `derives/` a la racine du depot, ignore par Git. Ce n'est pas le
 * quai : le site n'ecrit jamais sur le quai (regle 6.7).
 */
export function racineDesDerives(): string {
  return path.join(process.cwd(), 'derives');
}

/** `<derives>/extraits/<ouvrage>/<volume>/<langue>.pdf` — l'extrait relie, seul servi. */
export function fichierExtraitRelie(
  derives: string,
  ouvrage: string,
  volume: number,
  langue: Langue,
): string {
  return path.join(derives, 'extraits', ouvrage, nomDeVolume(volume), `${langue}.pdf`);
}

/**
 * `<quai>/<ouvrage>/media/<langue>/<sorte>/chNN/`
 *
 * Les medias sont ranges au niveau de l'OUVRAGE, pas du volume : les chapitres
 * y sont numerotes d'un seul tenant sur tout l'ouvrage, sans egard aux volumes
 * (regle 1.2).
 */
export function dossierMedia(
  racine: string,
  ouvrage: string,
  langue: Langue,
  sorte: SorteDeMedia,
  chapitre?: number,
): string {
  const base = path.join(racine, ouvrage, 'media', langue, sorte);
  return chapitre === undefined ? base : path.join(base, nomDeChapitreMedia(chapitre));
}
