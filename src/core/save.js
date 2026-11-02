// Saves: autosave to localStorage, plus a copy-paste save code.
// Code format:  MOTO1.<version>.<base64url JSON>.<checksum>
// The version lets future updates migrate old saves instead of breaking them.
import { SAVE_VERSION } from '../config.js';
import { newGame } from './engine.js';

export class SaveError extends Error {}

const PREFIX = 'MOTO1';
const KEY = 'motoaddict.save';

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function toB64(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const fromB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

// Each entry upgrades a save from version k to k+1. Add one per format change.
export const MIGRATIONS = {
  // 0 -> 1: pre-release saves stored `money` instead of `cash`.
  0: (s) => { const { money, ...rest } = s; return { ...rest, cash: rest.cash ?? money ?? 0, v: 1 }; },
  // 1 -> 2 (Phase 3): showroom inventory + supplier orders.
  1: (s) => ({ ...s, v: 2, orders: s.orders ?? [], nextUid: s.nextUid ?? 1, locations: (s.locations ?? []).map((l) => ({ bikes: [], capacityBonus: 0, ...l })) }),
  // 2 -> 3 (Phase 4): customer simulation, trade-ins, sales stats (stats filled by defaults).
  2: (s) => ({ ...s, v: 3, rng: s.rng ?? ((s.createdAt || 1) % 2147483647) | 1, tradeIn: s.tradeIn ?? null, locations: (s.locations ?? []).map((l) => ({ sim: null, ...l, bikes: (l.bikes ?? []).map((b) => ({ reserved: null, ...b })) })) }),
};

export function migrate(data) {
  let s = { ...data };
  let v = Number.isInteger(s.v) ? s.v : 0;
  if (v > SAVE_VERSION) throw new SaveError('This save is from a newer version of MotoAddict. Update the game first.');
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new SaveError(`Can't upgrade save version ${v}.`);
    s = step(s);
    v = s.v;
  }
  return s;
}

// Fill anything missing with defaults so partial/older saves still load.
function withDefaults(s, now) {
  const base = newGame(s.createdAt ?? now);
  const out = { ...base, ...s, stats: { ...base.stats, ...s.stats, soldModels: { ...(s.stats?.soldModels || {}) } }, settings: { ...base.settings, ...s.settings }, today: { ...base.today, ...s.today } };
  out.locations = base.locations.map((l, i) => ({ ...l, ...(s.locations?.[i] || {}) }));
  if (typeof out.cash !== 'number' || !Number.isFinite(out.cash)) throw new SaveError('Save is damaged (bad cash value).');
  if (typeof out.lastTick !== 'number') out.lastTick = now;
  return out;
}

export function encode(state) {
  const json = JSON.stringify(state);
  return `${PREFIX}.${state.v}.${toB64(json)}.${fnv1a(json)}`;
}

export function decode(code, now = Date.now()) {
  const clean = String(code || '').replace(/\s+/g, '');
  const parts = clean.split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new SaveError("That doesn't look like a MotoAddict save code.");
  let json;
  try { json = fromB64(parts[2]); } catch { throw new SaveError('Save code is incomplete or damaged.'); }
  if (fnv1a(json) !== parts[3]) throw new SaveError('Save code is incomplete or damaged (checksum mismatch).');
  let data;
  try { data = JSON.parse(json); } catch { throw new SaveError('Save code is damaged.'); }
  return withDefaults(migrate(data), now);
}

// ---- local autosave (keeps the previous save as a backup) ----
export function store(state, ls = globalThis.localStorage) {
  const code = encode(state);
  const prev = ls.getItem(KEY);
  if (prev && prev !== code) ls.setItem(KEY + '.bak', prev);
  ls.setItem(KEY, code);
}

export function load(now, ls = globalThis.localStorage) {
  for (const k of [KEY, KEY + '.bak']) {
    const code = ls.getItem(k);
    if (!code) continue;
    try { return decode(code, now); } catch { /* try the backup */ }
  }
  return null;
}

export const clearSave = (ls = globalThis.localStorage) => { ls.removeItem(KEY); ls.removeItem(KEY + '.bak'); };
