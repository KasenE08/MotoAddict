// Achievements (one-time, cash rewards) and 3 daily challenges (reset each day).
import { LOC_MULT } from '../config.js';
import { BIKES, BRANDS, BIKE } from '../data/bikes.js';
import { ROLES } from '../data/staff.js';
import { MATERIAL, maxLevel } from '../data/upgrades.js';
import { dayKey } from './time.js';
import { addDayHook } from './engine.js';
import { capacity } from './showroom.js';
import { n, rl, m } from './effects.js';

const owned = (s) => s.locations.filter((l) => l.owned).length;
const soldOfBrand = (s, brand) => BIKES.filter((b) => b.brand === brand).every((b) => s.stats.soldModels[b.id]);
const fullStaff = (s, i) => ROLES.every((r) => n(s, i, r.id) >= r.caps[i]);
const dreamTeam = (s, i) => fullStaff(s, i) && ROLES.every((r) => rl(s, i, r.id) >= 5);
const furnished = (s, i) => MATERIAL.every((it) => m(s, i, it.id) >= maxLevel(it.id, i));
const anyLoc = (s, fn) => s.locations.some((l, i) => l.owned && fn(s, i));

const A = (id, name, cat, reward, desc, test) => ({ id, name, cat, reward, desc, test });
export const ACHIEVEMENTS = [
  A('first-sale', 'First Sale', 'Sales', 500, 'Sell your first bike.', (s) => s.stats.bikesSold >= 1),
  A('sold-10', '10 Bikes Sold', 'Sales', 2500, 'Sell 10 bikes.', (s) => s.stats.bikesSold >= 10),
  A('sold-100', '100 Bikes Sold', 'Sales', 30000, 'Sell 100 bikes.', (s) => s.stats.bikesSold >= 100),
  A('sold-1000', '1,000 Bikes Sold', 'Sales', 400000, 'Sell 1,000 bikes.', (s) => s.stats.bikesSold >= 1000),
  A('sold-10000', '10,000 Bikes Sold', 'Sales', 6000000, 'Sell 10,000 bikes.', (s) => s.stats.bikesSold >= 10000),
  A('big-ticket', 'Big Ticket', 'Sales', 20000, 'Sell a bike for over $30,000.', (s) => s.stats.biggestSale > 30000),
  A('hard-bargain', 'Hard Bargain', 'Sales', 3000, 'Win a haggle without dropping your price.', (s) => s.stats.hardBargains >= 1),
  A('gear-head', 'Gear Head', 'Sales', 8000, 'Make 100 gear, helmet or parts sales.', (s) => s.stats.gearSold >= 100),
  ...BRANDS.map((b) => A(`brand-${b.toLowerCase()}`, `Brand Loyal: ${b}`, 'Collection', 25000, `Sell every ${b} model at least once.`, (s) => soldOfBrand(s, b))),
  A('full-lineup', 'Full Lineup', 'Collection', 1000000, 'Sell every bike in the roster.', (s) => BIKES.every((b) => s.stats.soldModels[b.id])),
  A('liter-club', 'Liter Club', 'Collection', 10000, 'Sell your first 1000cc bike.', (s) => Object.keys(s.stats.soldModels).some((id) => BIKE[id]?.cc >= 998)),
  A('lucky-trade', 'Lucky Trade', 'Collection', 2000, 'Accept your first trade-in.', (s) => s.stats.tradeIns >= 1),
  A('earn-100k', 'Six Figures', 'Money', 5000, 'Earn $100,000 in total.', (s) => s.stats.totalEarned >= 1e5),
  A('earn-1m', 'Millionaire', 'Money', 50000, 'Earn $1,000,000 in total.', (s) => s.stats.totalEarned >= 1e6),
  A('earn-10m', 'Eight Figures', 'Money', 500000, 'Earn $10,000,000 in total.', (s) => s.stats.totalEarned >= 1e7),
  A('earn-100m', 'Moto Mogul', 'Money', 5000000, 'Earn $100,000,000 in total.', (s) => s.stats.totalEarned >= 1e8),
  A('big-day', 'Big Day', 'Money', 25000, 'Earn $50,000 in a single day.', (s) => s.stats.bestDay >= 50000),
  A('idle-earner', 'Idle Earner', 'Money', 10000, 'Come back after maxing out your offline cap.', (s) => s.stats.maxOfflineCapHit >= 1),
  ...[2, 3, 4, 5].map((k) => A(`location-${k}`, `Location ${k}`, 'Dealership', [0, 0, 5000, 25000, 100000, 400000][k], `Open your dealership at Location ${k}.`, (s) => s.locations[k - 1]?.owned)),
  A('fully-furnished', 'Fully Furnished', 'Dealership', 250000, 'Max every material upgrade at one location.', (s) => anyLoc(s, furnished)),
  A('spotless', 'Spotless', 'Dealership', 10000, 'Keep a location perfectly clean for a whole open day.', (s) => s.stats.spotlessDays >= 1),
  A('max-capacity', 'Max Capacity', 'Dealership', 15000, 'Fill every display spot in a showroom.', (s) => anyLoc(s, (st, i) => st.locations[i].bikes.length >= capacity(st, i) && capacity(st, i) >= 6)),
  A('first-hire', 'First Hire', 'Staff', 1000, 'Hire your first employee.', (s) => s.stats.hires >= 1),
  A('full-staff', 'Full Staff', 'Staff', 30000, 'Fill every role at one location.', (s) => anyLoc(s, fullStaff)),
  A('dream-team', 'Dream Team', 'Staff', 200000, 'Fill and max every role at one location.', (s) => anyLoc(s, dreamTeam)),
  A('locked-down', 'Locked Down', 'Staff', 50000, 'Stop 10 thefts.', (s) => s.stats.theftsStopped >= 10),
  A('tycoon', 'Tycoon', 'Endgame', 10000000, 'Fully max Location 5: every upgrade and a dream team.', (s) => s.locations[4]?.owned && furnished(s, 4) && dreamTeam(s, 4)),
];
ACHIEVEMENTS.push(A('completionist', 'Completionist', 'Endgame', 25000000, 'Unlock every other achievement.', (s) => ACHIEVEMENTS.every((a) => a.id === 'completionist' || s.achievements[a.id])));
export const ACH = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

/** Unlock anything newly earned; returns the list (rewards already paid). */
export function checkAchievements(state, now) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.test(state); } catch { ok = false; }
    if (!ok) continue;
    state.achievements[a.id] = now;
    state.cash += a.reward;
    got.push(a);
  }
  return got;
}

// ---------------- daily challenges ----------------
const highest = (s) => s.locations.reduce((h, l, i) => (l.owned ? i : h), 0);
const TEMPLATES = [
  { type: 'sell', title: (c) => `Sell ${c.goal} bikes`, goal: (s) => 2 + owned(s) * 2, reward: 1500, val: (s, b) => s.stats.bikesSold - b.bikesSold },
  { type: 'earn', title: (c) => `Earn $${c.goal.toLocaleString('en-US')} today`, goal: (s) => 6000 * LOC_MULT[highest(s)], reward: 2000, val: (s) => (s.today.key === s.challenges.key ? s.today.earned : 0) },
  { type: 'gear', title: (c) => `Make ${c.goal} gear sales`, goal: (s) => 4 + owned(s) * 2, reward: 1200, val: (s, b) => s.stats.gearSold - b.gearSold },
  { type: 'customers', title: (c) => `Welcome ${c.goal} customers`, goal: (s) => 20 + owned(s) * 12, reward: 1000, val: (s, b) => s.stats.customers - b.customers },
  { type: 'haggle', title: () => 'Win a haggle (counter or hold firm)', goal: () => 1, reward: 1500, val: (s, b) => s.stats.hagglesWon - b.hagglesWon },
  { type: 'order', title: (c) => `Order ${c.goal} bikes from the supplier`, goal: (s) => 2 + owned(s), reward: 800, val: (s, b) => (s.stats.ordered || 0) - (b.ordered || 0) },
  { type: 'upgrade', title: () => 'Buy any upgrade', goal: () => 1, reward: 1500, val: (s, b) => s.stats.upgradesBought - b.upgradesBought },
  { type: 'hire', title: () => 'Hire an employee', goal: () => 1, reward: 1000, val: (s, b) => s.stats.hires - b.hires },
  { type: 'brand', title: (c) => `Sell a ${c.brand}`, goal: () => 1, reward: 2000, val: (s, b, c) => BIKES.filter((x) => x.brand === c.brand).reduce((a, x) => a + (s.stats.soldModels[x.id] || 0) - (b.soldModels[x.id] || 0), 0) },
];

function seeded(key) {
  let h = 2166136261;
  for (const ch of key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/** Make sure today's challenges exist (new set every local day). */
export function ensureChallenges(state, now) {
  const key = dayKey(now);
  if (state.challenges?.key === key) return state.challenges;
  const r = seeded(key);
  const pool = [...TEMPLATES];
  const list = [];
  while (list.length < 3) {
    const t = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const c = { type: t.type, claimed: false };
    if (t.type === 'brand') { const avail = BRANDS.filter((b) => BIKES.some((x) => x.brand === b && x.loc <= highest(state) + 1)); c.brand = avail[Math.floor(r() * avail.length)]; }
    c.goal = t.goal(state);
    c.reward = Math.round(t.reward * LOC_MULT[highest(state)] * (1 + 0.5 * (owned(state) - 1)));
    list.push(c);
  }
  const st = state.stats;
  state.challenges = { key, list, base: { bikesSold: st.bikesSold, gearSold: st.gearSold, customers: st.customers, hagglesWon: st.hagglesWon, ordered: st.ordered || 0, upgradesBought: st.upgradesBought, hires: st.hires, soldModels: { ...st.soldModels } } };
  return state.challenges;
}

export function challengeProgress(state, c) {
  const t = TEMPLATES.find((x) => x.type === c.type);
  const v = Math.max(0, t.val(state, state.challenges.base, c));
  return { value: Math.min(v, c.goal), done: v >= c.goal, title: t.title(c) };
}

export function claimChallenge(state, idx) {
  const c = state.challenges?.list[idx];
  if (!c || c.claimed) return { ok: false };
  if (!challengeProgress(state, c).done) return { ok: false, reason: 'Not finished yet.' };
  c.claimed = true;
  state.cash += c.reward;
  state.stats.challengesDone = (state.stats.challengesDone || 0) + 1;
  return { ok: true, reward: c.reward };
}

// Spotless: a full open day (at least 25 customers) with no trash pile ever building up.
addDayHook((state, b) => {
  state.locations.forEach((l) => {
    if (!l.owned || !l.sim) return;
    if (b.type === 'open') Object.assign(l.sim, { dirtyToday: false, dayCustomers: 0, sawOpen: true });
    if (b.type === 'close') {
      if (l.sim.sawOpen && !l.sim.dirtyToday && (l.sim.dayCustomers || 0) >= 25) state.stats.spotlessDays++;
      l.sim.sawOpen = false;
    }
  });
});
