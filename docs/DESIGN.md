# MotoAddict — art & layout decisions (Phase 1)

Approved direction: see `preview/pixel/`.

- **Style:** pixel art, drawn at half resolution and scaled 2x with crisp pixels.
- **Camera:** angled overhead isometric view like Prison Empire Tycoon. Open-topped rooms with low walls; the map extends past the screen, drag/pinch to explore.
- **Orientation:** landscape only. Portrait shows a "rotate your phone" screen (iOS home-screen apps can't lock orientation).
- **HUD:** kept to the edges — slim top bar, short button column on the right, small groups in the bottom corners. The middle of the screen stays clear.
- **Bikes:** low-poly 3D models (extruded, beveled, lit, z-buffered) rendered at any angle, then pixelated. Each model gets its own shape and real color.
- **People:** 3D shaded box figures.
- **Room sizes (minimum, every location):** showroom 14x10 tiles, side rooms ~6x6, wide aisles and walkways. Higher locations get larger lots.
- **Font:** Jersey 10 (digits must be unambiguous).

## Final polish target (the mockup is a floor, not the finish)
- Detailed props: textured floors (tile grout, wood grain, carpet pattern), wall trim and baseboards, posters, window frames, signage, light fixtures with soft light pools.
- Bikes: per-model geometry (fairing shapes, exhausts, wheels with spokes and brake discs), decals and two-tone liveries.
- People: varied outfits, hair, idle and walking animations, role uniforms.
- Life: animated customers, janitor sweeping, turntable rotating, mechanics working on lifts, water spray in detailing, cars arriving.
- Lighting: day/evening/night tint following the real clock; interior lights on after 6 PM.
- Each location visibly richer (walls, floors, furniture, surroundings).
- UI: animated buttons, number count-ups, coin bursts, consistent pixel icon set.
