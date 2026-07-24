# 🗻 Guide de voyage — Vacances au Japon

Carnet de voyage en ligne pour la famille : préparation du voyage au Japon
(Yonezawa) en septembre 2026, planning collaboratif, photos, et petites
astuces pratiques.

**🔗 Site en ligne (privé, connexion Google requise) :**
https://louloubib-carnet-voyage-japon.hf.space

> L'ancienne version publique sur GitHub Pages a été désactivée (voir
> [Hébergement](#hébergement) ci-dessous) — le contenu du site n'est plus
> visible que par les adresses Gmail autorisées.

## Structure du projet

```
index.html    → tout le contenu et la structure des sections
style.css     → mise en page, couleurs, animations
script.js     → défilement, calendrier/planning, identité/stats, glisser-déposer, chargement des images
images/       → photos ; voir images/README.md pour la liste des emplacements
audio/        → clips audio de prononciation japonaise
apps-script/  → backend du planning/checklist/stats (voir plus bas)
```

C'est un site statique pur (pas de build, pas de dépendances côté front) :
seul l'hébergement (voir plus bas) ajoute une couche d'authentification
devant.

## Aperçu en local

```bash
python3 -m http.server 8934
```
puis ouvrir http://localhost:8934

En local, la connexion Google n'existe pas : le site retombe automatiquement
sur la petite pop-up « Qui êtes-vous ? » pour choisir un prénom.

## Modifier le contenu

- **Texte** : tout est directement dans `index.html`, organisé par section (`<section id="...">`).
- **Images** : voir `images/README.md` pour la liste des emplacements et des noms de fichiers attendus. Il suffit de déposer une photo avec le bon nom dans `images/`, elle apparaît automatiquement.
- Après une modif de `style.css`, penser à incrémenter le `?v=` du lien `<link rel="stylesheet">` dans `index.html` pour forcer les navigateurs à recharger la nouvelle version (même chose pour `script.js`).

## Hébergement

Le site tourne sur un **Hugging Face Space** (`ebook-space/`, dépôt séparé),
protégé par connexion Google — voir `ebook-space/README.md` pour la mise en
place complète (identifiant OAuth, secrets, déploiement).

Ce dépôt-ci (`ebook/`) est la source de vérité pour le contenu du site
(`index.html`, `style.css`, `script.js`, `images/`, `audio/`). Après une
modification, il faut la recopier manuellement dans `ebook-space/site/` puis
la pousser sur le Space :

```bash
cp index.html script.js style.css ../ebook-space/site/
cd ../ebook-space
git add site/
git commit -m "message"
git push space main
```

Les images/audio sont suivis via **Git LFS** côté `ebook-space` (Hugging
Face refuse les gros fichiers binaires en Git classique) — `git lfs install`
une fois, puis les commandes ci-dessus suffisent.

## Identité (qui utilise le site)

Chaque adresse Gmail autorisée est associée à un prénom + une photo de
profil dans `script.js` (`AUTH_EMAIL_TO_NAME` et `FAMILY_FACES`, tout en
haut du fichier). À la connexion, le site reconnaît automatiquement la
personne (avatar en haut à droite, nom pré-rempli dans le planning) — pas de
re-saisie à chaque visite.

**Pour ajouter quelqu'un de nouveau :**

1. Ajouter son email → prénom dans `AUTH_EMAIL_TO_NAME` (`script.js`).
2. Ajouter sa photo dans `images/` et l'entrée correspondante dans `FAMILY_FACES`.
3. Ajouter son email dans le secret `ALLOWED_EMAILS` du Space (Hugging Face → Settings → Variables and secrets).
4. Ajouter son email comme « Utilisateur test » dans Google Cloud Console → Google Auth Platform → Audience (tant que l'app OAuth est en mode Test, seules ces adresses peuvent se connecter).

## Calendrier interactif, idées en vrac, checklist, stats

Chaque date du 3 au 23 septembre est cliquable et affiche un panneau où
toute la famille peut proposer des idées pour ce jour-là (catégorie libre +
émoji au choix + description), réordonnables par glisser-déposer. Un panneau
« Idées en vrac » permet aussi de proposer des idées sans date précise.
Dans « Administratif », une checklist personnelle (par personne) permet de
cocher les démarches faites. Le profil (avatar en haut à droite) affiche des
statistiques d'activité (évènements/idées ajoutés-supprimés, temps passé) et
un petit classement entre membres de la famille.

Comme le site est statique (pas de serveur), le partage entre navigateurs se
fait via un **Google Apps Script déployé en Web App**, lié à une Google
Sheet. Il gère à la fois les entrées du planning, la checklist et les
statistiques (3 onglets séparés dans la Sheet : `Entries`, `Checklist`,
`Stats`, créés automatiquement au premier appel).

**Configuration (`script.js`, objet `DAY_PLANNER_CONFIG` en haut du fichier) :**

1. Créer une nouvelle Google Sheet (ou réutiliser une existante).
2. Dans la Sheet : menu **Extensions → Apps Script**.
3. Supprimer le code d'exemple, coller le contenu de [`apps-script/Code.gs`](apps-script/Code.gs) de ce dépôt.
4. **Déployer → Nouveau déploiement** :
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Cliquer sur Déployer, autoriser les permissions demandées (accès à cette Sheet, et accès réseau externe pour la galerie photo iCloud — voir plus bas).
6. Copier l'URL du déploiement (elle se termine par `/exec`).
7. Envoyer cette URL à Claude, qui la mettra dans `DAY_PLANNER_CONFIG.apiUrl`.

Tant que ce n'est pas configuré, les panneaux affichent un message « pas
encore configurée » au lieu de planter.

Si vous modifiez `apps-script/Code.gs` plus tard, il faut redéployer
(**Déployer → Gérer les déploiements → ✏️ → Nouvelle version**) pour que les
changements prennent effet — éditer le fichier seul ne suffit pas.

## Galerie photo (album iCloud partagé)

La section « Photos » affiche en direct les photos de l'album iCloud
partagé « Japon Prasz » (n'importe qui peut y ajouter des photos depuis
l'app Photos de son téléphone). Comme l'API d'Apple ne peut pas être
appelée directement depuis le navigateur (pas de CORS), le même Apps
Script sert de relais (voir `ICLOUD_ALBUM_TOKEN` dans `Code.gs`), avec un
cache de 5 minutes pour rester rapide.

## Publier les changements

1. Modifier les fichiers dans ce dépôt (`ebook/`).
2. Recopier les fichiers changés dans `ebook-space/site/` (voir
   [Hébergement](#hébergement) ci-dessus).
3. Pousser sur GitHub (`ebook/`, historique/sauvegarde) **et** sur le Space
   Hugging Face (`ebook-space/`, ce qui met vraiment à jour le site en ligne).

Compter 30 à 60 secondes après le push sur le Space pour que le site en
ligne reflète les changements (le temps que le Space rebuild son image
Docker).
