import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Extension `.mts` et non `.ts` : ce fichier est en syntaxe ESM, et le
 * chargeur natif de Vite le lirait sinon comme du CommonJS. L'alerte devient
 * une erreur dans une version majeure a venir.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
