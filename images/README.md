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
- `maman.png` → mother's face circle in the hero opening animation
- `mathieu.png` → brother's face circle in the hero opening animation

To swap any of these for a different photo later, just overwrite the file (same filename) or tell Claude which slot to repoint.

The trip-dates calendar is no longer a photo — it's a real September 2026 calendar built into the page (Sept 3–23 highlighted), so `calendar.png` is unused. Same for the weather stats: they're a real table now, so `temperatures.png` is unused.

## Hero opening animation — still missing your own face photo

The 3rd circle (already on the map when the page loads, meant to be you) still needs a photo — drop a square-ish close-up crop in as `face-moi.png` and it'll pick up automatically, no code change needed. (`IMG_2825.jpeg` has you in it but it's a 2-person photo, so it wasn't used here without checking first.)

## Other photos in this folder, unused

- `hero-sticker.png` — the hero sticker was removed from the page
- `inspiration3.png` — torii gate in a forest
- `inspiration4.png` — vintage "FUJI" travel poster
- `inspiration5.png` — illustrated ramen shopfront, Tokyo
- `inspiration6.png` — sheet of line-art frog stickers
- `suica.png` — Suica IC card mascot icon
- `IMG_2825.jpeg` — you + Lysandre (?), not used since it's not a solo/square crop
