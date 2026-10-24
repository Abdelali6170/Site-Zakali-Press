/**
 * src/app/not-found.tsx
 * Zakali Press — page introuvable.
 *
 * Atteinte notamment par le proxy, quand un segment n'appartient pas a la
 * langue demandee : /es/catalogue est le mot francais sous un prefixe espagnol,
 * et ne designe rien.
 *
 * Provisoire : ses textes viendront du contenu editorial, a la phase 5.
 */

export default function Introuvable() {
  return (
    <html lang="fr">
      <body>
        <main>
          <h1>Page introuvable</h1>
          <p>Cette adresse ne correspond à aucune page du site.</p>
        </main>
      </body>
    </html>
  );
}
