/**
 * outils/verifier.ts
 * Zakali Press — verifier un site en ligne, apres chaque mise en ligne.
 *
 * Regle 10.3 — une page de lecture repond 200, un chapitre offert 200, et un
 * fichier reserve REELLEMENT INDEXE repond 403. S'y ajoutent ce que la mise en
 * ligne a introduit :
 *
 *   - regle 8.4 — une page et une feuille sont relayees, une video et un
 *     extrait rediriges, et le site de fichiers sert la plage demandee ;
 *   - le site de fichiers refuse une adresse sans signature, ou alteree ;
 *   - les couvertures passent par l'optimiseur d'images ;
 *   - regle 10.4 — `robots.txt` et `X-Robots-Tag` disent la meme chose.
 *
 * Les cibles viennent de `donnees/index.json` : celui que le site deploie.
 *
 * Usage :
 *   npm run verifier -- https://zakalipress.com
 */

import fs from 'node:fs';
import path from 'node:path';

import { chargerIndex, type Index } from '@/index/index';
import { cheminDeContenu, cheminDeLecture } from '@/i18n/segments';
import { ciblesDeVerification } from '@/verification/cibles';

let echecs = 0;

function constater(intitule: string, reussi: boolean, detail: string): void {
  if (!reussi) echecs++;
  console.log(`${reussi ? '  ok ' : ' ECHEC'}  ${intitule.padEnd(52)} ${detail}`);
}

/** Un hote injoignable rend une reponse de statut 0 : un echec parmi d'autres, pas un arret. */
async function demander(url: string, entetes: Record<string, string> = {}): Promise<Response> {
  try {
    return await fetch(url, { redirect: 'manual', headers: entetes });
  } catch {
    return Response.error();
  }
}

async function principal(): Promise<void> {
  const site = process.argv[2]?.replace(/\/+$/, '');
  if (!site || !/^https?:\/\//.test(site)) throw new Error('Usage : npm run verifier -- https://<site>');

  const index: Index = chargerIndex(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'donnees', 'index.json'), 'utf8')) as Index,
  ).index;
  const cibles = ciblesDeVerification(index);
  const contenu = (adresse: string) => `${site}${cheminDeContenu(adresse)}`;
  console.log(`Site     : ${site}`);
  console.log(`Edition  : ${cibles.fiche.slug} (${cibles.fiche.langue})\n`);

  // ── Regle 10.3 ────────────────────────────────────────────────────────────
  const accueil = await demander(`${site}/${cibles.fiche.langue}`);
  constater('accueil', accueil.status === 200, String(accueil.status));

  const liseuse = await demander(`${site}${cheminDeLecture(cibles.fiche.langue, cibles.fiche.slug)}`);
  constater('liseuse', liseuse.status === 200, String(liseuse.status));

  const chapitre = await demander(contenu(cibles.chapitreOffert));
  constater(
    'chapitre offert : 200, relaye (regle 8.4)',
    chapitre.status === 200 && (chapitre.headers.get('content-type') ?? '').startsWith('text/html'),
    `${chapitre.status} ${chapitre.headers.get('content-type') ?? ''}`,
  );

  const feuille = await demander(contenu(cibles.feuille));
  constater('feuille de style : 200, relayee (regle 8.4)', feuille.status === 200, String(feuille.status));

  const reservee = await demander(contenu(cibles.pageReservee));
  constater('chapitre reserve : 403', reservee.status === 403, String(reservee.status));

  const fichier = await demander(contenu(cibles.fichierReserve));
  constater('fichier reserve indexe : 403 (regle 10.3)', fichier.status === 403, String(fichier.status));

  // ── Regle 8.4 : ce qui est redirige ────────────────────────────────────────
  if (cibles.video) {
    const renvoi = await demander(contenu(cibles.video));
    const vers = renvoi.headers.get('location');
    constater('video offerte : redirigee vers une adresse signee', renvoi.status === 307 && !!vers, String(renvoi.status));
    if (vers) {
      const plage = await demander(vers, { Range: 'bytes=0-99' });
      constater(
        'site de fichiers : la plage demandee, en 206',
        plage.status === 206 && plage.headers.get('content-type') === 'video/mp4',
        `${plage.status} ${plage.headers.get('content-range') ?? ''}`,
      );

      const nue = new URL(vers);
      nue.search = '';
      const sansSignature = await demander(nue.href);
      constater('site de fichiers : sans signature, 403', sansSignature.status === 403, String(sansSignature.status));

      const alteree = new URL(vers);
      alteree.searchParams.set('s', '0'.repeat(64));
      const fausse = await demander(alteree.href);
      constater('site de fichiers : signature alteree, 403', fausse.status === 403, String(fausse.status));

      // Les livres vivent hors de public_html : aucune adresse directe.
      const directe = await demander(`${nue.origin}/livres${nue.pathname}`);
      constater('site de fichiers : les livres hors d’atteinte directe', directe.status !== 200, String(directe.status));
    }
  }

  if (cibles.extrait) {
    const renvoi = await demander(contenu(cibles.extrait));
    const vers = renvoi.headers.get('location');
    const servi = vers ? await demander(vers) : null;
    constater(
      'extrait : redirige, telecharge sous son nom',
      renvoi.status === 307 && servi?.status === 200 &&
        (servi.headers.get('content-disposition') ?? '').startsWith('attachment'),
      `${renvoi.status} → ${servi?.status ?? '-'} ${servi?.headers.get('content-disposition') ?? ''}`,
    );
    await servi?.body?.cancel();
  }

  if (cibles.couverture) {
    const optimisee = await demander(
      `${site}/_next/image?url=${encodeURIComponent(cheminDeContenu(cibles.couverture))}&w=640&q=75`,
      { Accept: 'image/avif,image/webp,image/*' },
    );
    constater(
      'couverture par l’optimiseur d’images',
      optimisee.status === 200 && (optimisee.headers.get('content-type') ?? '').startsWith('image/'),
      `${optimisee.status} ${optimisee.headers.get('content-type') ?? ''} ${optimisee.headers.get('content-length') ?? ''}`,
    );
  }

  // ── Regle 10.4 : les deux moities disent la meme chose ────────────────────
  const reponseRobots = await demander(`${site}/robots.txt`);
  const robots = await reponseRobots.text();
  const fermeParRobots = /^Disallow:\s*\/\s*$/m.test(robots);
  const fermeParEntete = /noindex/.test(accueil.headers.get('x-robots-tag') ?? '');
  constater(
    'indexation : robots.txt et X-Robots-Tag d’accord',
    reponseRobots.status === 200 && accueil.status === 200 && fermeParRobots === fermeParEntete,
    fermeParRobots && fermeParEntete ? 'fermee' : !fermeParRobots && !fermeParEntete ? 'ouverte' : 'DESACCORD',
  );

  console.log(echecs === 0 ? '\nTout est conforme.' : `\n${echecs} echec(s).`);
  if (echecs > 0) process.exitCode = 1;
}

principal().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
});
