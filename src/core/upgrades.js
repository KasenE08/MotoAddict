// Buying material upgrades (per location, closed hours only), company-wide
// upgrades (any time) and new locations.
import { LOCATION_PRICE, LOCATIONS } from '../config.js';
import { MAT, GLB, maxLevel } from '../data/upgrades.js';
import { isOpenAt } from './time.js';
import { matCost, m, g } from './effects.js';
import { newLocation } from './engine.js';

export const globalCost = (id, level) => Math.round(GLB[id].base * Math.pow(GLB[id].growth, level));

export function buyMaterial(state, i, id, now) {
  const it = MAT[id];
  if (!it || !state.locations[i]?.owned) return { ok: false, reason: 'Not available.' };
  if (isOpenAt(now)) return { ok: false, reason: 'Building work happens after hours. Come back after 6 PM.' };
  const lv = m(state, i, id), max = maxLevel(id, i);
  if (max === 0) return { ok: false, reason: `Unlocks at Location ${(it.unlock ?? 0) + 1}.` };
  if (lv >= max) return { ok: false, reason: 'Already maxed here.' };
  const cost = matCost(id, i, lv);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.locations[i].mat[id] = lv + 1;
  state.stats.upgradesBought++;
  return { ok: true, cost, level: lv + 1 };
}

export function buyGlobal(state, id) {
  const it = GLB[id];
  if (!it) return { ok: false, reason: 'Not available.' };
  const lv = g(state, id);
  if (lv >= it.levels) return { ok: false, reason: 'Already maxed.' };
  const cost = globalCost(id, lv);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  state.glob[id] = lv + 1;
  state.stats.upgradesBought++;
  return { ok: true, cost, level: lv + 1 };
}

/** Next location you can buy (they unlock in order). */
export const nextLocation = (state) => state.locations.findIndex((l) => !l.owned);

export function buyLocation(state, i, now) {
  if (i !== nextLocation(state)) return { ok: false, reason: 'Locations unlock in order.' };
  const price = LOCATION_PRICE[i];
  if (state.cash < price) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= price;
  const loc = state.locations[i];
  Object.assign(loc, { ...newLocation(LOCATIONS[i].id, true), boughtAt: now });
  state.activeLoc = i;
  return { ok: true, price };
}

export function switchLocation(state, i) {
  if (!state.locations[i]?.owned) return { ok: false, reason: "You don't own that location." };
  state.activeLoc = i;
  if (state.tradeIn && state.tradeIn.loc !== i) state.tradeIn = null;
  return { ok: true };
}

export const isMaxed = (state, i) => Object.keys(MAT).every((id) => m(state, i, id) >= maxLevel(id, i));
