# CLAUDE.md — Zakali Press

Mémoire projet chargée automatiquement. Lire avant toute action.

## Ce qu'est ce site

Une plateforme d'édition qui publie **plusieurs ouvrages**, et dont le catalogue
**se peuple au fil des parutions**. Le nombre n'est pas fixé et ne le sera pas.

Les ouvrages **ne viennent pas d'une seule source**. Biology 2e vient d'OpenStax ;
le livre sur Claude Code n'en vient pas — il ne porte aucun de ses marqueurs.
D'autres origines suivront, avec d'autres chaînes de fabrication.

**Le site n'a donc à connaître aucune origine.** Il connaît le quai, dont la
forme est fixe, et le manifeste de chaque ouvrage.

> **Le critère qui tranche toute décision de structure : ajouter un ouvrage doit
> être écrire un manifeste et poser les fichiers sur le quai. Aucune ligne de
> code à toucher.**

## Trois endroits, une frontière

| | | Le site y touche |
|---|---|---|
| **L'atelier** | la machine de production, où les ouvrages se fabriquent | **jamais** |
| **Le quai** | `LIVRES_DIR` — les ouvrages finis que l'atelier y dépose | lecture seule |
| **La boutique** | ce dépôt | — |

**Aucun fichier de ce dépôt ne porte un chemin de la machine de production, et
aucune commande n'y entre.** Qui remplit le quai ne regarde pas le site.

Le quai a une **forme fixe**, la même pour tous les ouvrages — d'où l'absence de
gabarits de chemin dans les manifestes. Les arborescences de production divergent
d'un ouvrage à l'autre et ne se résorberont pas, d'autant moins que les sources
sont multiples : le site en fixe une, et la vérifie.

## L'ancien projet est une archive, pas un déchet

Ce dépôt succède à `c:\OpenStax\Zakali_Edition`. Ce projet a été mené à bien —
il tourne, il est testé — mais il était parti d'un mauvais modèle : écrit comme
« le site de Biology », puis rattrapé morceau par morceau à chaque besoin
nouveau.

**C'est là que les leçons ont été payées.** On les garde ; c'est le code qu'on
ne reprend pas.

| | |
|---|---|
| **L'archive** | l'ancien dépôt — la trace, et la preuve. On la consulte pour comprendre *pourquoi* une règle existe |
| **La distillation** | la spécification — les règles, chacune avec sa raison et le test qui la fige |
| **Le résultat** | ce dépôt |

Donc : **ne jamais recopier de code de l'ancien projet** — mais ne jamais le
traiter comme sans valeur non plus. Une question sur le *pourquoi* d'une règle a
souvent sa réponse là-bas, écrite sur place.

## Décisions arrêtées

| | |
|---|---|
| Cadriciel | **Next.js** — l'éditeur le pratique déjà sur deux autres sites |
| Déploiement | **GitHub → Hostinger Web App**, push sur `main`, **sans SSH** |
| Serveur | **jetable** : reconstruit à chaque déploiement, rien de ce qu'il écrit ne survit |
| Base | **PostgreSQL managé (Neon)** — deux tables : comptes et commandes |
| Sessions | **cookie signé** — un visiteur anonyme ne touche jamais la base |
| Contenu éditorial | **dans les fichiers du dépôt**, lu au démarrage. Pas d'administration du contenu |
| Ouvrages | **un manifeste par ouvrage** ; le catalogue vient de l'index. **Il n'y a pas de table des ouvrages** |
| Fichiers d'ouvrage | stockage objet compatible S3, **reporté** au jour de la publication |
| Langue du code | **français** — identifiants, commentaires, noms de fichiers |

## Le piège qui casserait en silence

Une page de chapitre appelle ses images en **relatif**. La rediriger vers une
adresse signée changerait la base d'adresse du navigateur : les images
partiraient droit au stockage objet, **hors contrôle d'accès**, et échoueraient.

> **Les pages HTML sont RELAYÉES par le site. Tout le reste est REDIRIGÉ** vers
> une adresse signée de quelques minutes.

## Ce qui ne se déclare pas, et ce qui se lit

Le manifeste porte **ce que le quai ne dit pas** : titres et descriptions,
prix, discipline, chapitres offerts, portée de la vente.

Tout le reste est **lu** : les chapitres viennent du sommaire du volume, dans son
ordre ; les figures viennent de la narration ; la licence, quand il y en a une,
vient de la préface.

Rien de tout cela n'est obligatoire. Un ouvrage sans licence amont, sans figures
commentées, sans traduction ou à volume unique est un cas **normal**, pas une
erreur.

## Garde-fous

### TOUJOURS

- Un commit atomique par tâche. `npm run typecheck`, `npm run lint`, `npm test`
  et `npm run build` verts avant de committer.
- Toute règle du domaine qu'on implémente est **figée par un test qui la cite**.
- Stager les fichiers nommément.
- Demander avant toute opération destructive.

### JAMAIS

- Ne jamais committer `.env` ni aucun secret — un dépôt privé n'est pas un coffre.
- Ne jamais versionner le quai : plusieurs gigaoctets d'ouvrages.
- Ne jamais écrire un chemin de la machine de production dans ce dépôt.
- Ne jamais composer un chemin de fichier à partir d'une requête : une adresse
  demandée est **cherchée dans l'index**, jamais concaténée.
- Ne jamais ouvrir une seconde porte vers les fichiers d'ouvrage. Il y en a une,
  elle vérifie le droit, et elle est seule.
- Ne jamais laisser une page accorder un droit : elle montre ce que le droit
  accorderait, et chaque fichier revérifie au moment d'être servi.

## Vocabulaire

Les clefs de route — `catalogue`, `lire`, `compte` — sont des **identifiants
internes** qui ressemblent au français. Ce ne sont pas les adresses françaises,
que porte la table des segments : `/es/catalogo`, `/en/read`.

## État

**Phase 1 — le socle.** Routage par langue avec adresses traduites, vérification
continue, premiers tests. Les pages sont provisoires : elles existent pour
prouver que la chaîne tient.

Restent : la chaîne de l'ouvrage · l'index comme artefact versionné · le catalogue
issu de l'index · le contenu éditorial · le stockage objet · la mise en ligne.
