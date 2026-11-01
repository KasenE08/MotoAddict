# MotoAddict

Motorcycle dealership idle tycoon — a free pixel-art PWA for iPhone (landscape), hosted on GitHub Pages.

- **Play:** https://kasene08.github.io/MotoAddict/
- **Test mode:** add `?dev=1` to the URL for time-travel buttons (jump to opening/closing time, simulate being away).
- **Art direction:** `preview/pixel/` (approved), `preview/` (the original 5 styles), notes in `docs/DESIGN.md`.

## Status
Phase 2 done: core engine — shared balance, real-world clock, open 9 AM–6 PM, passive income (open hours only), offline earnings capped at 4h of open time, autosave with backup, versioned copy-paste save codes, day/night tint, drag-to-pan map.

## Develop
```
npm install
npm run serve        # http://localhost:4173
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run shots        # review screenshots -> ./shots
```
No build step: plain ES modules served as static files.

## Code map
- `src/config.js` — balance constants, locations
- `src/core/` — pure logic: `time.js` (opening hours), `engine.js` (state, income, offline catch-up, day hooks), `save.js` (save codes, migrations, autosave), `format.js`
- `src/render/` — isometric pixel world, 3D bike renderer, pixel font
- `src/ui/` — HUD, camera, modals, icons, styles
