// Seeded random numbers stored in the save, so offline catch-up and tests are reproducible.
export function rng(state) {
  let t = (state.rng = ((state.rng | 0) + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const uniform = (state, a, b) => a + (b - a) * rng(state);
export const chance = (state, p) => rng(state) < p;
export const pick = (state, arr) => arr[Math.floor(rng(state) * arr.length)];
/** Exponential wait (ms) for a Poisson process with `perHour` events per hour. */
export const expWait = (state, perHour) => (-Math.log(1 - rng(state)) / perHour) * 3600e3;
/** Normal(0,1) via Box-Muller. */
export function gauss(state) {
  const u = Math.max(1e-9, rng(state)), v = rng(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function weighted(state, items, weightOf) {
  const ws = items.map(weightOf), total = ws.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  let r = rng(state) * total;
  for (let k = 0; k < items.length; k++) { r -= ws[k]; if (r <= 0) return items[k]; }
  return items[items.length - 1];
}
