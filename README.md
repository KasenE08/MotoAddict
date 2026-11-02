# MotoAddict

Motorcycle dealership idle tycoon — a free pixel-art PWA for iPhone (landscape), hosted on GitHub Pages.

- **Play:** https://kasene08.github.io/MotoAddict/ (iPhone: Safari → Share → Add to Home Screen; works offline)
- **Test mode:** add `?dev=1` to the URL for time-travel buttons (jump to opening/closing time, simulate being away, add cash, reset).
- **Bike roster:** `preview/roster.html` (all 31 bikes with specs and prices)
- **Art direction:** `preview/pixel/` (approved), `preview/` (the original 5 styles), notes in `docs/DESIGN.md`.

## Status — complete
- **Core:** shared balance across 5 locations, real-world clock, open 9 AM–6 PM, income only while open, offline catch-up capped at 4h of open time (upgradeable to 10h), autosave + backup, versioned copy-paste save codes with migrations.
- **Bikes:** 31 sport bikes (125–1000cc, 6 brands, real MSRP), each with its own 3D pixel model; supplier orders, 2 AM truck deliveries, display spots (turntables, window, podiums), arranging while closed.
- **Customers:** arrivals and budgets by location wealth, brand loyalty, sales queue, walk-outs, haggling, gear sales, trade-ins, referrals and online listings.
- **Staff:** 9 roles (salesman, receptionist, marketing, janitor, finance, mechanic, detailer, parts clerk, guard) with caps per location, hire fee + daily wages, unpaid/random quits, role-wide upgrades, trash/cleanliness, repairs, detailing, 3 AM theft attempts.
- **Upgrades:** 28 material upgrades per location (closed-hours only) and 19 company-wide upgrades.
- **Locations:** Rust Row → Millbrook → Maple Heights → Crestview Hills → Gilded Bay; richer customers, bigger showrooms, nicer themes. Old locations keep earning.
- **Progress:** 36 achievements with cash rewards, 3 daily challenges.
- **Polish:** sound effects (no music, mute toggle), one-time tips, rating (cleanliness + comfort + reputation), day/night tint, pinch zoom, offline PWA.

## Develop
```
npm install
npm run serve        # http://localhost:4173
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run shots        # review screenshots -> ./shots
npm run build        # regenerate sw.js (run after changing any shipped file)
npm run balance      # bot plays N days and prints pacing (add "casual")
npm run icons        # regenerate app icons
```
No bundler: plain ES modules served as static files. `sw.js` is generated so the offline cache updates on every deploy.

## Code map
- `src/config.js` — balance constants, locations
- `src/data/` — `bikes.js` (roster), `layout.js` (rooms, display spots, staff posts per location), `themes.js` (per-location palettes), `upgrades.js` (material + company upgrades), `staff.js` (roles)
- `src/core/` — pure logic: `time.js`, `engine.js` (timeline, income, offline catch-up, hooks), `effects.js` (every modifier), `save.js`, `showroom.js`, `sales.js`, `staff.js`, `upgrades.js`, `progress.js` (achievements, challenges), `rng.js`, `format.js`
- `src/render/` — isometric pixel world, 3D bike renderer, pixel font
- `src/ui/` — HUD, camera, crowd (people), panels, shop, haggling, audio, modals, icons, styles
- `assets/sfx/` — sound effects, sources and licenses in `CREDITS.md`
