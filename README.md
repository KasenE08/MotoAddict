# MotoAddict

Motorcycle dealership idle tycoon — a free, offline-capable PWA for iPhone, hosted on GitHub Pages.

**Status: Phase 1 — art style selection.** Open `/preview/` to compare the five candidate styles.

## Develop
```
npm install
npm run serve        # http://localhost:4173
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
npm run shots        # review screenshots -> ./shots
```
No build step: plain ES modules served as static files.
