import { describe, it, expect } from 'vitest';
import { newGame, advance } from '../../src/core/engine.js';
import { orderBike, cancelOrder, deliveryTime, capacity, freeSpace, supplierCost, moveBike, isUnlocked } from '../../src/core/showroom.js';
import { BIKES, BIKE, BRANDS } from '../../src/data/bikes.js';
import { getLayout } from '../../src/data/layout.js';
const SPOTS = getLayout(0).spots;
import { decode, encode } from '../../src/core/save.js';

const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

describe('bike roster', () => {
  it('only has sport bikes from the six brands, 125-1000cc, with full specs', () => {
    expect(BIKES.length).toBeGreaterThanOrEqual(25);
    for (const b of BIKES) {
      expect(BRANDS).toContain(b.brand);
      expect(b.cc).toBeGreaterThanOrEqual(125);
      expect(b.cc).toBeLessThanOrEqual(1000);
      for (const k of ['hp', 'mph', 'price', 'loc']) expect(b[k]).toBeGreaterThan(0);
      expect(b.look.body).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const brand of BRANDS) expect(BIKES.some((b) => b.brand === brand)).toBe(true);
  });
  it('unique ids, and every location unlocks something new while cheap bikes stay available', () => {
    expect(new Set(BIKES.map((b) => b.id)).size).toBe(BIKES.length);
    for (let loc = 1; loc <= 5; loc++) expect(BIKES.some((b) => b.loc === loc)).toBe(true);
    expect(isUnlocked('yzf-r3', 4)).toBe(true); // a Location-1 bike at Location 5
    expect(isUnlocked('ninja-h2', 0)).toBe(false);
  });
  it('higher locations unlock pricier bikes on average', () => {
    const avg = (l) => { const xs = BIKES.filter((b) => b.loc === l).map((b) => b.price); return xs.reduce((a, b) => a + b) / xs.length; };
    for (let l = 2; l <= 5; l++) expect(avg(l)).toBeGreaterThan(avg(l - 1));
  });
});

describe('supplier + deliveries', () => {
  it('delivers at the next 2 AM at least 6 hours after ordering', () => {
    expect(deliveryTime(at(2026, 3, 2, 10))).toBe(at(2026, 3, 3, 2));
    expect(deliveryTime(at(2026, 3, 2, 19))).toBe(at(2026, 3, 3, 2));
    expect(deliveryTime(at(2026, 3, 2, 21))).toBe(at(2026, 3, 4, 2)); // 21:00 + 6h = 3 AM -> next night
    expect(deliveryTime(at(2026, 3, 3, 1))).toBe(at(2026, 3, 4, 2));
  });
  it('orders cost the supplier price, reserve a spot, and arrive overnight onto display', () => {
    const g = newGame(at(2026, 3, 2, 10));
    const r = orderBike(g, 0, 'yzf-r3', at(2026, 3, 2, 10));
    expect(r.ok).toBe(true);
    expect(g.cash).toBe(20000 - supplierCost('yzf-r3'));
    expect(freeSpace(g, 0)).toBe(capacity(g, 0) - 1);
    advance(g, at(2026, 3, 3, 1, 59));
    expect(g.locations[0].bikes).toHaveLength(0);
    const rep = advance(g, at(2026, 3, 3, 2, 0));
    expect(rep.delivered).toHaveLength(1);
    expect(g.locations[0].bikes[0]).toMatchObject({ model: 'yzf-r3', spot: SPOTS[0].id, condition: 100 });
    expect(g.orders).toHaveLength(0);
  });
  it('delivers while offline too (and never loses a bike)', () => {
    const g = newGame(at(2026, 3, 2, 10));
    orderBike(g, 0, 'ninja-500', at(2026, 3, 2, 10));
    orderBike(g, 0, 'yzf-r3', at(2026, 3, 2, 10));
    const rep = advance(g, at(2026, 3, 5, 12), { offline: true });
    expect(rep.delivered).toHaveLength(2);
    expect(new Set(g.locations[0].bikes.map((b) => b.spot)).size).toBe(2);
  });
  it('refuses when full, broke, or the bike is locked', () => {
    const g = newGame(at(2026, 3, 2, 10));
    expect(orderBike(g, 0, 'ninja-h2', 0).reason).toMatch(/Location 5/);
    g.cash = 1000;
    expect(orderBike(g, 0, 'yzf-r3', 0).reason).toMatch(/cash/);
    g.cash = 1e6;
    for (let k = 0; k < capacity(g, 0); k++) expect(orderBike(g, 0, 'ninja-125', 0).ok).toBe(true);
    expect(orderBike(g, 0, 'ninja-125', 0).reason).toMatch(/full/);
  });
  it('cancelling refunds in full', () => {
    const g = newGame(0);
    const { order } = orderBike(g, 0, 'rs457', 0);
    expect(cancelOrder(g, order.uid)).toBe(true);
    expect(g.cash).toBe(20000);
    expect(g.orders).toHaveLength(0);
  });
  it('bikes and orders survive a save code round trip', () => {
    const g = newGame(at(2026, 3, 2, 10));
    orderBike(g, 0, 'yzf-r3', at(2026, 3, 2, 10));
    advance(g, at(2026, 3, 3, 3));
    orderBike(g, 0, 'ninja-500', at(2026, 3, 3, 3));
    const back = decode(encode(g));
    expect(back.locations[0].bikes).toEqual(g.locations[0].bikes);
    expect(back.orders).toEqual(g.orders);
  });
});

describe('arranging the showroom', () => {
  const setup = () => {
    const g = newGame(at(2026, 3, 2, 10));
    orderBike(g, 0, 'yzf-r3', at(2026, 3, 2, 10));
    orderBike(g, 0, 'ninja-500', at(2026, 3, 2, 10));
    advance(g, at(2026, 3, 3, 3));
    return g;
  };
  it('only allowed while closed', () => {
    const g = setup();
    const [a] = g.locations[0].bikes;
    expect(moveBike(g, 0, a.uid, SPOTS[3].id, at(2026, 3, 3, 12)).ok).toBe(false);
    expect(moveBike(g, 0, a.uid, SPOTS[3].id, at(2026, 3, 3, 20)).ok).toBe(true);
    expect(a.spot).toBe(SPOTS[3].id);
  });
  it('swaps when the target spot is taken, and rejects spots beyond capacity', () => {
    const g = setup();
    const [a, b] = g.locations[0].bikes;
    const [sa, sb] = [a.spot, b.spot];
    expect(moveBike(g, 0, a.uid, sb, at(2026, 3, 3, 20)).swapped).toBe(true);
    expect([a.spot, b.spot]).toEqual([sb, sa]);
    expect(moveBike(g, 0, a.uid, SPOTS[capacity(g, 0)].id, at(2026, 3, 3, 20)).ok).toBe(false);
  });
  it('every location has more base capacity than the last', () => {
    const g = newGame(0);
    for (let i = 1; i < 5; i++) expect(capacity(g, i)).toBeGreaterThan(capacity(g, i - 1));
  });
  it('sale prices match the roster MSRP', () => {
    expect(BIKE['ninja-h2'].price).toBe(32700);
    expect(BIKE['cbr1000rr-r'].price).toBe(28999);
  });
});
