// Core game state + time advancement. Pure logic, no DOM.
import { SAVE_VERSION, START_CASH, LOCATIONS, OFFLINE_CAP_HOURS } from '../config.js';
import { boundaries, dayKey, isOpenAt } from './time.js';

export function newGame(now) {
  return {
    v: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    cash: START_CASH, // one shared balance across every location
    activeLoc: 0,
    locations: LOCATIONS.map((l, i) => ({ id: l.id, owned: i === 0, earned: 0, bikes: [], capacityBonus: 0, sim: null })),
    orders: [], // supplier orders waiting for the overnight truck
    nextUid: 1,
    rng: (now % 2147483647) | 1, // seed for customers, haggles, trade-ins
    tradeIn: null, // current limited-time trade-in offer
    offlineCapHours: OFFLINE_CAP_HOURS.base, // raised by the offline-cap upgrade (Phase 6)
    stats: { totalEarned: 0, offlineEarned: 0, daysOpened: 0, bestDay: 0, bikesSold: 0, bikeRevenue: 0, biggestSale: 0, soldModels: {}, gearSold: 0, gearRevenue: 0, hagglesWon: 0, hardBargains: 0, walkouts: 0, tradeIns: 0, customers: 0 },
    today: { key: dayKey(now), earned: 0 },
    settings: { sound: true },
  };
}

// Systems added by other modules plug in here.
const incomeSources = []; // flat $/min while open (service income etc.)
const hooks = []; // fired at each opening / closing moment
const pointRunners = []; // run at moments in time (deliveries)
const openRunners = []; // simulate an open stretch [start, end] (customers, sales)
export const addIncomeSource = (fn) => incomeSources.push(fn);
export const addDayHook = (fn) => hooks.push(fn);
export const addPointRunner = (fn) => pointRunners.push(fn);
export const addOpenRunner = (fn) => openRunners.push(fn);

/** Flat passive income in $/sec for one location while open. */
export function locationRate(state, i) {
  const loc = state.locations[i];
  if (!loc?.owned) return 0;
  let perMin = LOCATIONS[i].baseRate;
  for (const src of incomeSources) perMin += src(state, i) || 0;
  return perMin / 60;
}
export const totalRate = (state) => state.locations.reduce((s, _, i) => s + locationRate(state, i), 0);

/** Credit money earned at time t (daily totals, best day, lifetime). */
export function earn(state, amount, t, report) {
  const key = dayKey(t);
  if (state.today.key !== key) state.today = { key, earned: 0 };
  state.today.earned += amount;
  state.stats.bestDay = Math.max(state.stats.bestDay, state.today.earned);
  state.stats.totalEarned += amount;
  state.cash += amount;
  if (report) report.earned += amount;
}

export function newReport(from, now, offline) {
  return { earned: 0, openMs: 0, countedMs: 0, awayMs: Math.max(0, now - from), capped: false, offline, events: [], delivered: [], sales: [], gear: 0, gearCount: 0, walkouts: 0, autoHaggles: 0, customers: 0 };
}

/**
 * Advance the game from state.lastTick to `now`, walking the timeline in order:
 * closed stretches (deliveries), opening/closing moments (hooks), open stretches
 * (customers + sales). When `offline`, only the first `offlineCapHours` of open
 * time are simulated.
 */
export function advance(state, now, { offline = false } = {}) {
  const from = state.lastTick;
  const report = newReport(from, now, offline);
  if (!(now > from)) { state.lastTick = now; return report; } // clock went backwards: never earn, never lose
  let capLeft = offline ? state.offlineCapHours * 3600e3 : Infinity;
  const stops = [...boundaries(from, now), { type: 'end', at: now }];
  let cursor = from;
  for (const stop of stops) {
    for (const r of pointRunners) r(state, cursor, report);
    const len = stop.at - cursor;
    if (len > 0 && isOpenAt(cursor)) {
      report.openMs += len;
      const use = Math.max(0, Math.min(len, capLeft));
      capLeft -= use;
      report.countedMs += use;
      if (use > 0) {
        const flat = (totalRate(state) * use) / 1000;
        if (flat > 0) {
          earn(state, flat, cursor, report);
          state.locations.forEach((l, i) => { l.earned += (locationRate(state, i) * use) / 1000; });
        }
        for (const r of openRunners) r(state, cursor, cursor + use, report);
      }
      // time past the offline cap is skipped: nothing happens in the store
      if (use < len) for (const r of openRunners) r(state, cursor + use, stop.at, report, { skip: true });
    }
    if (stop.type !== 'end') {
      if (stop.type === 'open') state.stats.daysOpened++;
      for (const h of hooks) h(state, stop);
      report.events.push({ type: stop.type, at: stop.at });
    }
    cursor = stop.at;
  }
  for (const r of pointRunners) r(state, now, report);
  report.capped = report.openMs > report.countedMs;
  if (offline) state.stats.offlineEarned += report.earned;
  state.lastTick = now;
  return report;
}

export function spend(state, amount) {
  if (amount < 0 || state.cash < amount) return false;
  state.cash -= amount;
  return true;
}
