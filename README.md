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

## Publier les changements

Le site se met à jour automatiquement via GitHub Pages après un push sur `main` :

```bash
git add -A
git commit -m "message"
git push
```

Compter 30 à 60 secondes pour que le site en ligne reflète les changements.
