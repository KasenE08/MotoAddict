// Employees: hire / fire / role upgrades, wages at closing, quitting, and the
// work they do over time (cleaning, repairs, detailing, service income, security).
import { THEFT } from '../config.js';
import { ROLES, ROLE, MAX_ROLE_LEVEL } from '../data/staff.js';
import { addDayHook, addAnyRunner, addIncomeSource } from './engine.js';
import { chance, rng } from './rng.js';
import * as F from './effects.js';

export const capFor = (role, i) => ROLE[role].caps[i];

export function hire(state, i, roleId) {
  const role = ROLE[roleId], loc = state.locations[i];
  if (!role || !loc?.owned) return { ok: false, reason: 'Unknown role.' };
  const have = F.n(state, i, roleId);
  if (have >= role.caps[i]) return { ok: false, reason: `This location can only have ${role.caps[i]} ${role.name.toLowerCase()}${role.caps[i] > 1 ? 's' : ''}.` };
  const fee = F.hireFee(role, i);
  if (state.cash < fee) return { ok: false, reason: 'Not enough cash for the hiring fee.' };
  state.cash -= fee;
  loc.staff[roleId] = have + 1;
  if (!loc.staffLvl[roleId]) loc.staffLvl[roleId] = 1;
  state.stats.hires++;
  return { ok: true, fee };
}

export function fire(state, i, roleId) {
  const loc = state.locations[i];
  if (!F.n(state, i, roleId)) return { ok: false };
  loc.staff[roleId]--;
  return { ok: true };
}

export function upgradeRole(state, i, roleId) {
  const role = ROLE[roleId], loc = state.locations[i];
  const lv = F.rl(state, i, roleId);
  if (lv >= MAX_ROLE_LEVEL) return { ok: false, reason: 'Already at the top level.' };
  const cost = F.roleUpgradeCost(role, i, lv);
  if (state.cash < cost) return { ok: false, reason: 'Not enough cash.' };
  state.cash -= cost;
  loc.staffLvl[roleId] = lv + 1;
  state.stats.upgradesBought++;
  return { ok: true, cost, level: lv + 1 };
}

export function wagesFor(state, i) {
  return ROLES.reduce((sum, r) => sum + F.n(state, i, r.id) * F.dailyWage(state, r, i), 0);
}
export const totalWages = (state) => state.locations.reduce((s, l, i) => s + (l.owned ? wagesFor(state, i) : 0), 0);

// ---- end of day: pay wages (or lose staff), random quits ----
addDayHook((state, b) => {
  if (b.type !== 'close') return;
  const log = (state.staffLog ||= []);
  state.locations.forEach((loc, i) => {
    if (!loc.owned) return;
    for (const r of ROLES) {
      let have = F.n(state, i, r.id);
      const wage = F.dailyWage(state, r, i);
      // pay each employee; anyone we can't pay quits
      let paid = 0;
      for (let k = 0; k < have; k++) {
        if (state.cash >= wage) { state.cash -= wage; paid++; }
      }
      if (paid < have) { log.push({ at: b.at, loc: i, role: r.id, n: have - paid, why: 'unpaid' }); state.stats.quits += have - paid; }
      have = paid;
      // a few quit anyway (staff morale lowers this)
      let quit = 0;
      for (let k = 0; k < have; k++) if (chance(state, F.quitChance(state))) quit++;
      if (quit) { log.push({ at: b.at, loc: i, role: r.id, n: quit, why: 'quit' }); state.stats.quits += quit; }
      loc.staff[r.id] = have - quit;
    }
  });
  if (log.length > 30) log.splice(0, log.length - 30);
});

// ---- service income from mechanics + detailers (while open) ----
addIncomeSource((state, i) => {
  const perMin = F.mechanicIncome(state, i) + F.detailIncome(state, i);
  return perMin;
});

// ---- continuous work: cleaning, repairs, detailing (open or closed), theft at night ----
addAnyRunner((state, start, end, report, open) => {
  const hours = (end - start) / 3600e3;
  state.locations.forEach((loc, i) => {
    if (!loc.owned) return;
    const sim = loc.sim || (loc.sim = { nextArrival: null, nextTradeIn: null, customers: [], nextId: 1, piles: 0 });
    // janitors clean one pile at a time each
    if (sim.piles > 0) sim.piles = Math.max(0, sim.piles - F.cleanPerHour(state, i) * hours);
    // spotless tracking (Phase 8): did the store stay perfectly clean all open day?
    if (open && sim.piles >= 1) sim.dirtyToday = true;
    // mechanics repair the most damaged bike first
    let pts = F.repairPerHour(state, i) * hours;
    if (pts > 0) for (const b of [...loc.bikes].sort((a, c) => a.condition - c.condition)) {
      if (pts <= 0) break;
      if (b.condition >= 100) continue;
      const fix = Math.min(100 - b.condition, pts);
      b.condition = Math.round((b.condition + fix) * 10) / 10;
      pts -= fix;
    }
    // detailers polish bikes on display
    loc.detailProgress = (loc.detailProgress || 0) + F.detailPerHour(state, i) * hours;
    while (loc.detailProgress >= 1) {
      const b = loc.bikes.find((x) => !x.detailed);
      if (!b) { loc.detailProgress = 0; break; }
      b.detailed = true;
      loc.detailProgress -= 1;
    }
    // night-time theft attempt at 3 AM
    if (!open) {
      for (let d = new Date(start); d.getTime() <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), THEFT.hour).getTime();
        if (at <= start || at > end) continue;
        if (!loc.bikes.length || !chance(state, THEFT.attemptChance)) continue;
        if (chance(state, F.theftSuccess(state, i))) {
          const k = Math.floor(rng(state) * loc.bikes.length);
          const [bike] = loc.bikes.splice(k, 1);
          const refund = Math.round(bike.paid * F.insuranceRate(state));
          state.cash += refund;
          state.stats.thefts++;
          report.events.push({ type: 'theft', loc: i, model: bike.model, refund, at });
          (state.theftLog ||= []).push({ at, loc: i, model: bike.model, refund });
        } else {
          state.stats.theftsStopped++;
          report.events.push({ type: 'theftStopped', loc: i, at });
          (state.theftLog ||= []).push({ at, loc: i, stopped: true });
        }
        if (state.theftLog.length > 20) state.theftLog.shift();
      }
    }
  });
});

