## Every image slot is filled

All photo placeholders on the page now have a matching file in this folder:

- `hero.png` → opening photo, top of page
- `tokyo-book.png` → book cover — "Tokyo" recommendation
- `chihiro.png` → film poster/still — "Le Voyage de Chihiro" recommendation
- `birth-of-sake.png` → film poster/still — "The Birth of Sake" recommendation
- `esim-screenshot.png` → iPhone settings screenshot — Administratif / eSIM Ubigi
- `transports.png` → wide banner — Les transports
- `culture.jpg` → wide banner — Culture
- `voiture.jpeg` → landscape image next to "En voiture, Simone !"
- `footer-stamp.jpeg` → landscape image at the bottom of the page
- `japan-map.png` → backdrop of the hero opening animation (the red Japan silhouette with Yonezawa/Tokyo/Fuji labeled; no longer used in the Carte section, which is now an interactive Leaflet map instead)

To swap any of these for a different photo later, just overwrite the file (same filename) or tell Claude which slot to repoint.

The trip-dates calendar is no longer a photo — it's a real September 2026 calendar built into the page (Sept 3–23 highlighted), so `calendar.png` is unused. Same for the weather stats: they're a real table now, so `temperatures.png` is unused.

## Hero opening animation — missing face photos

The opening animation (3 circles arriving on the Japan map) needs 3 square face photos, not yet in this folder — until they're added, each circle just shows a plain colored circle with a 🙂 icon:

- `face-moi.png` → your face (the circle already on the map when the page loads)
- `face-maman.png` → your mother's face (slides in from the left)
- `face-frere.png` → your brother's face (slides in from the left)

Any reasonably square, close-up crop works well since they're displayed as small circles (roughly 60–90px). Just drop files with those exact names into this folder — no code change needed, they'll pick up automatically.

## Other photos in this folder, unused

- `hero-sticker.png` — the hero sticker was removed from the page
- `inspiration3.png` — torii gate in a forest
- `inspiration4.png` — vintage "FUJI" travel poster
- `inspiration5.png` — illustrated ramen shopfront, Tokyo
- `inspiration6.png` — sheet of line-art frog stickers
- `suica.png` — Suica IC card mascot icon
- `IMG_2825.jpeg` — not currently used anywhere on the page
