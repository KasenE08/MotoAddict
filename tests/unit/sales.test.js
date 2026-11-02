import { describe, it, expect } from 'vitest';
import { newGame, advance, addIncomeSource } from '../../src/core/engine.js';
import { orderBike } from '../../src/core/showroom.js';
import { salePrice, chooseBike, acceptOffer, counterOffer, refuseOffer, pendingHaggles, acceptTradeIn, tradeInValue, arrivalsPerHour } from '../../src/core/sales.js';
import { BIKE } from '../../src/data/bikes.js';
import { CUSTOMERS } from '../../src/config.js';
import { decode, encode } from '../../src/core/save.js';

const at = (d, h, m = 0) => new Date(2026, 2, d, h, m).getTime();
const stocked = (models = ['g310rr', 'ninja-125', 'yzf-r3', 'ninja-500'], seed = 42) => {
  const g = newGame(at(1, 10));
  g.rng = seed;
  g.cash = 1e6;
  for (const id of models) orderBike(g, 0, id, at(1, 10));
  advance(g, at(2, 8)); // overnight delivery
  return g;
};

describe('customers + sales', () => {
  it('customers only come while open, and none stay after closing', () => {
    const g = stocked();
    const night = advance(g, at(2, 8, 59));
    expect(night.customers).toBe(0);
    const day = advance(g, at(2, 18, 30));
    expect(day.customers).toBeGreaterThan(20);
    expect(g.locations[0].sim.customers).toHaveLength(0);
  });
  it('sells displayed bikes at list price and frees the spot', () => {
    const g = stocked();
    const r = advance(g, at(2, 18));
    expect(r.sales.length).toBeGreaterThan(0);
    for (const s of r.sales) expect(s.price).toBeLessThanOrEqual(s.list);
    expect(g.locations[0].bikes.length).toBe(4 - r.sales.length);
    expect(g.stats.bikesSold).toBe(r.sales.length);
  });
  it('can never sell more bikes than are on display', () => {
    const g = stocked();
    const r = advance(g, at(5, 18), { offline: false });
    expect(r.sales.length).toBeLessThanOrEqual(4);
  });
  it('richer locations bring bigger budgets and more customers', () => {
    for (let i = 1; i < 5; i++) {
      expect(CUSTOMERS[i].budget).toBeGreaterThan(CUSTOMERS[i - 1].budget);
      expect(CUSTOMERS[i].arrivals).toBeGreaterThan(CUSTOMERS[i - 1].arrivals);
    }
    const g = newGame(0);
    expect(arrivalsPerHour(g, 4)).toBeGreaterThan(arrivalsPerHour(g, 0));
  });
  it("customers only want bikes they can afford, preferring pricier ones", () => {
    const g = stocked(['ninja-125', 'yzf-r3']);
    g.locations[0].bikes.forEach((b, k) => { b.spot = ['B2', 'B3'][k]; }); // both on plain floor spots
    const poor = { budget: 4000, brand: null };
    expect(chooseBike(g, 0, poor)).toBeNull();
    const rich = { budget: 5600, brand: null };
    let r3 = 0;
    for (let k = 0; k < 200; k++) if (BIKE[chooseBike(g, 0, rich).model].name === 'YZF-R3') r3++;
    expect(r3).toBeGreaterThan(100);
  });
  it('earns gear sales from browsers and buyers', () => {
    const g = stocked();
    const before = g.stats.gearRevenue;
    const r = advance(g, at(2, 18));
    expect(r.gearCount).toBeGreaterThan(0);
    expect(g.stats.gearRevenue - before).toBe(r.gear);
  });
  it('is reproducible: same seed, same day', () => {
    const a = stocked(undefined, 7), b = stocked(undefined, 7);
    const ra = advance(a, at(2, 18)), rb = advance(b, at(2, 18));
    expect(ra.sales).toEqual(rb.sales);
    expect(a.cash).toBe(b.cash);
  });
  it('customers walk out when nobody can serve them in time', () => {
    const g = stocked();
    g.locations[0].sim = { nextArrival: null, nextTradeIn: null, customers: [], nextId: 1 };
    // flood the store: 40 customers arrive at once, one salesperson
    const s = g.locations[0].sim;
    for (let k = 0; k < 40; k++) s.customers.push({ id: s.nextId++, budget: 1, brand: null, arrivedAt: at(2, 10), phase: 'queue', giveUpAt: at(2, 10, 5), look: 1 });
    const r = advance(g, at(2, 10, 30));
    expect(r.walkouts).toBeGreaterThan(20);
  });
  it('offline: haggling customers are handled by the staff (offer accepted), limited by the offline cap', () => {
    const g = stocked();
    const r = advance(g, at(4, 18), { offline: true });
    expect(r.countedMs).toBe(4 * 3600e3);
    expect(r.sales.length).toBeGreaterThan(0);
    expect(pendingHaggles(g, 0)).toHaveLength(0);
  });
  it('a long absence only simulates the capped open hours', () => {
    const g = stocked(['ninja-125']);
    const r = advance(g, at(20, 12), { offline: true });
    expect(r.countedMs).toBe(4 * 3600e3);
    expect(r.customers).toBeLessThan(CUSTOMERS[0].arrivals * 6);
  });
  it('mid-sim state survives a save code round trip', () => {
    const g = stocked();
    advance(g, at(2, 11));
    const back = decode(encode(g));
    expect(back.locations[0].sim).toEqual(g.locations[0].sim);
    advance(g, at(2, 15)); advance(back, at(2, 15));
    expect(back.cash).toBe(g.cash);
  });
});

// Force a haggle so the player actions can be tested.
function haggleSetup(seed = 1) {
  const g = stocked(['yzf-r3'], seed);
  const s = (g.locations[0].sim = { nextArrival: at(9, 0), nextTradeIn: null, customers: [], nextId: 1 });
  const bike = g.locations[0].bikes[0];
  bike.reserved = 1;
  s.customers.push({ id: 1, budget: 9000, brand: null, arrivedAt: at(2, 10), phase: 'haggle', bikeUid: bike.uid, offer: 5000, list: 5499, deadline: at(2, 10, 1), round: 1, look: 1 });
  g.lastTick = at(2, 10);
  return g;
}

describe('haggling', () => {
  it('accept sells at their offer', () => {
    const g = haggleSetup();
    const cash = g.cash;
    const r = acceptOffer(g, 0, 1, at(2, 10));
    expect(r.price).toBe(5000);
    expect(g.cash).toBeGreaterThanOrEqual(cash + 5000);
    expect(g.locations[0].bikes).toHaveLength(0);
  });
  it('counter either sells half-way, gets a last offer, or they walk', () => {
    const results = new Set();
    for (let seed = 1; seed < 60; seed++) {
      const g = haggleSetup(seed);
      const r = counterOffer(g, 0, 1, at(2, 10));
      results.add(r.result);
      if (r.result === 'sold') expect(r.price).toBe(5250);
      if (r.result === 'lastOffer') { expect(r.offer).toBe(5130); expect(counterOffer(g, 0, 1, at(2, 10)).result).toBe('walked'); }
    }
    expect([...results].sort()).toEqual(['lastOffer', 'sold', 'walked']);
  });
  it('refuse: sometimes they pay full price (Hard Bargain), otherwise they leave', () => {
    let full = 0, walked = 0;
    for (let seed = 1; seed < 80; seed++) {
      const g = haggleSetup(seed);
      const r = refuseOffer(g, 0, 1, at(2, 10));
      if (r.result === 'sold') { full++; expect(r.price).toBe(5499); expect(g.stats.hardBargains).toBe(1); } else walked++;
    }
    expect(full).toBeGreaterThan(5);
    expect(walked).toBeGreaterThan(full);
  });
  it('ignoring a haggle while playing: the customer walks out at the deadline', () => {
    const g = haggleSetup();
    advance(g, at(2, 10, 2));
    expect(pendingHaggles(g, 0)).toHaveLength(0);
    expect(g.locations[0].bikes).toHaveLength(1);
    expect(g.locations[0].bikes[0].reserved).toBeNull();
  });
});

describe('trade-ins', () => {
  it('appear while playing, at the active location, scaled to what it sells', () => {
    const g = stocked(['ninja-125']);
    let seen = 0;
    for (let d = 2; d < 12; d++) {
      advance(g, at(d, 18));
      advance(g, at(d + 1, 8));
      if (g.stats.tradeIns || g.tradeIn) seen++;
    }
    // the last offer is kept until it expires
    expect(seen).toBeGreaterThan(0);
  });
  it('accepting pays the asking price and puts a used bike on display worth more than you paid', () => {
    const g = stocked(['ninja-125']);
    g.tradeIn = { loc: 0, model: 'yzf-r3', condition: 70, cost: 2420, at: at(2, 10), expiresAt: at(2, 10, 3) };
    const cash = g.cash;
    const r = acceptTradeIn(g, at(2, 10, 1));
    expect(r.ok).toBe(true);
    expect(g.cash).toBe(cash - 2420);
    expect(r.bike.condition).toBe(70);
    expect(salePrice(r.bike)).toBeGreaterThan(2420);
    expect(salePrice(r.bike)).toBeLessThan(BIKE['yzf-r3'].price);
    expect(tradeInValue({ model: 'yzf-r3', condition: 70 })).toBe(salePrice(r.bike));
  });
  it('expired offers and full showrooms are refused', () => {
    const g = stocked();
    g.tradeIn = { loc: 0, model: 'yzf-r3', condition: 70, cost: 2420, at: 0, expiresAt: at(2, 10) };
    expect(acceptTradeIn(g, at(2, 11)).ok).toBe(false);
    g.tradeIn.expiresAt = at(3, 0);
    expect(acceptTradeIn(g, at(2, 11)).reason).toMatch(/spot/);
  });
});

describe('income source hook still works (service income in Phase 5)', () => {
  it('flat income adds while open', () => {
    const g = newGame(at(2, 9));
    g.rng = 3;
    addIncomeSource((s, i) => (s.__testFlat && i === 0 ? 60 : 0));
    g.__testFlat = true;
    const r = advance(g, at(2, 10));
    expect(r.earned).toBeGreaterThanOrEqual(3600);
    g.__testFlat = false;
  });
});
