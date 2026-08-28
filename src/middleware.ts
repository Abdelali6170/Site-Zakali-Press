/**
 * src/middleware.ts
 * Zakali Press — la porte d'entree des adresses.
 *
 * Trois choses, et rien d'autre :
 *
 *   1. une arrivee sans prefixe de langue est redirigee UNE FOIS vers la
 *      meilleure langue, en conservant le chemin demande ;
 *   2. un segment traduit est reecrit vers la clef interne de sa page —
 *      /es/catalogo devient /es/catalogue, que le routeur de Next sait servir ;
 *   3. un segment qui n'appartient PAS a cette langue ne designe rien, et
 *      obtient un 404 franc.
 *
 * Le troisieme point est la raison d'etre de ce fichier. Sans lui,
 * /es/catalogue servirait la page espagnole sous une adresse francaise :
 * le routeur de Next trouverait le dossier `catalogue` et ne verrait pas le
 * probleme. C'est ici, et seulement ici, que le 404 est prononce.
 *
 * `/contenu/…` ne passe pas par ce middleware : ces adresses portent deja leur
 * langue a l'interieur, et une page de chapitre appelle ses images en relatif —
 * un prefixe les casserait.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { estLangue, negocier, type Langue } from '@/i18n/langues';
import { pageDepuisSegment } from '@/i18n/segments';

const COOKIE_LANGUE = 'zk.langue';

export function middleware(requete: NextRequest) {
  const { pathname, search } = requete.nextUrl;
  const morceaux = pathname.split('/').filter(Boolean);
  const [premier, deuxieme, ...reste] = morceaux;

  // ── 1. Arrivee sans prefixe de langue ─────────────────────────────────────
  // Seuls GET et HEAD sont rediriges : un POST egare n'a pas a etre rejoue
  // ailleurs.
  if (!estLangue(premier)) {
    if (requete.method !== 'GET' && requete.method !== 'HEAD') {
      return NextResponse.next();
    }
    const choisie = negocier({
      cookie: requete.cookies.get(COOKIE_LANGUE)?.value,
      accepteLangues: requete.headers.get('accept-language'),
    });
    const cible = new URL(`/${choisie}${pathname === '/' ? '' : pathname}${search}`, requete.url);
    return NextResponse.redirect(cible);
  }

  const langue = premier as Langue;

  // ── 2. L'accueil de la langue ─────────────────────────────────────────────
  if (!deuxieme) return NextResponse.next();

  // ── 3. Le segment appartient-il a CETTE langue ? ──────────────────────────
  const page = pageDepuisSegment(langue, deuxieme);
  if (!page) {
    // Aucune page ne porte ce mot dans cette langue. On reecrit vers une
    // adresse sans route : Next rend alors sa page « introuvable ».
    return NextResponse.rewrite(new URL(`/${langue}/_introuvable`, requete.url));
  }

  // ── 4. Reecriture vers la clef interne ────────────────────────────────────
  const interne = ['', langue, page, ...reste].join('/');
  if (interne === pathname) return NextResponse.next();
  return NextResponse.rewrite(new URL(interne + search, requete.url));
}

export const config = {
  matcher: [
    // Tout, sauf : les fichiers de Next, la porte du contenu des ouvrages,
    // les routes serveur, et les fichiers servis tels quels.
    '/((?!_next/|contenu/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|images/).*)',
  ],
};
