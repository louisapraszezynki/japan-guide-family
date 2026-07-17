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

Chaque date du 3 au 23 septembre est cliquable et affiche, juste à côté du calendrier, un panneau où toute la famille peut proposer des idées pour ce jour-là (avec un moment de la journée + une catégorie, colorée selon le type). Un badge numéroté apparaît sur les dates qui ont déjà des propositions. Comme le site est statique (pas de serveur), le partage entre les navigateurs se fait via un Google Form (écriture) + Google Sheet (lecture) — gratuit, sans backend à héberger.

**Configuration (`script.js`, objet `DAY_PLANNER_CONFIG` en haut du fichier) :**

1. Créer un Google Form avec exactement 6 questions, dans cet ordre :
   1. `Date` (réponse courte)
   2. `Prénom` (réponse courte)
   3. `Idée / événement` (paragraphe)
   4. `Moment` (réponse courte)
   5. `Catégorie` (réponse courte)
   6. `Emoji personnalisé` (réponse courte) — utilisé quand la catégorie tapée n'est ni « Nourriture » ni « Activité »

   ⚠️ L'ordre d'apparition dans le Sheet suit l'ordre de **création** des questions, pas leur ordre d'affichage dans le Form — donc si on réorganise les questions après coup, les colonnes du Sheet ne bougent pas. Le code lit les colonnes par position (`Idée` = colonne D, `Moment` = colonne E, `Catégorie` = colonne F, `Emoji personnalisé` = colonne G), donc mieux vaut les créer dans cet ordre dès le départ.
2. Dans l'onglet Réponses du Form, cliquer sur l'icône Sheets pour créer la feuille de calcul liée.
3. Partager cette Sheet en « Toute personne disposant du lien → Lecteur ».
4. Récupérer :
   - `sheetId` : dans l'URL de la Sheet, la partie entre `/d/` et `/edit`
   - `formAction` : l'URL du Form (celle qui finit par `/viewform`), en remplaçant `viewform` par `formResponse`
   - `entryDate`, `entryName`, `entryText`, `entryTime`, `entryCategory`, `entryEmoji` : demander à Claude de les récupérer directement depuis la page du Form (pas besoin de lien prérempli manuel), ou ouvrir le Form, menu ⋮ → « Obtenir le lien prérempli », remplir chaque champ avec une valeur différente et facile à repérer, générer le lien, puis relever les `entry.XXXXXXXXX` correspondants dans l'URL générée
5. Remplacer les valeurs `REPLACE_...` dans `DAY_PLANNER_CONFIG`.

Tant que ce n'est pas configuré, le panneau affiche un message « pas encore configurée » au lieu de planter.

Les propositions de "Moment" et "Catégorie" sur le site (menu déroulant suggéré) sont juste des suggestions — n'importe quel texte libre est accepté et affiché (catégories inconnues affichées avec la couleur "personnalisé").

## Publier les changements

Le site se met à jour automatiquement via GitHub Pages après un push sur `main` :

```bash
git add -A
git commit -m "message"
git push
```

Compter 30 à 60 secondes pour que le site en ligne reflète les changements.
