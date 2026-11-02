// Economy balance check: a simple bot plays MotoAddict through the real engine
// and reports when it reaches each location. Run: TZ=America/New_York node scripts/balance.mjs [days] [casual]
import { newGame, advance } from '../src/core/engine.js';
import { orderBike, freeSpace, capacity, supplierCost } from '../src/core/showroom.js';
import '../src/core/sales.js';
import { hire, upgradeRole } from '../src/core/staff.js';
import { buyMaterial, buyGlobal, buyLocation, globalCost, nextLocation } from '../src/core/upgrades.js';
import { checkAchievements, ensureChallenges, challengeProgress, claimChallenge } from '../src/core/progress.js';
import { BIKES } from '../src/data/bikes.js';
import { ROLES } from '../src/data/staff.js';
import { MATERIAL, GLOBAL, maxLevel } from '../src/data/upgrades.js';
import { CUSTOMERS, LOCATION_PRICE, LOCATIONS } from '../src/config.js';
import * as F from '../src/core/effects.js';

const DAYS = Number(process.argv[2] || 40), CASUAL = process.argv[3] === 'casual';
const day0 = new Date(2026, 2, 2, 8).getTime(); // a Monday, 8 AM
const at = (d, h, m = 0) => new Date(2026, 2, 2 + d, h, m).getTime();
const s = newGame(day0);
s.rng = 12345;
const reached = { 1: 0 };
const log = [];

function stock(i, t) {
  // fill free spots with bikes customers here can afford, priciest first
  const budget = CUSTOMERS[i].budget * (1 + F.financeStretch(s, i));
  const pool = BIKES.filter((b) => b.loc <= LOCATIONS[i].id && b.price <= budget * 1.25).sort((a, b) => b.price - a.price);
  let k = 0;
  while (freeSpace(s, i) > 0 && pool.length) {
    const b = pool[k % Math.min(pool.length, 6)];
    if (s.cash < supplierCost(b.id, s) + 2000) break;
    if (!orderBike(s, i, b.id, t).ok) break;
    k++;
  }
}

let eveningBudget = 0;
function invest(i, t) {
  // 1) storage first: more display spots = more sales per day
  while (F.m(s, i, 'storage') < maxLevel('storage', i) && s.cash > F.matCost('storage', i, F.m(s, i, 'storage')) * 1.5) buyMaterial(s, i, 'storage', t);
  // 2) key staff
  for (const id of ['salesman', 'janitor', 'mechanic', 'receptionist', 'clerk', 'detailer', 'finance', 'marketing', 'guard', 'salesman']) {
    const r = ROLES.find((x) => x.id === id);
    if (F.n(s, i, id) < r.caps[i] && s.cash > F.hireFee(r, i) * 6) hire(s, i, id);
  }
  // 3) other upgrades with ~40% of spare cash (the rest is saved for the next location)
  let budget = eveningBudget;
  const opts = [
    ...MATERIAL.filter((it) => F.m(s, i, it.id) < maxLevel(it.id, i)).map((it) => ({ c: F.matCost(it.id, i, F.m(s, i, it.id)), go: () => buyMaterial(s, i, it.id, t) })),
    ...GLOBAL.filter((it) => F.g(s, it.id) < it.levels).map((it) => ({ c: globalCost(it.id, F.g(s, it.id)), go: () => buyGlobal(s, it.id) })),
    ...ROLES.filter((r) => F.n(s, i, r.id) && F.rl(s, i, r.id) < 5).map((r) => ({ c: F.roleUpgradeCost(r, i, F.rl(s, i, r.id)), go: () => upgradeRole(s, i, r.id) })),
  ].sort((a, b) => a.c - b.c);
  for (const o of opts) { if (o.c > budget) break; if (o.go().ok) budget -= o.c; }
  eveningBudget = budget;
}

const VERBOSE = process.env.VERBOSE;
let spentBikes = 0, spentUp = 0;
for (let d = 0; d < DAYS; d++) {
  const c0 = s.cash, sold0 = s.stats.bikesSold, rev0 = s.stats.totalEarned, cust0 = s.stats.customers, walk0 = s.stats.walkouts;
  // the day: active players are there all day; casual players check in at noon and 7 PM
  if (CASUAL) { advance(s, at(d, 12), { offline: true }); advance(s, at(d, 19), { offline: true }); }
  else { s.glob.offlineCap = Math.max(s.glob.offlineCap || 0, 6); advance(s, at(d, 19), { offline: true }); }
  checkAchievements(s, at(d, 19));
  const ch = ensureChallenges(s, at(d, 19));
  ch.list.forEach((c, k) => { if (challengeProgress(s, c).done) claimChallenge(s, k); });
  // evening: buy the next location if affordable, then restock and invest everywhere
  const nl = nextLocation(s);
  if (nl > 0 && s.cash > LOCATION_PRICE[nl] * 1.05) { buyLocation(s, nl, at(d, 19)); reached[nl + 1] = d + 1; }
  const cBefore = s.cash;
  s.locations.forEach((l, i) => { if (l.owned) stock(i, at(d, 19, 4)); });
  eveningBudget = Math.max(0, s.cash - 5000) * 0.25;
  s.locations.forEach((l, i) => { if (l.owned) { const a = s.cash; stock(i, at(d, 19, 5)); spentBikes += a - s.cash; const b = s.cash; invest(i, at(d, 19, 10)); spentUp += b - s.cash; } });
  if (VERBOSE && d >= +VERBOSE && d < +VERBOSE + 8) console.log(`d${d + 1}: earned ${Math.round(s.stats.totalEarned - rev0)} sold ${s.stats.bikesSold - sold0} cust ${s.stats.customers - cust0} walk ${s.stats.walkouts - walk0} | bikes bought ${Math.round(spentBikes)} upgrades ${Math.round(spentUp)} | cash ${Math.round(s.cash)} | caps ${s.locations.map((l, i) => l.owned ? `${l.bikes.length}+${s.orders.filter(o => o.loc === i).length}/${capacity(s, i)}` : '').filter(Boolean).join(' ')}`);
  spentBikes = 0; spentUp = 0;
  advance(s, at(d + 1, 8));
  if (d % 3 === 2 || d === DAYS - 1) log.push(`day ${String(d + 1).padStart(3)} cash ${Math.round(s.cash).toLocaleString().padStart(14)}  best day ${Math.round(s.stats.bestDay).toLocaleString().padStart(12)}  sold ${String(s.stats.bikesSold).padStart(5)}  locs ${s.locations.filter((l) => l.owned).length}  rating L${s.activeLoc + 1} ${F.rating(s, s.activeLoc)}`);
}
console.log(log.join('\n'));
console.log('\nreached location (day):', JSON.stringify(reached));
console.log('achievements:', Object.keys(s.achievements).length, '| staff L1:', ROLES.map((r) => `${r.id}:${F.n(s, 0, r.id)}`).join(' '));
