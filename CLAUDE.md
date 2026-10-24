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
| **La distillation** | **[`docs/REGLES.md`](docs/REGLES.md)** — les 53 règles, chacune avec sa raison et le test qui la fige. **À lire avant d'écrire.** Un test cite sa règle par son numéro |
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
| Fichiers d'ouvrage | un **site de fichiers** PHP/HTML sur la même offre Hostinger (Cloud Startup), au disque permanent — **pas de stockage objet**. Voir [`fichiers/LISEZMOI.md`](fichiers/LISEZMOI.md) |
| Langue du code | **français** — identifiants, commentaires, noms de fichiers |
| Interface | **l'identité du site archivé est reprise, la mise en page est revue** |

## L'interface

**L'identité est reprise telle quelle** — bordeaux `#4A0404`, or `#C5A059`,
papier et sable, Playfair Display pour les titres et Inter pour le labeur. Elle
avait été travaillée et validée : ce n'était pas elle le problème. Elle est posée
dans `globals.css`, **avant la première page**, pour qu'aucune page n'invente sa
propre couleur.

**La mise en page, elle, est revue** — parce qu'un catalogue à plusieurs ouvrages
ne se présente pas comme un catalogue à un seul :

- l'ancien affichait quinze fiches qui étaient cinq volumes × trois langues, et
  le filtre de langue masquait la duplication. Avec plusieurs ouvrages,
  **l'œuvre devient un niveau au-dessus de l'édition**, et le catalogue doit le
  montrer ;
- les disciplines étaient décoratives avec un seul ouvrage ; elles deviennent un
  vrai axe de navigation ;
- un ouvrage à cinq volumes et un ouvrage à volume unique ne peuvent pas
  s'afficher de la même façon.

Deux choses que le site archivé n'avait pas tranchées, et qui se décident **avec
les pages, pas avant** : un thème sombre, et une discipline responsive explicite.

Ce qui change et qu'il faut assumer : **la charte n'est plus modifiable depuis une
administration.** Changer le bordeaux est devenu un commit.

## Le piège qui casserait en silence

Une page de chapitre appelle ses images en **relatif**, et une feuille de style
ses polices. Les rediriger vers une adresse signée changerait la base d'adresse
du navigateur : images et polices partiraient droit au site de fichiers, **hors
contrôle d'accès**, et échoueraient.

> **Ce qui porte des liens est RELAYÉ par le site** — pages, feuilles, scripts,
> polices, narration, et les couvertures que lit l'optimiseur d'images. **Le
> poids est REDIRIGÉ** — images, vidéos, PDF — vers une adresse signée
> (règle 8.4).

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

## Le quai, tel qu'il est aujourd'hui

Un seul ouvrage y est posé, `biology-2e` — cinq volumes, trois langues, environ
neuf gigaoctets. Le quai vit dans `c:\OpenStax\Zakali_Edition\Livres`
(`LIVRES_DIR`) ; le quai d'avant la livraison du 24 octobre 2026, avec ses MP3,
est conservé dans `C:\OpenStax\Sauvegardes\`. **Le nom du dossier d'un ouvrage EST son identifiant de
manifeste** : c'est ce qui permet au manifeste de ne porter aucun chemin.

`outils/normaliser-quai.ts` amène une livraison d'atelier à cette forme. Prévu à
usage unique, il sert **à chaque livraison** tant que l'atelier livre dans sa
propre forme (PDF à plat, `html/`, `media/En`, `extraits/`) — celle du 24 octobre
2026 y est passée. Il sera supprimé le jour où l'atelier dépose en forme
canonique. Rien du site ne l'importe ; le relancer sur un quai rangé ne fait rien
et le dit.

### Après chaque livraison, dans cet ordre

```
npm run quai:normaliser -- biology-2e              # à blanc, puis --appliquer
npm run extraits -- --domaine https://zakalipress.com --appliquer
npm run index
npm run verser                                     # à blanc, puis --appliquer
```

Verser **avant** de pousser l'index : le site signe ce que dit son index, et un
fichier indexé mais pas encore versé répond 404.

Les **extraits PDF** livrés gardent les liens de l'atelier (un miroir appelé à
disparaître, le disque de l'éditeur). `npm run extraits` en fabrique une copie
reliée à la liseuse du site dans `derives/` — hors dépôt, hors quai — et **seule
cette copie est servie** (règle 6.7). Un extrait non relié, ou relié avant sa
livraison, sort de l'index. Le domaine gravé, `https://zakalipress.com`, a été
choisi par l'éditeur : un lien gravé dans un PDF téléchargé ne se corrige plus.

### Ce que le quai porte et qui n'est pas de lui

Chaque `vol-N/<langue>/covers/Biology_vol1.png` est un **rapiéçage** : le HTML de
l'atelier appelle ce nom dans les quinze volumes sans livrer l'image. Chacun
porte la bonne couverture de son volume. Une livraison non corrigée l'effacera.

## État

**Phase 1 — le socle.** Routage par langue avec adresses traduites, vérification
continue, premiers tests. Les pages sont provisoires.

**Phase 2 — la chaîne de l'ouvrage.** Le manifeste, chargé et refusé s'il est
douteux. La lecture du quai : chapitres depuis le sommaire, licence depuis la
préface, figures depuis la narration. L'index, avec ses niveaux d'accès, écrit
en artefact versionné dans `donnees/index.json` par `npm run index`.

> Les tests tournent contre les deux ouvrages d'essai **et contre le quai
> réel** — ces derniers s'ignorent d'eux-mêmes quand `LIVRES_DIR` n'est pas là,
> pour qu'un poste neuf ne soit pas rouge par conception.

**Phase 3 — le site public.** L'accueil (textes dans
`src/contenu/editorial/accueil.json`, chiffres et ouvrages depuis l'index), le
catalogue rangé par œuvre, la fiche d'un volume, la **liseuse**
(`/fr/lire/<slug>?chapitre=N&figure=…`) qui montre le volume dans un cadre sous
l'en-tête, la page d'un chapitre réservé, l'extrait PDF à télécharger. Les
disciplines se déduisent de l'index (`src/contenu/disciplines.ts`).

La **porte** `/contenu/<adresse>` (`src/porte/`) décide seule : offert servi,
réservé en 403, hors index en 404.

Deux défauts trouvés en route, et figés par des tests : `<link rel="next">`
offrait le chapitre 2 de chaque édition (règle 4.3) ; aucune vidéo de figure ne
se lisait, la page les cherchant sous son propre dossier (règle 4.7).

**Phase 4 — la mise en ligne, préparée, pas faite.** La porte livre selon la
configuration : depuis le quai sur le poste (`stockage-local.ts`), depuis le
**site de fichiers** en ligne (`stockage-distant.ts`, `FICHIERS_URL` et
`FICHIERS_SECRET` ; une seule des deux arrête le démarrage). Le site de
fichiers est `fichiers/porte.php`, déployé à la main : il vérifie une signature
HMAC et sert les plages, les livres rangés hors de `public_html`.
`npm run verser` y envoie le quai par SFTP ; `npm run verifier -- <site>`
contrôle un site en ligne. L'indexation est fermée tant que `INDEXATION` ne
vaut pas `ouverte`. Le proxy de Next 16 est `src/proxy.ts`.

> Les tests de `porte.php` demandent PHP sur le poste (`PHP_BIN`) ; sans lui,
> ils s'ignorent.

Avant tout push : savoir à quelle Web App le dépôt est relié (hPanel,
*Deployments* : `tan-dog-933624` et `tan-crane-859173.hostingersite.com`).
Le miroir ouvert ne se ferme qu'après que les PDF complets ont été reliés.

Restent : le site de fichiers et la Web App à créer, le domaine · les comptes et
l'achat.
