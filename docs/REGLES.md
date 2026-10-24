# Les règles de la maison

Spécification du domaine. **C'est le document contre lequel on écrit, et contre
lequel on vérifie.**

Rien de l'ancien projet n'est recopié. Ce qui se reprend, ce sont ces règles —
apprises en se cognant dessus. Chacune porte sa raison, et le test qui la fige.

Quand un test cite une règle, il la cite par son numéro. Changer une règle ici
sans changer son test, ou l'inverse, est une erreur.

---

# Première partie — le domaine

## 1. La frontière, le quai, et le manifeste

Trois endroits, et le site n'en connaît qu'un.

### 1.1 — Le site ne connaît que le quai de livraison

| | Ce que c'est | Le site y touche |
|---|---|---|
| **l'atelier** | la machine de production, où les ouvrages se fabriquent | **jamais** |
| **le quai** | le dossier où l'atelier dépose les ouvrages finis | en lecture seule |
| **la boutique** | le site | — |

Aucun fichier du site ne porte un chemin de la machine de production, et aucune
commande du site n'y entre. Qui remplit le quai — un geste manuel, un script de
l'atelier — **ne regarde pas le site**.

> **Pourquoi** — un chemin de la machine de production n'existe ni sur le serveur
> ni sur un dépôt neuf. Et il décrirait les entrailles d'un autre projet, qui
> bouge : la chaîne de production en est à sa troisième version de méthode.

### 1.2 — Le quai a des emplacements fixes, les mêmes pour tous les ouvrages

```
<quai>/<ouvrage>/
  <volume>/<langue>/            le site HTML du volume
  <volume>/pdf/<langue>/        les PDF de ce volume
  <volume>/couverture/<langue>.png
  <volume>/extrait/<langue>.pdf    l'extrait gratuit, quand l'ouvrage en offre un
  media/<langue>/narration/chNN/
  media/<langue>/video/chNN/
  media/<langue>/audio/chNN/
```

**Le manifeste ne porte donc aucun chemin.** Ni dossier de volume, ni dossier de
chapitres, ni suffixe de langue, ni gabarit de nom de PDF, ni racine de
couvertures : la place de chaque chose est connue d'avance.

**Le volume porte tout ce qui le concerne ; l'ouvrage ne porte que les médias.**
Un ouvrage à cinq volumes a cinq couvertures et cinq jeux de PDF : les ranger au
niveau de l'ouvrage obligerait à relire un nom de fichier pour savoir quel volume
il sert — un gabarit de nom réintroduit là où cette règle vient de les supprimer.
Les médias, eux, restent à l'ouvrage : les chapitres y sont numérotés d'un seul
tenant sur tout l'ouvrage, `ch01` à `ch44`, sans égard aux volumes.

> **Pourquoi** — les arborescences de production divergent d'un ouvrage à
> l'autre : `chapitres_fr` chez l'un, `chapters_fr` chez l'autre, `covers` ici et
> `cover` là. Cette incohérence est l'état normal d'un pipeline qui a grandi sur
> de nombreux projets, et elle ne se résorbera pas — d'autant moins que les
> sources sont multiples. Encaisser toutes ces formes *à l'exécution* ferait
> connaître autant d'arborescences au code qui décide de l'accès. Le site en fixe
> une, et la vérifie.
>
> **Figé par** — le test à deux ouvrages d'essai monte deux quais de forme
> identique, l'un à deux volumes et deux langues, l'autre à volume unique.

### 1.2 bis — Le quai fixe l'extérieur d'un volume, jamais son intérieur

La forme est imposée jusqu'au dossier `<volume>/<langue>/`. **En dessous, rien
n'est imposé** : `chapters/chapter_01.html` chez l'un et
`chapitres_fr/chapter_01.fr.html` chez l'autre sont deux cas normaux.

> **Pourquoi** — l'intérieur d'un volume n'a pas besoin d'être fixé, parce qu'il
> n'est jamais deviné : le sommaire donne l'adresse de chaque chapitre, une page
> donne l'adresse de ses images (règle 2.1). Fixer ce qui se lit déjà coûterait
> une réécriture des pages à chaque livraison, pour rien.
>
> Cela dit aussi ce que la normalisation d'un quai a le droit de toucher : les
> dossiers extérieurs, et eux seuls. Une normalisation qui entre dans un volume
> casse les liens relatifs de ses pages.

### 1.3 — Le manifeste vit avec le code, pas avec les ouvrages

Il est versionné dans le dépôt. Le quai, lui, ne l'est jamais.

> **Pourquoi** — un manifeste rangé près des sources serait perdu au premier
> clone, et avec lui la seule trace de ce qui a été déclaré à la main.

### 1.4 — Un manifeste douteux est fatal, jamais deviné

Toute anomalie interrompt l'import : champ manquant, langue inconnue du site,
numéro de volume déclaré deux fois, portée de vente fantaisiste.

> **Pourquoi** — des fiches fausses sont pires que pas de fiches. Une portée
> inventée ferait vendre l'ouvrage autrement que ce que sa description promet.
>
> **Figé par** — un test par catégorie d'anomalie, qui vérifie que l'import
> s'arrête et que le message nomme le champ.

### 1.5 — La clef d'œuvre relie les éditions d'un même volume

Les éditions linguistiques d'un volume partagent une clef. Un ouvrage à plusieurs
volumes la forme avec son numéro ; **un ouvrage mono-volume n'écope pas d'un
suffixe** — sa clef est son identifiant.

> **Pourquoi** — l'ouvrage sur Claude Code est mono-volume. Un `-vol-1` parasite
> polluerait ses adresses pour toujours.
>
> **Figé par** — un test qui monte deux ouvrages d'essai, l'un à deux volumes,
> l'autre à volume unique.

### 1.6 — La discipline se déclare dans le manifeste, avec ses libellés par langue

```json
"category": {
  "slug": "ia",
  "fr": { "label": "Intelligence artificielle", "group": "Informatique" },
  "en": { "label": "Artificial intelligence",   "group": "Computing" },
  "es": { "label": "Inteligencia artificial",   "group": "Informática" }
}
```

Les disciplines du catalogue se **déduisent des ouvrages présents**. Elles ne se
saisissent nulle part.

> **Pourquoi** — c'est le défaut qui a coûté le plus cher dans l'ancien code. La
> discipline devait être saisie à la main dans trois fichiers de contenu, un
> garde-fou vérifiait ces fichiers pendant que le site lisait la base, et les
> familles étaient une liste figée dans le code qui refusait toute valeur
> nouvelle. Trois pièces pour une information qui appartient à l'ouvrage.
>
> **Figé par** — un test qui importe un ouvrage d'une discipline inédite et
> vérifie qu'elle apparaît au menu et au filtre, sans qu'aucun autre fichier ait
> été touché.

### 1.7 — Ce qui varie d'un ouvrage à l'autre est un réglage, jamais du code

| Réglage | Défaut | Ce qu'il décide |
|---|---|---|
| `freeChapters` | `1` | combien de chapitres sont offerts à la lecture |
| `purchaseScope` | `work` | `work` : un achat ouvre toutes les langues du volume · `edition` : chaque langue se vend séparément |
| `extractPdf` | `false` | un extrait PDF est-il offert au téléchargement |
| `figureVideo` | `true` | les séquences vidéo des figures sont-elles servies |
| `figureAudio` | `false` | les pistes audio par figure le sont-elles |

> **Pourquoi** — chacun de ces réglages a d'abord été une constante valable pour
> tout le site, et chacun a dû être repris ouvrage par ouvrage. On part
> directement à l'arrivée.
>
> **Figé par** — le test à deux ouvrages vérifie que chaque réglage est lu *par
> ouvrage* et ne déborde pas sur l'autre.

### 1.8 — Un réglage n'efface jamais rien sur le quai

Passer `figureAudio` à `false` n'efface aucun fichier : cela empêche l'index de
les connaître. Ce que l'index ignore n'est servi par aucune adresse — **pas même
à l'adresse exacte**. Remettre le réglage à `true` les remet en ligne, sans autre
modification.

> **Figé par** — un test qui demande l'adresse exacte d'un fichier désindexé et
> attend un 404.

### 1.9 — Rien de ce qui se lit n'est obligatoire

Un ouvrage **sans licence amont**, **sans figures commentées**, **sans traduction**
ou **à volume unique** est un cas normal, pas une erreur.

> **Pourquoi** — les ouvrages ne viennent pas d'une seule source. Un ouvrage
> propre à la maison n'est l'édition de rien et n'a pas de licence amont à citer ;
> un autre n'aura ni vidéo ni narration. `sourceWork` est facultatif, la licence
> est facultative, et zéro figure est un comptage valide.

---

## 2. Lire le quai

Tout ce qui peut être lu est lu, jamais reformulé. Les titres de chapitres
sortent de la barre latérale des sommaires, la mention de licence sort de la
préface, les comptages sortent des fichiers.

### 2.1 — Aucun chemin n'est deviné, parce qu'aucun n'est composé

Les dossiers du quai sont fixes et en minuscules. Les noms de fichiers *à
l'intérieur* d'un volume ne sont jamais fabriqués : ils viennent de la page
elle-même — le sommaire donne l'adresse de chaque chapitre, une page donne
l'adresse de ses images.

> **Pourquoi** — l'ancien code composait des chemins à partir de gabarits, et
> devait donc les rattraper par une comparaison insensible à la casse : les
> couvertures vivaient dans `covers/En/`, `covers/fr/` et `covers/es/`, avec des
> fichiers `…_fr.png` et `…_Es.png`. Sous Windows cela passe, sous Linux non.
> **Une forme fixe et des noms lus plutôt que devinés font disparaître le
> problème au lieu de le rattraper.**

### 2.2 — Un chapitre est un lien de sommaire, pas un fichier trouvé

Les chapitres viennent des liens de la barre latérale du sommaire, **dans leur
ordre**. Le fil d'Ariane et le pied de page « chapitre suivant » portent la même
classe mais pas la même structure : ils sont écartés.

> **Pourquoi** — parcourir le dossier donnerait des fichiers dans l'ordre
> alphabétique, sans titres, et ramasserait des pages qui ne sont pas des
> chapitres. Et c'est l'ordre du sommaire qui fait foi, pas le nom du fichier :
> une autre source nommera autrement.

### 2.3 — Le suffixe de lettre fait partie de l'identité d'un chapitre

`chapter_31a` et `chapter_31b` sont **deux chapitres distincts** — mais ils
partagent un seul dossier de médias, `ch31`.

> **Pourquoi** — compter les figures par chapitre plutôt que par dossier de
> médias donnait 150 figures à un volume qui en a 137.
>
> **Figé par** — un test sur un volume portant deux chapitres au même numéro.

### 2.4 — Une source incomplète est signalée, jamais fatale

Une édition dont le dossier ou le sommaire manque est **ignorée**, avec un message
qui la nomme. Les autres continuent.

> **Pourquoi** — quinze éditions ne doivent pas tomber parce qu'une seule est en
> cours de rendu.

---

## 3. Compter les figures

### 3.1 — La narration fait foi. L'audio est un repli. La vidéo, jamais.

Le nombre de figures d'un chapitre est le nombre de fichiers de **narration** — le
texte dit par figure. Faute de narration, on compte l'audio. On ne compte
**jamais** la vidéo.

> **Pourquoi** — deux figures ont été enregistrées en double sous un second nom de
> fichier, mêmes octets. La vidéo annoncerait **385 figures là où il y en a 383**.
> Et un comptage adossé à un format devient faux le jour où ce format quitte le
> site : les comptages sont restés identiques au retrait de l'audio.
>
> **Figé par** — un test sur un ouvrage d'essai portant un doublon vidéo délibéré.

### 3.2 — Les noms de figure sortent de la référence de comptage

La liste des figures d'un chapitre est établie depuis le dossier de narration,
jamais depuis un dossier de média.

> **Pourquoi** — ainsi la liste ne bouge pas quand un format est retiré du site.

### 3.3 — Une figure s'identifie par son nom de base, pas par son numéro

L'ancre d'une figure sur la page de lecture porte son nom de fichier.

> **Pourquoi** — « fig1a » existe au chapitre 1 comme au chapitre 2. Une figure et
> sa vidéo partagent ce nom de base, si bien que les deux liens d'un PDF mènent au
> même endroit.

### 3.4 — Un écart entre les langues est signalé, pas corrigé

Si les éditions d'un volume ne s'accordent pas sur le nombre de chapitres ou de
figures, l'import le dit et poursuit.

> **Pourquoi** — c'est presque toujours un défaut de rendu en amont. Le corriger
> en silence masquerait le vrai problème.

---

## 4. L'index

L'index est l'unique autorité sur ce qui existe et sur ce qui est offert. Il est
**fabriqué sur le poste**, là où vit le quai, et **versionné dans le dépôt**. Le
site le charge au démarrage et ne lit jamais de disque.

### 4.1 — Aucun chemin ne vient d'une requête

Une adresse demandée est **cherchée dans l'index**, jamais concaténée à un chemin
ni à une clef de stockage. Une adresse absente de l'index n'atteint rien.

> **Pourquoi** — la traversée de répertoire devient impossible *par construction*,
> et non par filtrage. C'est la propriété la plus importante de tout le système.
>
> **Figé par** — des tests sur des adresses malicieuses, et un test qui vérifie
> qu'un fichier réellement présent mais non indexé répond 404.

### 4.2 — L'adresse garde la forme d'un chemin

`<clef d'œuvre>/<langue>/<chemin dans le volume>`. Cette adresse est aussi la clef
du fichier dans le stockage objet.

> **Pourquoi** — une page de chapitre appelle ses images en relatif et ses feuilles
> en `../`. Un identifiant opaque casserait ces liens. La sécurité ne repose pas
> sur la forme de l'adresse, mais sur son appartenance à l'index.

### 4.3 — Ce qui est offert l'est par déduction, pas par liste

Sont offerts : le sommaire du volume, la préface, les pages des chapitres offerts
— et **les fichiers que ces pages appellent pour s'afficher**, relevés en lisant
la page. Une page de chapitre non offerte reste réservée même si une page offerte
y renvoie.

> **Pourquoi** — le sommaire cite tous les chapitres ; un lecteur doit voir ce
> qu'il obtiendrait. Et déclarer à la main les dépendances d'une page serait faux
> dès le premier rendu.
>
> **Figé par** — un test qui vérifie qu'un chapitre cité par le sommaire mais non
> offert répond 403, et non 404.

### 4.4 — La narration est indexée, pas seulement lue

Les fichiers de narration entrent dans l'index, au même niveau d'accès que leur
chapitre.

> **Pourquoi** — c'est la narration qui énumère les figures. Un serveur qui ne
> l'aurait pas n'afficherait *aucune vidéo*, même en ayant les fichiers.

### 4.5 — L'index porte aussi les fiches du catalogue

Titre, identifiant d'adresse, description, prix, sommaire, badges de format : tout
est calculé à la fabrication et rangé dans l'index. **Il n'existe pas de table des
ouvrages.**

> **Pourquoi** — c'est le défaut central de l'ancien code : un ouvrage y existait
> en trois exemplaires, et deux scripts servaient à les tenir d'accord. Une seule
> vérité, une seule dérivation.

### 4.7 — Un média appelé depuis le dossier d'une page renvoie à son adresse canonique

Une page de chapitre calcule l'adresse de ses vidéos en relatif, depuis son
dossier : `chapitres_fr/media/video/ch01/…`. Les médias vivent à l'ouvrage, et
l'index les connaît à `media/video/ch01/…` de l'édition. La porte renvoie de l'une
à l'autre — si l'adresse canonique est indexée, dans la même édition — et le droit
s'y vérifie comme pour tout fichier.

> **Pourquoi** — sans ce renvoi, aucune vidéo de figure ne se lisait : la page
> recevait un 404 et se rabattait en silence sur l'image agrandie. L'adresse
> calculée vit dans le script de la page, pas dans son balisage : la lecture de la
> page (règle 4.3) ne pouvait pas la relever.

### 4.6 — La fabrication inspecte le quai et dit ce qui cloche

Elle ne va rien chercher : elle regarde ce qui est posé et le nomme.

```
Volume III français : la vidéo du chapitre 7 manque.
Volume I : le PDF est plus ancien que le site HTML — le quai est en retard.
Volume II espagnol : 42 figures, contre 43 en français et en anglais.
```

> **Pourquoi** — le quai est rempli à la main, et **rien ne dit qu'il est resté en
> arrière** quand un volume est refabriqué. Un portier qui inspecte la livraison,
> pas un camion qui va à l'atelier.
>
> **Figé par** — un test qui retire un fichier d'un quai d'essai et vérifie que la
> fabrication le nomme, sans échouer sur le reste.

---

## 5. Le droit de lire

La décision, en quatre questions :

1. **L'entrée est-elle offerte ?** → oui : lecture libre, sans compte.
2. **Un visiteur est-il connecté ?** → non : **403**.
3. **Est-il administrateur ?** → oui : il lit tout, sinon il ne pourrait pas
   vérifier ce qu'il publie.
4. **La portée déclarée par l'ouvrage** :
   - `work` — une commande validée sur **n'importe quelle langue** du volume ;
   - `edition` — une commande validée sur **cette langue** seulement.

   Trouvée : oui. Sinon : **403**.

### 5.1 — Un compte gratuit ne donne rien de plus qu'un visiteur

Seule une commande validée ouvre un volume.

### 5.2 — Ce qui est offert se lit en ligne, il ne s'emporte pas

Un visiteur obtient les chapitres offerts sur la page de lecture — texte, figures
et vidéos — et **aucun fichier**. La page ne porte pas un seul lien vers un PDF ;
les PDF du volume y sont nommés et marqués « Réservé ».

> **Pourquoi** — décision de l'éditeur. Un acheteur, lui, garde ses
> téléchargements : c'est ce que sa fiche lui promet.
>
> **Figé par** — un test qui compte les liens vers un fichier sur la page de
> lecture vue par un visiteur : zéro.

### 5.3 — Une page montre, elle n'accorde pas

La page de lecture est ouverte à tous et montre le volume entier, y compris ce qui
est réservé. **Chaque fichier revérifie** au moment d'être servi. Un lien affiché,
deviné ou partagé ne donne aucun accès.

### 5.4 — Une seule porte vers les fichiers

Tout fichier d'ouvrage passe par la même adresse et le même contrôle. Aucune
seconde voie, jamais, sous aucun prétexte.

> **Pourquoi** — l'ancienne page d'extraits en avait ouvert une : elle servait des
> médias hors index et sans aucun contrôle. Elle n'ouvrait rien d'interdit, mais
> c'était une seconde manière d'atteindre des fichiers.

### 5.5 — Le rôle se relit à chaque requête

Le rôle et l'état d'un compte sont relus depuis la base à chaque requête d'un
utilisateur connecté, jamais tirés de la session.

> **Pourquoi** — sinon un administrateur rétrogradé garderait ses droits jusqu'à
> l'expiration de sa session.
>
> **Figé par** — un test qui rétrograde un compte en cours de session et vérifie
> la perte d'accès immédiate.

### 5.6 — Une commande désigne un ouvrage par son identifiant d'adresse

Pas par une clef de ligne en base.

> **Pourquoi** — l'identifiant d'adresse est stable et se recalcule à l'identique
> depuis le manifeste. Une clef de ligne rendait toute régénération du catalogue
> capable de rompre en silence l'accès d'un acheteur à ce qu'il avait payé.

### 5.7 — Un contenu payé ne se met pas en cache

Part offerte : cache public d'une heure. Contenu réservé : `private, no-store`.

> **Pourquoi** — ni le cache d'un navigateur partagé ni celui d'un intermédiaire
> ne doivent le conserver.

---

## 6. La chaîne PDF

### 6.1 — Le découpage se fait par redessin, pas par extraction de pages

Un extrait se découpe avec `pdftocairo`.

> **Pourquoi** — `pdfseparate` puis `pdfunite` recopie les ressources partagées
> dans chaque page : **194 Mo pour 36 pages**, contre 11,8 Mo par la bonne méthode.

### 6.2 — Les liens sont reconstruits, jamais copiés

Le redessin perd les annotations. Les liens sont regreffés à partir de la source,
**rectangle et adresse, rien d'autre**.

> **Pourquoi** — un objet copié depuis un autre document y reste rattaché et traîne
> ses dépendances : l'extrait passait de 11 à 38 Mo. Les liens internes restent
> écartés : ils désignent des pages absentes de l'extrait.

### 6.3 — La borne de découpe se cherche, elle ne se devine pas

On cherche la page qui *commence* par le titre du deuxième chapitre, titre lu dans
le sommaire du site HTML.

> **Pourquoi** — ces PDF n'ont aucun signet. Et une occurrence dans la table des
> matières ne trompe pas la détection : elle n'y est jamais en tête de page.

### 6.4 — Une adresse gravée dans un PDF n'est jamais devinée

Chaque lien réécrit est vérifié contre l'index. Un lien que l'index ne reconnaît
pas est **laissé tel quel et signalé**. Le domaine est un paramètre **sans valeur
par défaut** : sans lui, les scripts refusent de tourner, et une adresse locale est
refusée explicitement.

> **Pourquoi** — un lien inventé répondrait 404 dans un fichier distribué. Et
> graver `localhost` dans des PDF remis à des acheteurs serait pire que de ne rien
> faire.

### 6.5 — Un extrait vise la figure, un PDF d'acheteur vise le fichier

Les extraits circulent librement : leurs boutons « Voir la vidéo » mènent à
l'**ancre de la figure** sur la page de lecture. Les PDF complets vont à des
acheteurs : leurs liens mènent au fichier.

> **Pourquoi** — un bouton qui ouvre le fichier vidéo donne le lecteur natif du
> navigateur, avec son bouton d'enregistrement : la part offerte se récupérerait
> d'un clic.

### 6.6 — Les masters de l'éditeur ne sont jamais écrasés

La réécriture des liens écrit dans un dossier d'attente. La promotion reste un
geste de l'éditeur.

> **Pourquoi** — ce sont les fichiers de production de la maison. Et un master
> remis à un acheteur ne doit pas désigner un hôte de recette.

### 6.7 — L'extrait servi est un dérivé du site, jamais le fichier livré

L'extrait posé sur le quai garde les liens de l'atelier. Le site en fabrique une
copie aux liens réécrits (`npm run extraits`) dans `derives/`, hors dépôt et hors
quai — le quai reste en lecture seule. **Seule cette copie entre dans l'index** ;
un extrait livré mais pas encore relié n'est servi à personne, et le rapport le
dit. Un extrait relié plus ancien que sa livraison est signalé, et n'est plus servi.

> **Pourquoi** — l'extrait livré désigne le miroir de l'atelier, qui disparaîtra.
> Le servir tel quel distribuerait des liens morts dans un fichier qu'on ne peut
> plus corriger une fois téléchargé.

---

# Seconde partie — l'application

## 7. Les adresses et les langues

### 7.1 — Chaque langue a de vraies adresses, traduites

`/fr/catalogue`, `/es/catalogo`, `/fr/lire/…`, `/en/read/…`. Les segments sont
déclarés en **un seul endroit** ; aucun gabarit n'écrit une adresse à la main.

> **Pourquoi** — un segment d'une autre langue ne doit correspondre à rien, et
> donner un 404 franc plutôt qu'une page servie sous une adresse qui n'existe pas
> dans cette langue.
>
> **Figé par** — `tests/unit/segments.test.ts`.

### 7.2 — Les adresses de contenu n'ont pas de préfixe de langue

L'adresse d'un fichier porte déjà sa langue, à l'intérieur.

> **Pourquoi** — une page de chapitre appelle ses images en relatif : un préfixe
> les casserait.

### 7.3 — Trois choses distinctes, à ne pas confondre

| | Ce que c'est | Où ça vit |
|---|---|---|
| chaînes d'interface | « Rechercher », « Se connecter » | dictionnaires versionnés |
| contenu éditorial | accroches, textes de pages | fichiers versionnés, lus au démarrage |
| segments d'adresse | `catalogue` / `catalogo` | la table des segments |

### 7.4 — Le sélecteur de langue mène à la même page traduite

Depuis une fiche, changer de langue mène à la **même fiche** dans l'autre langue —
jamais à l'accueil. Une fiche demandée sous un préfixe qui n'est pas le sien
redirige vers son édition dans la langue courante, ou répond 404.

> **Figé par** — `tests/unit/segments.test.ts`.

---

## 8. Le catalogue et la lecture

### 8.1 — Le catalogue ne montre qu'une langue

Celle de la page.

> **Pourquoi** — sans ce filtre, un visiteur francophone verrait chaque ouvrage
> autant de fois qu'il a de langues.

### 8.2 — Les prix sont des entiers, formatés à l'affichage

Stockés en centimes. Une seule fonction produit la valeur affichable, et les
gabarits n'ont pas accès au brut. Chaque langue écrit les montants à sa manière.

> **Pourquoi** — l'audit avait relevé des « 4900.00 € » affichés à la place de
> « 49,00 € », parce qu'un gabarit court-circuitait le formatage.

### 8.3 — Les formats sont des badges, pas des articles

PDF, vidéo, audio s'affichent sur une fiche mais ne se vendent pas séparément.
**Le volume est le seul choix qui compte** — la langue n'en est pas un lorsque la
portée est `work`.

### 8.4 — Ce qui porte des liens est relayé. Le poids est redirigé.

Après vérification du droit, deux manières de livrer :

| | Ce que c'est | Comment |
|---|---|---|
| **relayé** | les pages, les feuilles de style, les scripts, les polices, les textes de narration — et les couvertures | l'application va chercher les octets et les rend sous sa propre adresse |
| **redirigé** | les images des pages, les vidéos, l'audio, les PDF | une **redirection vers une adresse signée** du site de fichiers |

L'adresse signée vaut quelques minutes — **quatre heures pour la vidéo et
l'audio**, dont chaque plage revient avec la même adresse.

> **Pourquoi** — un navigateur résout les liens relatifs d'une page, *et les
> `url(…)` d'une feuille de style*, contre l'adresse où il les a finalement
> reçues. Redirigé, un tel fichier enverrait ses images et ses polices droit au
> site de fichiers, **hors de tout contrôle d'accès** — et elles échoueraient,
> faute d'être signées. C'est l'endroit de l'architecture qui casserait en
> silence. La première rédaction ne relayait que les pages : `bootstrap-icons.css`
> aurait perdu ses icônes.
>
> Ce qu'une page lit par script (la narration), et les polices, demanderaient en
> outre des en-têtes CORS au site de fichiers. Les couvertures, enfin, sont lues
> par l'optimiseur d'images de Next, qui ne suit pas une redirection. Tout cela
> pèse quelques mégaoctets ; les gigaoctets sont dans ce qui est redirigé.
>
> Une signature de cinq minutes couperait une vidéo mise en pause pendant six :
> le lecteur redemande une plage à chaque avancée.
>
> **Figé par** — `tests/unit/porte-livraison.test.ts` : une page de chapitre
> offerte, relayée, dont chaque image repasse par la porte unique ; une feuille
> relayée dont la police reste sous la porte.

### 8.5 — Rien n'est chargé avant le clic

Une figure est une vignette, qui est un lien. Le seul lecteur vidéo de la page est
celui de la fenêtre, et sa source n'est posée qu'à l'ouverture, puis retirée à la
fermeture. **Sans JavaScript, la vignette reste un lien qui fonctionne.**

> **Pourquoi** — un volume compte jusqu'à 137 figures : autant de lecteurs dans la
> page serait intenable.

### 8.6 — Une figure dont l'illustration manque garde son encombrement

Un aplat tient la place.

> **Pourquoi** — sinon la grille se réorganise au chargement.

---

## 9. Comptes, commandes, sessions

### 9.1 — Deux tables, et rien d'autre

Les comptes et les commandes. Le catalogue vient de l'index, le contenu éditorial
des fichiers, les sessions d'un cookie signé.

> **Conséquence à préserver** — un visiteur anonyme ne fait **aucune requête en
> base**. Tout le parcours public tient sans elle.

### 9.2 — Le leurre de comparaison doit être un vrai condensat

Lorsqu'un compte n'existe pas, la vérification du mot de passe se fait contre un
condensat **réellement calculé**.

> **Pourquoi** — un projet antérieur comparait à une chaîne qui n'était pas un
> condensat valide : la vérification échouait immédiatement au lieu de calculer, et
> la réponse était nettement plus rapide pour une adresse inconnue. Le dispositif
> révélait exactement ce qu'il prétendait cacher.

### 9.3 — La déconnexion est une action, pas un lien

Ni un lien ni une image ne peuvent déconnecter un visiteur.

### 9.4 — L'espace personnel liste ce que la portée ouvre réellement

Sous la portée `work`, un membre qui a acheté une édition peut en lire trois.
L'espace personnel doit le montrer.

> **Pourquoi** — ce n'est pas une faille, il y a droit. Mais dans l'ancien site
> c'était une promesse tenue en silence : les éditions payées sans le savoir
> n'étaient accessibles qu'en connaissant leur adresse.

---

## 10. La mise en ligne

### 10.1 — Le dépôt est la seule mémoire durable

Le serveur est reconstruit à chaque déploiement. Rien de ce qu'il écrit sur son
disque ne survit — donc **il n'écrit rien**.

### 10.2 — Le versement ne transporte que ce que l'index connaît

Et il se fait par niveau : la part offerte d'abord, le réservé le jour où
quelqu'un pourra l'acheter.

> **Pourquoi** — la protection la plus sûre reste de ne pas envoyer ce qui n'est
> pas offert.

### 10.3 — La vérification qui compte est le 403

Après chaque mise en ligne : une page de lecture répond 200, un chapitre offert
répond 200, et **un fichier réservé qui est réellement présent** répond 403.

> **Pourquoi** — viser un fichier absent donnerait 404, ce qui est sûr mais ne
> prouve rien sur le contrôle d'accès.

### 10.4 — Une recette ne s'indexe pas

Tant que le site n'est pas ouvert : indexation fermée côté application, et en-tête
d'exclusion côté frontal. **Les deux ensemble**, et vérifiés ensemble après toute
modification.

> **Pourquoi** — deux sites au contenu identique se feraient concurrence dans les
> résultats de recherche. Un réglage se désactive par mégarde, un en-tête se perd
> dans une reconfiguration.

---

## 11. L'interface

### 11.1 — L'identité du site archivé est reprise ; le code est écrit de zéro

Mêmes couleurs, mêmes typographies, même mise en page, mégamenus compris. **Aucune
ligne de style n'est recopiée** : le site archivé sert de référence visuelle, on le
lance à côté et on compare.

> **Pourquoi** — le design avait été travaillé et validé ; ce n'était pas lui le
> problème. Mais le balisage devient des composants, donc un transport à
> l'identique aurait de toute façon demandé d'être adapté.

### 11.2 — Ce que les mégamenus doivent faire

- le panneau **utilise réellement `hidden`** — une règle CSS l'annulait, et les
  lecteurs d'écran lisaient le menu fermé ;
- `aria-expanded` et `aria-controls` sur le déclencheur ;
- fermeture au clavier ;
- **sur mobile, la barre se replie et le choix de langue passe dans le menu** ;
- le sélecteur de langue est un `role="group"`, avec `aria-current` sur la langue
  active.

> **Pourquoi** — ce sont exactement les comportements qui se perdent dans une
> réécriture, parce qu'ils ne se voient pas sur une capture d'écran.

### 11.3 — La charte n'est plus modifiable en ligne

Elle venait du contenu éditorial par variables CSS. Elle est désormais dans le
code : la changer est un commit.

---

## Ce qui reste ouvert

**Le paiement** n'est pas branché. Une commande passe en « validée » à la main. Le
jour où il arrive, rien ne change ici : le droit de lire lit déjà l'état de la
commande.

**Les audios de chapitre** doivent remplacer l'audio par figure, retiré du site.
Leur emplacement n'est pas arrêté ; l'indexation devra être rouverte quand il le
sera.

**Les légendes de figure** — la première phrase de la narration, déjà rédigée —
n'ont jamais été affichées ailleurs que sur une page aujourd'hui supprimée.
L'index connaît ces fichiers : il ne lui manque que d'en lire la première phrase.

**Un thème sombre** et **une discipline responsive explicite** : deux choses que le
site archivé n'avait pas tranchées. À décider avec les pages.

**Le miroir ouvert** sert encore les ouvrages entiers sans authentification. Plus
aucun PDF n'y renvoie, mais tant qu'il est debout, le contrôle d'accès de ce site
est contournable par une adresse devinée.
