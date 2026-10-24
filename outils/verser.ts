/**
 * outils/verser.ts
 * Zakali Press — verser le quai et les derives sur le site de fichiers.
 *
 * Lance SUR LE POSTE, ou vivent le quai et `derives/`. Envoie par SFTP, sous le
 * dossier des livres du site de fichiers, chaque fichier que l'index connait,
 * a son adresse d'index (regle 4.2). Rien d'autre ne part (regle 10.2).
 *
 * Blanc par defaut : sans `--appliquer`, il se connecte, compare, et dit ce
 * qu'il enverrait. Seul ce qui a change repart. La part offerte seule, sauf
 * `--niveau reserve`. Rien n'est jamais efface la-bas : ce que l'index ne
 * connait plus est signale.
 *
 * Usage :
 *   npm run verser                                  -- blanc, part offerte
 *   npm run verser -- --appliquer                   -- envoie la part offerte
 *   npm run verser -- --niveau reserve --appliquer  -- le jour de la vente
 *
 * L'index verse est `donnees/index.json` : celui que le site deploie. Le
 * verser avant de pousser, pour que le site ne signe rien d'absent.
 */

import fs from 'node:fs';
import path from 'node:path';

import SftpClient from 'ssh2-sftp-client';

import { chargerIndex, type EntreeDIndex, type Index, type NiveauDAcces } from '@/index/index';
import { racineDesDerives, racineDuQuai } from '@/quai/chemins';
import { planDeVersement, type Releve } from '@/versement/plan';

function argument(nom: string): string | undefined {
  const place = process.argv.indexOf(nom);
  return place >= 0 ? process.argv[place + 1] : undefined;
}

function variable(nom: string): string {
  const valeur = process.env[nom]?.trim();
  if (!valeur) throw new Error(`${nom} n’est pas renseigne : voir .env.example.`);
  return valeur;
}

const mo = (octets: number) => `${(octets / 1e6).toFixed(1)} Mo`;

/** Tout ce qui est deja la-bas, sous son adresse d'index. */
async function releverLaBas(sftp: SftpClient, racine: string): Promise<Map<string, Releve>> {
  const releve = new Map<string, Releve>();
  async function parcourir(dossier: string, prefixe: string): Promise<void> {
    for (const element of await sftp.list(dossier)) {
      if (element.type === 'd') await parcourir(`${dossier}/${element.name}`, `${prefixe}${element.name}/`);
      // Un `.part` est un envoi interrompu : il sera refait.
      else if (element.type === '-' && !element.name.endsWith('.part')) {
        releve.set(`${prefixe}${element.name}`, { octets: element.size, modifieLe: element.modifyTime });
      }
    }
  }
  await parcourir(racine, '');
  return releve;
}

async function principal(): Promise<void> {
  const enVrai = process.argv.includes('--appliquer');
  const niveau = (argument('--niveau') ?? 'offert') as NiveauDAcces;
  if (niveau !== 'offert' && niveau !== 'reserve') throw new Error('--niveau vaut « offert » ou « reserve ».');

  const racineDistante = variable('VERSEMENT_DOSSIER').replace(/\/+$/, '');
  // Les livres vivent HORS de public_html : la, une adresse directe les
  // atteindrait sans signature.
  if (racineDistante.split('/').includes('public_html')) {
    throw new Error(`VERSEMENT_DOSSIER est sous public_html : ${racineDistante}. Les livres vivent a cote.`);
  }

  const index: Index = chargerIndex(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'donnees', 'index.json'), 'utf8')) as Index,
  ).index;
  const quai = racineDuQuai();
  const derives = racineDesDerives();
  const cheminLocal = (entree: EntreeDIndex) =>
    path.join(entree.origine === 'derive' ? derives : quai, ...entree.fichier.split('/'));
  const local = (entree: EntreeDIndex): Releve | null => {
    try {
      const etat = fs.statSync(cheminLocal(entree));
      return { octets: etat.size, modifieLe: etat.mtimeMs };
    } catch {
      return null;
    }
  };

  const hote = variable('VERSEMENT_HOTE');
  console.log(`Index    : fabrique le ${index.fabriqueLe}`);
  console.log(`Quai     : ${quai}`);
  console.log(`Vers     : ${hote}:${racineDistante}`);
  console.log(`Niveau   : ${niveau === 'reserve' ? 'offert ET reserve' : 'offert seul'}`);
  console.log(enVrai ? 'Mode     : APPLIQUE\n' : 'Mode     : blanc — rien ne sera envoye\n');

  const sftp = new SftpClient();
  await sftp.connect({
    host: hote,
    port: Number(process.env.VERSEMENT_PORT?.trim() || 22),
    username: variable('VERSEMENT_UTILISATEUR'),
    password: variable('VERSEMENT_MOT_DE_PASSE'),
  });
  try {
    if ((await sftp.exists(racineDistante)) !== 'd') {
      throw new Error(`${racineDistante} n’existe pas sur le site de fichiers : le creer a cote de public_html.`);
    }

    const plan = planDeVersement(index, niveau, local, await releverLaBas(sftp, racineDistante));
    const poids = plan.aEnvoyer.reduce((total, entree) => total + entree.octets, 0);
    console.log(`A jour       : ${plan.aJour}`);
    console.log(`A envoyer    : ${plan.aEnvoyer.length} (${mo(poids)})`);
    if (plan.divergents.length > 0) {
      console.log(`\nDIVERGENTS   : ${plan.divergents.length} — le quai a change depuis l’index, ils ne partent pas.`);
      for (const entree of plan.divergents.slice(0, 10)) console.log(`   ${entree.fichier}`);
      console.log('   Relancer `npm run index`, verifier, committer, puis verser.');
    }
    if (plan.inconnus.length > 0) {
      console.log(`\nInconnus de l’index, laisses en place : ${plan.inconnus.length}`);
      for (const adresse of plan.inconnus.slice(0, 10)) console.log(`   ${adresse}`);
    }

    if (!enVrai) {
      console.log('\nRelancer avec --appliquer pour envoyer.');
      return;
    }

    const crees = new Set<string>();
    let envoyes = 0;
    for (const entree of plan.aEnvoyer) {
      const cible = `${racineDistante}/${entree.adresse}`;
      const dossier = path.posix.dirname(cible);
      if (!crees.has(dossier)) {
        await sftp.mkdir(dossier, true);
        crees.add(dossier);
      }
      // Envoye sous un nom provisoire, puis mis en place : un lecteur ne recoit
      // jamais un fichier a moitie ecrit.
      await sftp.fastPut(cheminLocal(entree), `${cible}.part`);
      if (await sftp.exists(cible)) await sftp.delete(cible);
      await sftp.rename(`${cible}.part`, cible);
      envoyes += entree.octets;
      console.log(`   ${String(plan.aEnvoyer.indexOf(entree) + 1).padStart(5)}/${plan.aEnvoyer.length}  ${mo(envoyes).padStart(10)}  ${entree.adresse}`);
    }
    console.log(`\nEnvoye : ${plan.aEnvoyer.length} fichier(s), ${mo(envoyes)}.`);
  } finally {
    await sftp.end();
  }
}

process.loadEnvFile();
principal().catch((erreur: unknown) => {
  console.error(erreur instanceof Error ? erreur.message : erreur);
  process.exitCode = 1;
});
