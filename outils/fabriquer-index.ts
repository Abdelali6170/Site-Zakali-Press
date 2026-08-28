/**
 * outils/fabriquer-index.ts
 * Zakali Press — fabriquer l'index, sur le poste, et l'ecrire dans le depot.
 *
 * Regle 4.1 — l'index est fabrique la ou vit le quai, et VERSIONNE dans le
 * depot. Le site le charge au demarrage et ne lit jamais de disque.
 *
 * Regle 4.6 — la fabrication inspecte le quai et dit ce qui cloche. Elle ne
 * s'arrete pas pour autant : le rapport se lit, il ne bloque pas.
 *
 * Usage :
 *   npm run index                 -- fabrique et ecrit donnees/index.json
 *   npm run index -- --verifier   -- fabrique, affiche le rapport, n'ecrit rien
 */

import fs from 'node:fs';
import path from 'node:path';

import { fabriquerIndex } from '@/index/fabriquer';
import { lireManifestes } from '@/ouvrages/catalogue';
import { racineDuQuai } from '@/quai/chemins';

const DESTINATION = path.join(process.cwd(), 'donnees', 'index.json');

function principal(): void {
  const verificationSeule = process.argv.includes('--verifier');

  const racine = racineDuQuai();
  const manifestes = lireManifestes();
  console.log(`Quai      : ${racine}`);
  console.log(`Ouvrages  : ${manifestes.map((m) => m.id).join(', ') || 'aucun'}\n`);

  const { index, rapport } = fabriquerIndex(racine, manifestes, new Date().toISOString());

  if (rapport.length === 0) {
    console.log('Le quai n’appelle aucune remarque.\n');
  } else {
    console.log(`── Ce que le quai raconte (${rapport.length}) ${'─'.repeat(40)}`);
    for (const ligne of rapport) console.log(`   ${ligne}`);
    console.log('');
  }

  const offerts = index.entrees.filter((e) => e.acces === 'offert').length;
  const octets = index.entrees.reduce((somme, e) => somme + e.octets, 0);
  console.log(`Fiches    : ${index.fiches.length}`);
  console.log(`Entrees   : ${index.entrees.length} — ${offerts} offertes, ${index.entrees.length - offerts} reservees`);
  console.log(`Volume    : ${(octets / 1024 ** 3).toFixed(2)} Go indexes`);

  if (verificationSeule) {
    console.log('\n--verifier : rien n’a ete ecrit.');
    return;
  }

  fs.mkdirSync(path.dirname(DESTINATION), { recursive: true });
  fs.writeFileSync(DESTINATION, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  const poids = fs.statSync(DESTINATION).size;
  console.log(`\nEcrit     : ${path.relative(process.cwd(), DESTINATION)} (${(poids / 1024 ** 2).toFixed(2)} Mo)`);
}

process.loadEnvFile();
principal();
