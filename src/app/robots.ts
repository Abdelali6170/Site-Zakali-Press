/**
 * src/app/robots.ts
 * Zakali Press — `/robots.txt`, la moitie applicative de la regle 10.4.
 * L'autre moitie, l'en-tete `X-Robots-Tag`, est posee par next.config.ts.
 */

import type { MetadataRoute } from 'next';

import { indexationOuverte } from '@/site/indexation';

export default function robots(): MetadataRoute.Robots {
  return indexationOuverte(process.env)
    ? { rules: { userAgent: '*', allow: '/' } }
    : { rules: { userAgent: '*', disallow: '/' } };
}
