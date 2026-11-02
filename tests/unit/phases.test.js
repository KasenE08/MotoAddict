import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { newGame, advance } from '../../src/core/engine.js';
import { orderBike, capacity, supplierCost } from '../../src/core/showroom.js';
import '../../src/core/sales.js';
import { hire, fire, upgradeRole, wagesFor } from '../../src/core/staff.js';
import { buyMaterial, buyGlobal, buyLocation, switchLocation, globalCost } from '../../src/core/upgrades.js';
import { ACHIEVEMENTS, checkAchievements, ensureChallenges, challengeProgress, claimChallenge } from '../../src/core/progress.js';
import * as F from '../../src/core/effects.js';
import { ROLES } from '../../src/data/staff.js';
import { MATERIAL, GLOBAL, maxLevel } from '../../src/data/upgrades.js';
import { getLayout, MAX_SPOTS } from '../../src/data/layout.js';
import { LOCATION_PRICE, LOC_MULT, BASE_CAPACITY } from '../../src/config.js';
import { decode, encode, migrate } from '../../src/core/save.js';

const at = (d, h, m = 0) => new Date(2026, 2, d, h, m).getTime();
const rich = (t = at(2, 10)) => { const g = newGame(t); g.cash = 1e9; g.rng = 99; return g; };

describe('Phase 5: employees', () => {
  it('hire fee + caps per location, finance manager limited to one', () => {
    const g = rich();
    expect(hire(g, 0, 'finance').ok).toBe(true);
    expect(hire(g, 0, 'finance').ok).toBe(false);
    expect(hire(g, 0, 'salesman').ok).toBe(true);
    expect(hire(g, 0, 'salesman').ok).toBe(true);
    expect(hire(g, 0, 'salesman').reason).toMatch(/only have 2/);
    for (const r of ROLES) for (let i = 1; i < 5; i++) expect(r.caps[i]).toBeGreaterThanOrEqual(r.caps[i - 1]);
    expect(ROLES.find((r) => r.id === 'finance').caps.every((c) => c === 1)).toBe(true);
  });
  it('costs scale up at richer locations', () => {
    const r = ROLES[0];
    for (let i = 1; i < 5; i++) expect(F.hireFee(r, i)).toBeGreaterThan(F.hireFee(r, i - 1));
  });
  it('pays wages at closing; unpaid staff quit', () => {
    const g = rich(at(2, 10));
    hire(g, 0, 'salesman'); hire(g, 0, 'janitor');
    const wages = wagesFor(g, 0);
    g.cash = wages + 50;
    advance(g, at(2, 18, 1));
    expect(F.n(g, 0, 'salesman') + F.n(g, 0, 'janitor')).toBeGreaterThanOrEqual(1);
    const g2 = rich(at(2, 17, 59));
    hire(g2, 0, 'salesman'); hire(g2, 0, 'janitor');
    g2.cash = 0;
    g2.locations[0].sim = { nextArrival: at(9, 0), nextTradeIn: null, customers: [], nextId: 1, piles: 0 }; // no customers
    advance(g2, at(2, 18, 1));
    expect(F.n(g2, 0, 'salesman') + F.n(g2, 0, 'janitor')).toBe(0);
    expect(g2.staffLog.some((e) => e.why === 'unpaid')).toBe(true);
  });
  it('role upgrades apply to the whole role and cost more each level', () => {
    const g = rich();
    hire(g, 0, 'salesman'); hire(g, 0, 'salesman');
    const before = F.buyBonus(g, 0);
    const c1 = F.roleUpgradeCost(ROLES[0], 0, 1), c2 = F.roleUpgradeCost(ROLES[0], 0, 2);
    expect(upgradeRole(g, 0, 'salesman').ok).toBe(true);
    expect(F.buyBonus(g, 0)).toBeGreaterThan(before);
    expect(c2).toBeGreaterThan(c1);
    expect(fire(g, 0, 'salesman').ok).toBe(true);
    expect(F.n(g, 0, 'salesman')).toBe(1);
  });
  it('salesmen serve more customers at once; receptionists + marketing bring more in', () => {
    const g = rich();
    const a0 = F.arrivalsMult(g, 0);
    hire(g, 0, 'receptionist'); hire(g, 0, 'marketing');
    expect(F.arrivalsMult(g, 0)).toBeGreaterThan(a0);
    hire(g, 0, 'salesman');
    expect(F.servers(g, 0)).toBe(2);
  });
  it('trash lowers the rating (never to zero); janitors clean it over time', () => {
    const g = rich();
    g.locations[0].sim = { nextArrival: null, nextTradeIn: null, customers: [], nextId: 1, piles: 8 };
    expect(F.cleanliness(g, 0)).toBe(0);
    expect(F.ratingMult(g, 0)).toBeGreaterThan(0.5);
    hire(g, 0, 'janitor');
    advance(g, at(2, 11));
    expect(g.locations[0].sim.piles).toBeLessThan(8);
  });
  it('mechanics earn service income and repair used bikes; detailers polish bikes', () => {
    const g = rich(at(2, 10));
    g.locations[0].bikes.push({ uid: 1, model: 'yzf-r3', spot: 'B1', condition: 60, detailed: false, paid: 1, at: 0, source: 'tradein', reserved: null });
    g.locations[0].sim = { nextArrival: at(9, 0), nextTradeIn: null, customers: [], nextId: 1, piles: 0 };
    hire(g, 0, 'mechanic'); hire(g, 0, 'detailer');
    const cash = g.cash;
    advance(g, at(2, 13));
    expect(g.cash).toBeGreaterThan(cash);
    expect(g.locations[0].bikes[0].condition).toBeGreaterThan(80);
    expect(g.locations[0].bikes[0].detailed).toBe(true);
  });
  it('guards + cameras make thefts much less likely to succeed; insurance refunds', () => {
    const g = rich();
    const base = F.theftSuccess(g, 0);
    hire(g, 0, 'guard');
    g.locations[0].mat.cameras = 4;
    expect(F.theftSuccess(g, 0)).toBeLessThan(base / 2);
    g.glob.insurance = 3;
    expect(F.insuranceRate(g)).toBe(0.75);
  });
  it('thefts only happen at night', () => {
    const g = rich(at(2, 18, 30));
    for (let k = 0; k < 4; k++) g.locations[0].bikes.push({ uid: 10 + k, model: 'ninja-500', spot: getLayout(0).spots[k].id, condition: 100, detailed: false, paid: 4000, at: 0, source: 'supplier', reserved: null });
    let events = [];
    const away = () => { g.locations[0].sim = { nextArrival: at(90, 0), nextTradeIn: null, customers: [], nextId: 1, piles: 0 }; };
    away();
    for (let d = 2; d < 40; d++) { away(); const r = advance(g, at(d + 1, 8, 50)); events = events.concat(r.events.filter((e) => /theft/.test(e.type))); advance(g, at(d + 1, 18, 30)); }
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(new Date(e.at).getHours()).toBe(3);
  });
});

describe('Phase 6: upgrades', () => {
  it('material upgrades only while closed, per location, with level caps that grow at later locations', () => {
    const g = rich();
    expect(buyMaterial(g, 0, 'couch', at(2, 12)).reason).toMatch(/after hours/);
    expect(buyMaterial(g, 0, 'couch', at(2, 20)).ok).toBe(true);
    expect(F.m(g, 0, 'couch')).toBe(1);
    expect(maxLevel('flooring', 4)).toBeGreaterThan(maxLevel('flooring', 0));
    expect(maxLevel('fountain', 0)).toBe(0);
    expect(maxLevel('fountain', 4)).toBeGreaterThan(0);
    expect(maxLevel('chandelier', 1)).toBe(0);
    expect(maxLevel('chandelier', 2)).toBeGreaterThan(0);
  });
  it('cosmetic upgrades bring more customers; storage adds display spots', () => {
    const g = rich();
    const a = F.arrivalsMult(g, 0), cap = capacity(g, 0);
    buyMaterial(g, 0, 'signage', at(2, 20));
    buyMaterial(g, 0, 'storage', at(2, 20));
    expect(F.arrivalsMult(g, 0)).toBeGreaterThan(a);
    expect(capacity(g, 0)).toBe(cap + 2);
  });
  it('every location can hold its maxed-out capacity on display', () => {
    for (let i = 0; i < 5; i++) expect(BASE_CAPACITY[i] + 2 * maxLevel('storage', i)).toBeLessThanOrEqual(MAX_SPOTS[i]);
  });
  it('company upgrades: any time, apply everywhere', () => {
    const g = rich(at(2, 12));
    const cost = supplierCost('yzf-r3', g);
    expect(buyGlobal(g, 'supplier').ok).toBe(true);
    expect(supplierCost('yzf-r3', g)).toBeLessThan(cost);
    for (let k = 0; k < 6; k++) buyGlobal(g, 'offlineCap');
    expect(F.offlineCapHours(g)).toBe(10);
    expect(buyGlobal(g, 'offlineCap').ok).toBe(false);
    expect(globalCost('advertising', 1)).toBeGreaterThan(globalCost('advertising', 0));
  });
  it('faster deliveries shorten the notice needed for tonight\'s truck', () => {
    const g = rich(at(2, 23));
    expect(orderBike(g, 0, 'yzf-r3', at(2, 23)).order.arriveAt).toBe(at(4, 2));
    for (let k = 0; k < 3; k++) buyGlobal(g, 'delivery');
    expect(orderBike(g, 0, 'yzf-r3', at(2, 23)).order.arriveAt).toBe(at(3, 2));
  });
  it('offline earnings boost pays extra on returns', () => {
    const a = rich(at(2, 9)), b = rich(at(2, 9));
    for (const g of [a, b]) for (let k = 0; k < 4; k++) g.locations[0].bikes.push({ uid: k + 1, model: 'ninja-500', spot: getLayout(0).spots[k].id, condition: 100, detailed: false, paid: 1, at: 0, source: 'supplier', reserved: null });
    b.glob.offlineBoost = 5;
    const ra = advance(a, at(2, 13), { offline: true }), rb = advance(b, at(2, 13), { offline: true });
    expect(rb.bonus).toBeCloseTo(ra.earned * 0.5, 0);
  });
});

describe('Phase 7: locations', () => {
  it('buying a location makes it active; old ones keep their stuff and keep earning', () => {
    const g = rich(at(2, 19));
    hire(g, 0, 'salesman');
    orderBike(g, 0, 'ninja-500', at(2, 19));
    const r = buyLocation(g, 1, at(2, 19));
    expect(r.ok).toBe(true);
    expect(g.activeLoc).toBe(1);
    expect(F.n(g, 0, 'salesman')).toBe(1);
    expect(buyLocation(g, 3, at(2, 19)).ok).toBe(false); // in order only
    advance(g, at(3, 8));
    expect(g.locations[0].bikes).toHaveLength(1);
    const sold = g.stats.bikesSold;
    advance(g, at(5, 18));
    expect(g.stats.bikesSold).toBeGreaterThan(sold); // Location 1 kept selling while you were at Location 2
    expect(switchLocation(g, 0).ok).toBe(true);
    expect(switchLocation(g, 3).ok).toBe(false);
  });
  it('prices, capacity and showroom size all grow with each location', () => {
    for (let i = 1; i < 5; i++) {
      expect(LOCATION_PRICE[i]).toBeGreaterThan(LOCATION_PRICE[i - 1]);
      expect(LOC_MULT[i]).toBeGreaterThan(LOC_MULT[i - 1]);
      expect(getLayout(i).SW * getLayout(i).SD).toBeGreaterThan(getLayout(i - 1).SW * getLayout(i - 1).SD);
    }
  });
});

describe('Phase 8: achievements + daily challenges', () => {
  it('covers the requested list and pays cash once', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    for (const id of ['first-sale', 'sold-10', 'sold-100', 'sold-1000', 'sold-10000', 'big-ticket', 'hard-bargain', 'gear-head', 'full-lineup', 'liter-club', 'lucky-trade', 'big-day', 'idle-earner', 'location-2', 'location-5', 'fully-furnished', 'spotless', 'max-capacity', 'first-hire', 'full-staff', 'dream-team', 'locked-down', 'tycoon', 'completionist']) expect(ids).toContain(id);
    expect(ids.filter((x) => x.startsWith('brand-'))).toHaveLength(6);
    expect(ACHIEVEMENTS.every((a) => a.reward > 0)).toBe(true);
    const g = rich();
    hire(g, 0, 'janitor');
    const cash = g.cash;
    const got = checkAchievements(g, 1);
    expect(got.map((a) => a.id)).toContain('first-hire');
    expect(g.cash).toBe(cash + got.reduce((s, a) => s + a.reward, 0));
    expect(checkAchievements(g, 2)).toHaveLength(0);
  });
  it('3 challenges a day, new set each day, claim pays once', () => {
    const g = rich(at(2, 10));
    const c1 = ensureChallenges(g, at(2, 10));
    expect(c1.list).toHaveLength(3);
    expect(ensureChallenges(g, at(2, 15))).toBe(c1);
    const c2 = ensureChallenges(g, at(3, 10));
    expect(c2.key).not.toBe(c1.key);
    // force one to completion
    c2.list[0] = { type: 'hire', goal: 1, reward: 1000, claimed: false };
    expect(claimChallenge(g, 0).ok).toBe(false);
    hire(g, 0, 'janitor');
    expect(challengeProgress(g, c2.list[0]).done).toBe(true);
    const cash = g.cash;
    expect(claimChallenge(g, 0).ok).toBe(true);
    expect(g.cash).toBe(cash + 1000);
    expect(claimChallenge(g, 0).ok).toBe(false);
  });
});

describe('Phase 10: saves + offline files', () => {
  it('v3 saves migrate to v4 (spot ids remapped, new sections added)', () => {
    const v3 = { v: 3, createdAt: 1, lastTick: 1, cash: 9, rng: 5, tradeIn: null, locations: [{ id: 1, owned: true, earned: 0, bikes: [{ uid: 1, model: 'yzf-r3', spot: 'F', condition: 100 }], capacityBonus: 0, sim: null }] };
    const up = migrate(v3);
    expect(up.v).toBe(4);
    expect(up.locations[0].bikes[0].spot).toBe('F1');
    expect(up.glob).toEqual({});
    const full = decode(encode(up));
    expect(full.locations[0].staff).toEqual({});
  });
  it('the offline cache (sw.js) lists every game file', () => {
    const sw = fs.readFileSync('sw.js', 'utf8');
    const walk = (p) => fs.statSync(p).isDirectory() ? fs.readdirSync(p).flatMap((f) => walk(`${p}/${f}`)) : [p];
    for (const f of [...walk('src'), ...walk('assets/sfx').filter((x) => x.endsWith('.mp3')), 'index.html']) expect(sw).toContain(`./${f}`);
  });
  it('balance: material and company upgrades all have sane costs', () => {
    for (const it of MATERIAL) for (let i = 0; i < 5; i++) if (maxLevel(it.id, i)) expect(F.matCost(it.id, i, 0)).toBeGreaterThan(0);
    for (const it of GLOBAL) expect(globalCost(it.id, it.levels - 1)).toBeLessThan(5e9);
  });
});
