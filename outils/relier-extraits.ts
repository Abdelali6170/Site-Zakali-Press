/**
 * outils/relier-extraits.ts
 * Zakali Press — fabriquer les extraits PDF relies au site (regle 6.7).
 *
 * Lit chaque extrait LIVRE sur le quai (`<volume>/extrait/<langue>.pdf`), en
 * reecrit les liens vers la liseuse du site, et ecrit la copie reliee dans
 * `derives/`. Le quai n'est jamais modifie ; l'extrait livre non plus.
 *
 * Blanc par defaut : sans `--appliquer`, il dit ce qu'il ferait et n'ecrit rien.
 * Le domaine n'a pas de valeur par defaut (regle 6.4).
 *
 * Usage :
 *   npm run extraits -- --domaine https://zakalipress.com              -- blanc
 *   npm run extraits -- --domaine https://zakalipress.com --appliquer
 *
 * Ensuite : `npm run index`, pour que l'index connaisse les extraits relies.
 */

import fs from 'node:fs';
import path from 'node:path';

import { cibleDUnLien, relierLesLiens, validerDomaine } from '@/extraits/relier';
import { fabriquerIndex } from '@/index/fabriquer';
import { chargerIndex } from '@/index/index';
import { lireManifestes } from '@/ouvrages/catalogue';
import {
  fichierExtrait,
  fichierExtraitRelie,
  racineDesDerives,
  racineDuQuai,
} from '@/quai/chemins';

function argument(nom: string): string | undefined {
  const place = process.argv.indexOf(nom);
  return place >= 0 ? process.argv[place + 1] : undefined;
}

async function principal(): Promise<void> {
  const enVrai = process.argv.includes('--appliquer');
  const domaine = validerDomaine(argument('--domaine'));
  const racine = racineDuQuai();
  const derives = racineDesDerives();
  const manifestes = lireManifestes();

  console.log(`Quai     : ${racine}`);
  console.log(`Derives  : ${derives}`);
  console.log(`Domaine  : ${domaine}`);
  console.log(enVrai ? 'Mode     : APPLIQUE\n' : 'Mode     : blanc — rien ne sera ecrit\n');

  // L'index du quai tel qu'il est : c'est contre lui que chaque lien se verifie.
  const charge = chargerIndex(fabriquerIndex(racine, manifestes, new Date().toISOString()).index);

  let laisses = 0;
  for (const manifeste of manifestes) {
    if (!manifeste.reglages.extraitPdf) continue;
    for (const fiche of charge.index.fiches.filter((f) => f.ouvrage === manifeste.id)) {
      const nom = `${manifeste.id} vol-${fiche.volume} ${fiche.langue}`;
      const livre = fichierExtrait(racine, manifeste.id, fiche.volume, fiche.langue);
      if (!fs.existsSync(livre)) {
        console.log(`   ${nom.padEnd(26)} pas d’extrait livre`);
        continue;
      }

      const { octets, liens } = await relierLesLiens(fs.readFileSync(livre), (uri) =>
        cibleDUnLien(uri, fiche, charge, domaine),
      );
      const restes = liens.filter((l) => !l.apres);
      laisses += restes.length;
      console.log(
        `   ${nom.padEnd(26)} ${liens.length - restes.length}/${liens.length} liens relies` +
          `   ${(octets.length / 1e6).toFixed(1)} Mo`,
      );
      for (const reste of restes) {
        console.log(`      LAISSE TEL QUEL, page ${reste.page} : ${reste.avant}`);
      }

      if (enVrai) {
        const sortie = fichierExtraitRelie(derives, manifeste.id, fiche.volume, fiche.langue);
        fs.mkdirSync(path.dirname(sortie), { recursive: true });
        fs.writeFileSync(sortie, octets);
      }
    }
  }

  console.log('');
  if (laisses > 0) console.log(`${laisses} lien(s) laisse(s) tel quel : l’index ne les reconnait pas (regle 6.4).`);
  console.log(enVrai ? 'Ecrit. Lancer maintenant : npm run index' : 'Relancer avec --appliquer pour ecrire.');
}

process.loadEnvFile();
principal().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
});
