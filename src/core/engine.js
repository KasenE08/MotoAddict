// Core game state + time advancement. Pure logic, no DOM.
import { SAVE_VERSION, START_CASH, LOCATIONS, OFFLINE_CAP_HOURS } from '../config.js';
import { openWindows, boundaries, dayKey } from './time.js';

export function newGame(now) {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    cash: START_CASH, // one shared balance across every location
    activeLoc: 0,
    locations: LOCATIONS.map((l, i) => ({ id: l.id, owned: i === 0, earned: 0 })),
    offlineCapHours: OFFLINE_CAP_HOURS.base, // raised by the offline-cap upgrade (Phase 6)
    stats: { totalEarned: 0, offlineEarned: 0, daysOpened: 0, bestDay: 0 },
    today: { key: dayKey(now), earned: 0 },
    settings: { sound: true },
  };
}

// Systems added in later phases register here: income sources and
// open/close hooks (wages, deliveries, theft, ...).
const incomeSources = [];
const hooks = [];
export const addIncomeSource = (fn) => incomeSources.push(fn);
export const addDayHook = (fn) => hooks.push(fn);

/** Passive income in $/sec for one location while open. */
export function locationRate(state, i) {
  const loc = state.locations[i];
  if (!loc?.owned) return 0;
  let perMin = LOCATIONS[i].baseRate;
  for (const src of incomeSources) perMin += src(state, i) || 0;
  return perMin / 60;
}

/** Total passive income $/sec across all owned locations (they all keep earning). */
export const totalRate = (state) => state.locations.reduce((s, _, i) => s + locationRate(state, i), 0);

function addEarnings(state, amount, atMs) {
  const key = dayKey(atMs);
  if (state.today.key !== key) state.today = { key, earned: 0 };
  state.today.earned += amount;
  state.stats.bestDay = Math.max(state.stats.bestDay, state.today.earned);
}

/**
 * Advance the game from state.lastTick to `now`.
 * Income is earned only during open hours. When `offline` is true, earning
 * time is capped at the offline cap (counting only open hours).
 */
export function advance(state, now, { offline = false } = {}) {
  const from = state.lastTick;
  const report = { earned: 0, openMs: 0, countedMs: 0, awayMs: Math.max(0, now - from), capped: false, events: [] };
  if (!(now > from)) { state.lastTick = now; return report; } // clock went backwards: never earn, never lose
  const rate = totalRate(state);
  const capMs = offline ? state.offlineCapHours * 3600e3 : Infinity;
  for (const w of openWindows(from, now)) {
    const len = w.end - w.start;
    report.openMs += len;
    const use = Math.max(0, Math.min(len, capMs - report.countedMs));
    report.countedMs += use;
    if (use > 0) {
      const amt = (rate * use) / 1000;
      report.earned += amt;
      addEarnings(state, amt, w.start);
      state.locations.forEach((l, i) => { l.earned += (locationRate(state, i) * use) / 1000; });
    }
  }
  report.capped = report.openMs > report.countedMs;
  state.cash += report.earned;
  state.stats.totalEarned += report.earned;
  if (offline) state.stats.offlineEarned += report.earned;
  for (const b of boundaries(from, now)) {
    if (b.type === 'open') state.stats.daysOpened++;
    for (const h of hooks) h(state, b);
    report.events.push(b);
  }
  state.lastTick = now;
  return report;
}

export function spend(state, amount) {
  if (amount < 0 || state.cash < amount) return false;
  state.cash -= amount;
  return true;
}
