# 🗻 Guide de voyage — Vacances au Japon

Petit e-book en ligne pour préparer la venue de la famille au Japon (Yonezawa) en septembre 2026 : infos pratiques, transports, administratif, climat, et codes culturels.

**🔗 Site en ligne :** https://louisapraszezynki.github.io/japan-guide-family/

## Structure du projet

```
index.html    → tout le contenu et la structure des sections
style.css     → mise en page, couleurs, animations
script.js     → défilement, calendrier/planning, glisser-déposer, chargement des images
images/       → photos ; voir images/README.md pour la liste des emplacements
apps-script/  → backend du planning interactif (voir la section dédiée plus bas)
```

C'est un site statique pur (pas de build, pas de dépendances) : on peut l'ouvrir directement dans un navigateur ou le servir avec n'importe quel serveur local.

## Aperçu en local

```bash
python3 -m http.server 8934
```
puis ouvrir http://localhost:8934

## Modifier le contenu

- **Texte** : tout est directement dans `index.html`, organisé par section (`<section id="...">`).
- **Images** : voir `images/README.md` pour la liste des emplacements et des noms de fichiers attendus. Il suffit de déposer une photo avec le bon nom dans `images/`, elle apparaît automatiquement.
- Après une modif de `style.css`, penser à incrémenter le `?v=` du lien `<link rel="stylesheet">` dans `index.html` pour forcer les navigateurs à recharger la nouvelle version (même chose pour `script.js`).

## Calendrier interactif (idées du jour)

Chaque date du 3 au 23 septembre est cliquable et affiche, juste à côté du calendrier, un panneau où toute la famille peut proposer des idées pour ce jour-là (catégorie libre + émoji au choix + description), et les réordonner par glisser-déposer — aussi bien dans le panneau du jour que dans la vue par semaine. Un badge numéroté apparaît sur les dates qui ont déjà des propositions.

Comme le site est statique (pas de serveur), le partage entre navigateurs se fait via un **Google Apps Script déployé en Web App**, lié à une Google Sheet. Contrairement à un Google Form (qui ne peut qu'ajouter des lignes), Apps Script peut aussi les modifier — indispensable pour que le glisser-déposer soit sauvegardé et visible par tout le monde.

**Configuration (`script.js`, objet `DAY_PLANNER_CONFIG` en haut du fichier) :**

1. Créer une nouvelle Google Sheet (ou réutiliser une existante).
2. Dans la Sheet : menu **Extensions → Apps Script**.
3. Supprimer le code d'exemple, coller le contenu de [`apps-script/Code.gs`](apps-script/Code.gs) de ce dépôt.
4. **Déployer → Nouveau déploiement** :
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
5. Cliquer sur Déployer, autoriser les permissions demandées (accès à cette Sheet uniquement).
6. Copier l'URL du déploiement (elle se termine par `/exec`).
7. Envoyer cette URL à Claude, qui la mettra dans `DAY_PLANNER_CONFIG.apiUrl`.

Le script crée automatiquement un onglet « Entries » dans la Sheet au premier appel — aucune structure de colonnes à préparer à la main.

Tant que ce n'est pas configuré, le panneau affiche un message « pas encore configurée » au lieu de planter.

Si vous modifiez `apps-script/Code.gs` plus tard, il faut redéployer (**Déployer → Gérer les déploiements → ✏️ → Nouvelle version**) pour que les changements prennent effet — éditer le fichier seul ne suffit pas.

## Publier les changements

Le site se met à jour automatiquement via GitHub Pages après un push sur `main` :

```bash
git add -A
git commit -m "message"
git push
```

Compter 30 à 60 secondes pour que le site en ligne reflète les changements.
