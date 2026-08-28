import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

/**
 * Configuration a plat, sans pont de compatibilite.
 *
 * `eslint-config-next` expose depuis la version 16 de vraies configurations a
 * plat. Passer par `FlatCompat` les fait traverser l'ancien validateur, qui
 * etouffe sur la structure circulaire du greffon React.
 */
const configuration = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
];

export default configuration;
