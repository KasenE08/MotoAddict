import { describe, it, expect } from 'vitest';
import { isOpenAt, openMsBetween, openWindows, boundaries, nextChange, nightLevel } from '../../src/core/time.js';
import { newGame, advance, totalRate, spend, addDayHook, addIncomeSource } from '../../src/core/engine.js';

// Phase 4 removed the flat placeholder income; give these engine tests a flat $10/min source.
addIncomeSource((s, i) => (s.__flat && i === 0 ? 10 : 0));
const game = (t) => Object.assign(newGame(t), { __flat: true });
import { encode, decode, migrate, store, load, SaveError } from '../../src/core/save.js';
import { money, duration, clockText } from '../../src/core/format.js';

const at = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();
const H = 3600e3;

describe('opening hours (9 AM - 6 PM local)', () => {
  it('is open 9:00-17:59 and closed otherwise', () => {
    expect(isOpenAt(at(2026, 3, 2, 8, 59))).toBe(false);
    expect(isOpenAt(at(2026, 3, 2, 9, 0))).toBe(true);
    expect(isOpenAt(at(2026, 3, 2, 17, 59))).toBe(true);
    expect(isOpenAt(at(2026, 3, 2, 18, 0))).toBe(false);
  });
  it('counts only open time between two moments', () => {
    expect(openMsBetween(at(2026, 3, 2, 8), at(2026, 3, 2, 10))).toBe(1 * H);
    expect(openMsBetween(at(2026, 3, 2, 17), at(2026, 3, 3, 10))).toBe(2 * H);
    expect(openMsBetween(at(2026, 3, 2, 0), at(2026, 3, 5, 0))).toBe(27 * H);
    expect(openMsBetween(at(2026, 3, 2, 19), at(2026, 3, 3, 8))).toBe(0);
  });
  it('stays exactly 9 hours on daylight-saving change days', () => {
    expect(openMsBetween(at(2026, 3, 8, 0), at(2026, 3, 9, 0))).toBe(9 * H); // spring forward
    expect(openMsBetween(at(2026, 11, 1, 0), at(2026, 11, 2, 0))).toBe(9 * H); // fall back
  });
  it('lists open/close boundaries in order', () => {
    const b = boundaries(at(2026, 3, 2, 12), at(2026, 3, 3, 12));
    expect(b.map((x) => x.type)).toEqual(['close', 'open']);
    expect(openWindows(at(2026, 3, 2, 12), at(2026, 3, 3, 12))).toHaveLength(2);
  });
  it('knows the next change', () => {
    expect(nextChange(at(2026, 3, 2, 7))).toEqual({ type: 'open', at: at(2026, 3, 2, 9) });
    expect(nextChange(at(2026, 3, 2, 12))).toEqual({ type: 'close', at: at(2026, 3, 2, 18) });
    expect(nextChange(at(2026, 3, 2, 20))).toEqual({ type: 'open', at: at(2026, 3, 3, 9) });
  });
  it('tints the world at night but not midday', () => {
    expect(nightLevel(at(2026, 3, 2, 12))).toBe(0);
    expect(nightLevel(at(2026, 3, 2, 23))).toBeGreaterThan(0.5);
  });
});

describe('engine: shared balance + passive income', () => {
  it('starts with one owned location and starting cash', () => {
    const g = game(at(2026, 3, 2, 9));
    expect(g.locations.filter((l) => l.owned)).toHaveLength(1);
    expect(g.cash).toBe(20000);
  });
  it('earns only during open hours while playing', () => {
    const g = game(at(2026, 3, 2, 8));
    const rate = totalRate(g);
    advance(g, at(2026, 3, 2, 8, 30));
    expect(g.cash).toBe(20000);
    advance(g, at(2026, 3, 2, 10));
    expect(g.cash).toBeCloseTo(20000 + rate * 3600, 5);
  });
  it('caps offline earnings at 4 open hours by default, 10 when upgraded', () => {
    const g = game(at(2026, 3, 2, 9));
    const rate = totalRate(g);
    const r = advance(g, at(2026, 3, 4, 9), { offline: true });
    expect(r.openMs).toBe(18 * H);
    expect(r.countedMs).toBe(4 * H);
    expect(r.capped).toBe(true);
    expect(r.earned).toBeCloseTo(rate * 4 * 3600, 5);
    const g2 = game(at(2026, 3, 2, 9));
    g2.offlineCapHours = 10;
    expect(advance(g2, at(2026, 3, 4, 9), { offline: true }).countedMs).toBe(10 * H);
  });
  it('earns nothing offline overnight', () => {
    const g = game(at(2026, 3, 2, 19));
    expect(advance(g, at(2026, 3, 3, 8), { offline: true }).earned).toBe(0);
  });
  it('never earns or crashes when the clock goes backwards', () => {
    const g = game(at(2026, 3, 2, 12));
    const r = advance(g, at(2026, 3, 2, 10));
    expect(r.earned).toBe(0);
    expect(g.lastTick).toBe(at(2026, 3, 2, 10));
  });
  it('fires day hooks for every open/close crossed (used later for wages + deliveries)', () => {
    const seen = [];
    addDayHook((s, b) => seen.push(b.type));
    const g = game(at(2026, 3, 2, 12));
    advance(g, at(2026, 3, 4, 12), { offline: true });
    expect(seen).toEqual(['close', 'open', 'close', 'open']);
    expect(g.stats.daysOpened).toBe(2);
  });
  it('tracks earnings per day and the best day', () => {
    const g = game(at(2026, 3, 2, 9));
    advance(g, at(2026, 3, 2, 18));
    const day1 = g.today.earned;
    advance(g, at(2026, 3, 3, 10));
    expect(g.today.key).toBe('2026-03-03');
    expect(g.stats.bestDay).toBeCloseTo(day1, 5);
  });
  it('spends only what you have', () => {
    const g = game(0);
    expect(spend(g, 25000)).toBe(false);
    expect(spend(g, 5000)).toBe(true);
    expect(g.cash).toBe(15000);
  });
});

describe('save codes', () => {
  it('round-trips through a copy-paste code', () => {
    const g = game(at(2026, 3, 2, 9));
    g.cash = 123456.78;
    const back = decode(encode(g));
    expect(back).toEqual(g);
  });
  it('tolerates whitespace and line breaks from pasting', () => {
    const code = encode(newGame(1));
    const messy = `  ${code.slice(0, 20)}\n${code.slice(20)}  `;
    expect(decode(messy).cash).toBe(20000);
  });
  it('rejects junk, truncated and tampered codes with a clear message', () => {
    const code = encode(newGame(1));
    expect(() => decode('hello')).toThrow(SaveError);
    expect(() => decode(code.slice(0, -12))).toThrow(SaveError);
    const parts = code.split('.');
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('A') ? 'B' : 'A') + parts[2].slice(-1);
    expect(() => decode(parts.join('.'))).toThrow(/damaged/);
  });
  it('refuses saves from a newer game version', () => {
    expect(() => migrate({ v: 99 })).toThrow(/newer version/);
  });
  it('upgrades old-format saves instead of breaking them', () => {
    const old = { createdAt: 1, lastTick: 1, money: 777 }; // pretend v0 save
    expect(migrate(old)).toMatchObject({ v: 3, cash: 777, orders: [], tradeIn: null });
  });
  it('upgrades a Phase 2 (v1) save with showroom fields', () => {
    const v1 = { v: 1, createdAt: 1, lastTick: 1, cash: 5000, locations: [{ id: 1, owned: true, earned: 3 }] };
    const up = migrate(v1);
    expect(up.v).toBe(3);
    expect(up.locations[0]).toMatchObject({ owned: true, earned: 3, bikes: [], capacityBonus: 0 });
    expect(up.nextUid).toBe(1);
  });
  it('fills missing fields with defaults', () => {
    const g = migrate({ v: 3, cash: 5, lastTick: 1 });
    const full = decode(encode(g));
    expect(full.locations).toHaveLength(5);
    expect(full.offlineCapHours).toBe(4);
  });
  it('autosaves with a backup and recovers if the main save is corrupted', () => {
    const mem = new Map();
    const ls = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
    const g = game(1);
    store(g, ls);
    g.cash = 999;
    store(g, ls);
    mem.set('motoaddict.save', 'garbage');
    expect(load(2, ls).cash).toBe(20000);
  });
  it('handles large saves', () => {
    const g = game(1);
    g.log = Array.from({ length: 20000 }, (_, i) => ({ i, note: 'sale' }));
    expect(decode(encode(g)).log).toHaveLength(20000);
  });
});

describe('formatting', () => {
  it('formats money for the HUD', () => {
    expect(money(1234.9)).toBe('$1,234');
    expect(money(1240000)).toBe('$1.24M');
    expect(money(3.5e9)).toBe('$3.50B');
  });
  it('formats durations and clock times', () => {
    expect(duration(3 * H + 12 * 60e3)).toBe('3h 12m');
    expect(clockText(at(2026, 3, 2, 14, 47))).toBe('2:47 PM');
  });
});
