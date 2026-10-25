/**
 * src/app/contenu/[...adresse]/route.ts
 * Zakali Press — `/contenu/<adresse>`, la porte unique du contenu des ouvrages.
 *
 * Hors du proxy des langues, et sans prefixe de langue (regle 7.2) : une
 * page de chapitre appelle ses images en relatif, et elles doivent repasser
 * par ici.
 */

import { indexDuSite } from '@/index/charge';
import type { EntreeDIndex } from '@/index/index';
import { cheminDeContenu } from '@/i18n/segments';
import { nomDeTelechargement } from '@/porte/livraison';
import { lectureDuChapitre, sortieVersLaLiseuse } from '@/porte/page-reservee';
import { decider } from '@/porte/porte';
import { stockageDuSite } from '@/porte/stockage';
import { servirDepuisLeSiteDeFichiers } from '@/porte/stockage-distant';
import { servirDepuisLeQuai } from '@/porte/stockage-local';

/**
 * Le refus d'un fichier reserve, toujours en 403 (regle 4.3).
 *
 * Une page de chapitre emmene la fenetre vers la liseuse, qui explique le
 * refus avec tout le site autour : c'est la que le lecteur arrive en cliquant
 * dans le sommaire. Une image, une video ou un PDF n'est jamais ouvert comme
 * une page : un 403 nu suffit.
 */
function refuser(entree: EntreeDIndex): Response {
  const lecture =
    entree.sorte === 'page' ? lectureDuChapitre(indexDuSite().index.fiches, entree.adresse) : null;
  if (!lecture) return new Response('Réservé aux lecteurs du volume', { status: 403 });

  return new Response(sortieVersLaLiseuse(lecture), {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Le jour ou les comptes existeront, la meme adresse servira le chapitre
      // a un lecteur et ce refus a un autre : rien ne doit en garder copie.
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  requete: Request,
  { params }: { params: Promise<{ adresse: string[] }> },
) {
  const { adresse } = await params;
  const decision = decider(indexDuSite(), adresse.join('/'));

  if (decision.statut === 404) return new Response('Introuvable', { status: 404 });
  if (decision.statut === 308) {
    // Un renvoi RELATIF a la racine, jamais compose sur `requete.url` :
    // derriere le proxy de Hostinger, l'application se voit a
    // `https://0.0.0.0:3000`, et un renvoi absolu y envoyait le navigateur —
    // aucune video de figure ne se lisait en ligne. Le navigateur resout
    // l'adresse contre celle qu'il a demandee, la seule qui soit juste.
    //
    // Et un cache borne : sans consigne, un navigateur garde un 308 sans fin.
    // L'ancien renvoi casse y est reste coince apres son correctif.
    return new Response(null, {
      status: 308,
      headers: { Location: cheminDeContenu(decision.vers), 'Cache-Control': 'public, max-age=3600' },
    });
  }
  if (decision.statut === 403) return refuser(decision.entree);

  // Le droit est verifie : il ne reste qu'a livrer, depuis le quai du poste
  // ou depuis le site de fichiers, selon la configuration.
  const { entree } = decision;
  const plage = requete.headers.get('range');
  const nom = nomDeTelechargement(indexDuSite().index.fiches, entree.adresse);
  const stockage = stockageDuSite();
  return stockage.mode === 'distant'
    ? servirDepuisLeSiteDeFichiers(stockage, entree, plage, nom)
    : servirDepuisLeQuai(entree, plage, nom);
}
