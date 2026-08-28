import type { NextConfig } from 'next';

/**
 * Zakali Press — configuration Next.js.
 *
 * Volontairement nue. Chaque reglage ajoute ici doit etre justifie sur place :
 * une configuration qui grossit sans raison est le premier symptome d'un cadre
 * qu'on ne maitrise plus.
 */
const nextConfig: NextConfig = {
  // Une erreur de type arrete la construction. Sur un projet qui se deploie au
  // push, la laisser passer reviendrait a la decouvrir en production.
  //
  // Le style, lui, ne se verifie plus ici : Next 16 a retire son integration
  // d'ESLint. C'est la verification continue qui lance `npm run lint`, et le
  // build echoue de toute façon si elle est rouge.
  typescript: { ignoreBuildErrors: false },

  // L'en-tete par defaut de Next revele la version du cadriciel.
  poweredByHeader: false,
};

export default nextConfig;
