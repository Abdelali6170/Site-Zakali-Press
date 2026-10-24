# Le site de fichiers

Les livres ne peuvent pas vivre sur la Web App : son disque est reconstruit à
chaque déploiement, elle se déploie depuis GitHub où les livres n'entrent
jamais, et elle coupe une requête à 120 s. Ils vivent donc sur un **site
PHP/HTML** de la même offre Hostinger, au disque permanent.

Ce site ne décide d'aucun droit. Le site Zakali Press vérifie le droit contre
l'index, puis signe une adresse ; `porte.php` vérifie la signature et sert le
fichier. **Rien d'autre n'en sort.**

```
/home/<compte>/domains/<site de fichiers>/
  public_html/
    porte.php                   ← ce dossier, déployé à la main
    .htaccess                   ← envoie toute requête à porte.php
  zakali-fichiers.config.php    ← le secret ; HORS de public_html, jamais versionné
  livres/                       ← les livres, HORS de public_html
    biology-2e-vol-1/fr/index.html
    …                           ← chaque fichier sous son adresse d'index (règle 4.2)
```

## Les gestes de l'éditeur, dans hPanel

1. **Créer le site.** *Sites web → Ajouter un site web → Site PHP/HTML vide.*
   Prendre le domaine temporaire que Hostinger propose (`…hostingersite.com`) :
   il servira jusqu'à ce que `zakalipress.com` soit chez Hostinger. Noter ce
   domaine.
2. **PHP 8.2 ou plus récent.** *Avancé → Configuration PHP.*
3. **Ranger les fichiers.** *Gestionnaire de fichiers*, dans
   `domains/<site de fichiers>/` :
   - créer le dossier `livres/`, **à côté** de `public_html`, pas dedans ;
   - dans `public_html/`, supprimer la page par défaut, puis déposer
     `porte.php` et `.htaccess` de ce dossier ;
   - à côté de `public_html`, créer `zakali-fichiers.config.php` à partir de
     `zakali-fichiers.config.exemple.php` : le secret, et le chemin absolu de
     `livres/` (`/home/<compte>/domains/<site de fichiers>/livres`).
4. **Vérifier la porte, avant tout versement** :
   - `https://<site de fichiers>/` répond **403** « Refuse. » — la porte est en place ;
   - `https://<site de fichiers>/livres/` répond **403** aussi : rien ne se liste ;
   - une réponse 503 « non configuré » : le fichier de configuration n'est pas
     à sa place, ou le chemin des livres est faux.
5. **Donner le secret à la Web App** : `FICHIERS_URL=https://<site de fichiers>`
   et le même `FICHIERS_SECRET`.

Le secret se génère sur le poste, et ne s'écrit que dans ces deux endroits —
jamais dans le dépôt, ni dans une conversation :

```
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Verser les livres

Depuis le poste, où vivent le quai et `derives/`, par SFTP :

1. Dans hPanel, *Avancé → Accès SSH* : activer l'accès, et noter l'hôte, le
   port (65002), l'utilisateur et le mot de passe.
2. Les reporter dans le `.env` du poste (`VERSEMENT_*`, voir `.env.example`).
   `VERSEMENT_DOSSIER` est le chemin absolu de `livres/`.
3. Lancer :

```
npm run verser                   # à blanc : compare, et dit ce qui partirait
npm run verser -- --appliquer    # envoie la part offerte
```

Seul ce que l'index connaît part, à son adresse d'index, et seulement ce qui a
changé. Le réservé ne part qu'avec `--niveau reserve`, le jour où la vente
existe (règle 10.2). Rien n'est jamais effacé là-bas.

**Verser avant de pousser** : le site déployé signe ce que dit son index ; un
fichier que l'index connaît et qui n'est pas encore versé répond 404.

## Changer de domaine

`FICHIERS_URL` est lue à l'exécution et n'est gravée dans aucun fichier : le
jour où le site de fichiers passe sous `zakalipress.com`, on change la variable
de la Web App, et rien d'autre.

## Mettre à jour la porte

`porte.php` est versionné ici et déployé à la main. Après toute modification,
le redéposer dans `public_html/`. Ses tests (`tests/unit/porte-fichiers.test.ts`)
tournent dès que PHP est présent sur le poste (`PHP_BIN`).
