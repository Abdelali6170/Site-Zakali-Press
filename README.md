# Zakali Press

Plateforme d'édition : catalogue, lecture en ligne et contrôle d'accès pour les
ouvrages publiés par la maison.

```bash
npm install
npm run dev      # http://localhost:3000 — redirige vers /fr
npm test         # les tests unitaires
npm run build    # ce que la vérification lance à chaque poussée
```

## Trois endroits, et le site n'en connaît qu'un

| | |
|---|---|
| **L'atelier** | la machine de production, où les ouvrages se fabriquent. **Le site n'y entre jamais.** |
| **Le quai** | le dossier où l'atelier dépose les ouvrages finis. Le site le lit, il n'y écrit pas. |
| **La boutique** | ce dépôt. |

Le quai se déclare par `LIVRES_DIR` dans le `.env` — voir `.env.example`. Il n'est
jamais versionné : plusieurs gigaoctets d'ouvrages n'ont rien à faire dans Git.

## Les règles

La spécification du domaine — ce que le code doit respecter, pourquoi, et le
test qui le fige — vit hors du dépôt, en document de travail. Chaque règle y
porte un numéro, et les tests la citent : `segments.test.ts` fige les règles 7.1
et 7.4, et ainsi de suite.

## Où en est le projet

**Phase 1 — le socle.** Le routage par langue avec ses adresses traduites, la
vérification continue, les premiers tests. Les pages sont provisoires : elles
existent pour prouver que la chaîne tient.

Suivent : la chaîne de l'ouvrage, l'index comme artefact versionné, le catalogue
issu de l'index, le contenu éditorial, le site de fichiers, la mise en ligne.
