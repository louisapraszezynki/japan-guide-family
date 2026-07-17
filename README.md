# 🗻 Guide de voyage — Vacances au Japon

Petit e-book en ligne pour préparer la venue de la famille au Japon (Yonezawa) en septembre 2026 : infos pratiques, transports, administratif, climat, et codes culturels.

**🔗 Site en ligne :** https://louisapraszezynki.github.io/japan-guide-family/

## Structure du projet

```
index.html   → tout le contenu et la structure des sections
style.css    → mise en page, couleurs, animations
script.js    → défilement, calendrier/compte à rebours, chargement des images
images/      → photos ; voir images/README.md pour la liste des emplacements
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

Chaque date du 3 au 23 septembre est cliquable et ouvre une fenêtre où toute la famille peut proposer des idées pour ce jour-là. Comme le site est statique (pas de serveur), le partage entre les navigateurs se fait via un Google Form (écriture) + Google Sheet (lecture) — gratuit, sans backend à héberger.

**Configuration (`script.js`, objet `DAY_PLANNER_CONFIG` en haut du fichier) :**

1. Créer un Google Form avec exactement 3 questions, dans cet ordre :
   1. `Date` (réponse courte)
   2. `Prénom` (réponse courte)
   3. `Idée / événement` (paragraphe)
2. Dans l'onglet Réponses du Form, cliquer sur l'icône Sheets pour créer la feuille de calcul liée.
3. Partager cette Sheet en « Toute personne disposant du lien → Lecteur ».
4. Récupérer :
   - `sheetId` : dans l'URL de la Sheet, la partie entre `/d/` et `/edit`
   - `formAction` : l'URL du Form (celle qui finit par `/viewform`), en remplaçant `viewform` par `formResponse`
   - `entryDate`, `entryName`, `entryText` : ouvrir le Form, menu ⋮ → « Obtenir le lien prérempli », remplir chaque champ avec une valeur différente et facile à repérer, générer le lien, puis relever les `entry.XXXXXXXXX` qui correspondent à chaque champ dans l'URL générée
5. Remplacer les 5 valeurs `REPLACE_...` dans `DAY_PLANNER_CONFIG`.

Tant que ce n'est pas configuré, la fenêtre affiche un message « pas encore configurée » au lieu de planter.

## Publier les changements

Le site se met à jour automatiquement via GitHub Pages après un push sur `main` :

```bash
git add -A
git commit -m "message"
git push
```

Compter 30 à 60 secondes pour que le site en ligne reflète les changements.
