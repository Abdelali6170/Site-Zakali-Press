/**
 * src/instrumentation.ts
 * Zakali Press — ce qui se verifie au demarrage du serveur.
 *
 * Une configuration de stockage partielle arrete le demarrage, avec un message
 * qui nomme la variable manquante — plutot qu'un 503 a chaque lecteur.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { stockageDuSite } = await import('@/porte/stockage');
  stockageDuSite();
}
