'use strict';
/* =========================================================
   MOTOADDICT — retro idle moto empire + drag racing
   ========================================================= */
const SAVE_KEY = 'motoaddict_save_v1';
const IS_BROWSER = typeof document !== 'undefined';

/* ---------------- formatting ---------------- */
const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg'];
function fmt(n) {
  if (!isFinite(n)) return 'INF';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) {
    if (n < 10 && n % 1) return n.toFixed(2);
    if (n < 100 && n % 1) return n.toFixed(1);
    return Math.floor(n).toString();
  }
  const e = Math.floor(Math.log10(n) / 3);
  let s;
  if (e < SUF.length) s = SUF[e];
  else { const k = e - SUF.length; s = String.fromCharCode(97 + Math.floor(k / 26) % 26) + String.fromCharCode(97 + k % 26); }
  const v = n / Math.pow(10, e * 3);
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + s;
}
const money = n => '$' + fmt(n);
function fmtTime(s) {
  s = Math.max(0, s);
  if (s < 1) return s.toFixed(2) + 's';
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + Math.floor(s % 60) + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

/* ---------------- data ---------------- */
const BIZ = [
  { id: 'patch',   name: 'TIRE PATCH',        tag: 'TP', grp: 'garage', cost: 4,          rate: 1.07, time: 0.6,   inc: 1,          mgr: 1000,  col: '#ff3d7f' },
  { id: 'oil',     name: 'OIL CHANGE',        tag: 'OC', grp: 'garage', cost: 60,         rate: 1.15, time: 3,     inc: 60,         mgr: 15000, col: '#ffd23f' },
  { id: 'chain',   name: 'CHAIN & SPROCKETS', tag: 'CS', grp: 'garage', cost: 720,        rate: 1.14, time: 6,     inc: 540,        mgr: 1e5,   col: '#3dff7a' },
  { id: 'brake',   name: 'BRAKE JOB',         tag: 'BJ', grp: 'garage', cost: 8640,       rate: 1.13, time: 12,    inc: 4320,       mgr: 5e5,   col: '#2ef2ff' },
  { id: 'valve',   name: 'VALVE ADJUST',      tag: 'VA', grp: 'garage', cost: 103680,     rate: 1.12, time: 24,    inc: 51840,      mgr: 1.2e6, col: '#b06bff' },
  { id: 'rebuild', name: 'ENGINE REBUILD',    tag: 'ER', grp: 'garage', cost: 1.24416e6,  rate: 1.11, time: 96,    inc: 622080,     mgr: 1e7,   col: '#ff8a00' },
  { id: 'lot',     name: 'USED BIKE LOT',     tag: 'UL', grp: 'dealer', cost: 1.49299e7,  rate: 1.10, time: 384,   inc: 7.46496e6,  mgr: 1.11e8, col: '#ff3d7f' },
  { id: 'dealer',  name: 'SPORTBIKE DEALER',  tag: 'SD', grp: 'dealer', cost: 1.79159e8,  rate: 1.09, time: 1536,  inc: 8.95795e7,  mgr: 5.55e8, col: '#ffd23f' },
  { id: 'show',    name: 'SUPERBIKE SHOWROOM',tag: 'SS', grp: 'dealer', cost: 2.14991e9,  rate: 1.08, time: 6144,  inc: 1.07495e9,  mgr: 1e10,  col: '#3dff7a' },
  { id: 'factory', name: 'RACE TEAM FACTORY', tag: 'RF', grp: 'dealer', cost: 2.57989e10, rate: 1.07, time: 36864, inc: 2.9668e10,  mgr: 1e11,  col: '#2ef2ff' },
];
const MS_SPEED = [25, 50, 100, 200, 300, 400];
function bizSpeedMult(l) { let m = 1; for (const t of MS_SPEED) if (l >= t) m *= 2; return m; }
function bizProfitMult(l) { return l >= 500 ? Math.pow(3, Math.floor((l - 400) / 100)) : 1; }
function nextMilestone(l) {
  for (const t of MS_SPEED) if (l < t) return { at: t, txt: 'SPEED x2' };
  return { at: Math.floor(l / 100) * 100 + 100, txt: 'PROFIT x3' };
}

// gears:1 = CVT scooter. grip = launch traction (x g). cda includes rider.
const BIKES = [
  { id: 'ruckus',   name: 'HONDA RUCKUS',          type: 'scooter', hp: 4.0,  kg: 88,  gears: 1, redline: 8500,  cda: 0.50, grip: 0.50, price: 0,      c1: '#e8e8e8', c2: '#3a3a3a' },
  { id: 'vespa',    name: 'VESPA PRIMAVERA 150',   type: 'scooter', hp: 12.7, kg: 130, gears: 1, redline: 8250,  cda: 0.52, grip: 0.55, price: 1500,   c1: '#9fe3c8', c2: '#4b8f77' },
  { id: 'grom',     name: 'HONDA GROM',            type: 'naked',   hp: 9.8,  kg: 102, gears: 5, redline: 9500,  cda: 0.52, grip: 0.65, price: 6000,   c1: '#ff3b3b', c2: '#8f1d1d' },
  { id: 'xmax',     name: 'YAMAHA XMAX 300',       type: 'scooter', hp: 27.6, kg: 179, gears: 1, redline: 8750,  cda: 0.50, grip: 0.62, price: 15000,  c1: '#3b6cff', c2: '#1a2f7a' },
  { id: 'cbr300',   name: 'HONDA CBR300R',         type: 'sport',   hp: 30.4, kg: 162, gears: 6, redline: 10500, cda: 0.44, grip: 0.80, price: 4e4,    c1: '#ff3b3b', c2: '#f4f4f4' },
  { id: 'rc390',    name: 'KTM RC 390',            type: 'sport',   hp: 43,   kg: 172, gears: 6, redline: 10500, cda: 0.44, grip: 0.82, price: 1.2e5,  c1: '#ff8a00', c2: '#1b1b1b' },
  { id: 'cbr500',   name: 'HONDA CBR500R',         type: 'sport',   hp: 47,   kg: 192, gears: 6, redline: 9500,  cda: 0.43, grip: 0.85, price: 3e5,    c1: '#d42020', c2: '#202020' },
  { id: 'rs457',    name: 'APRILIA RS 457',        type: 'sport',   hp: 47,   kg: 175, gears: 6, redline: 10000, cda: 0.43, grip: 0.85, price: 7.5e5,  c1: '#262626', c2: '#ff2a2a' },
  { id: 'ninja500', name: 'KAWASAKI NINJA 500',    type: 'sport',   hp: 51,   kg: 171, gears: 6, redline: 10500, cda: 0.43, grip: 0.86, price: 2e6,    c1: '#46e83a', c2: '#14501a' },
  { id: 'ninja650', name: 'KAWASAKI NINJA 650',    type: 'sport',   hp: 67,   kg: 193, gears: 6, redline: 10500, cda: 0.43, grip: 0.87, price: 6e6,    c1: '#46e83a', c2: '#111111' },
  { id: 'r7',       name: 'YAMAHA R7',             type: 'sport',   hp: 72,   kg: 188, gears: 6, redline: 10000, cda: 0.42, grip: 0.88, price: 2e7,    c1: '#2b55ff', c2: '#0d1a55' },
  { id: 'r6',       name: 'YAMAHA R6',             type: 'sport',   hp: 117,  kg: 190, gears: 6, redline: 16000, cda: 0.40, grip: 0.90, price: 7e7,    c1: '#2b55ff', c2: '#f4f4f4' },
  { id: 'triple',   name: 'TRIUMPH STREET TRIPLE RS', type: 'naked', hp: 128, kg: 188, gears: 6, redline: 12650, cda: 0.50, grip: 0.92, price: 2.5e8,  c1: '#b8bcc8', c2: '#ff5a1f' },
  { id: 'zx6r',     name: 'KAWASAKI ZX-6R',        type: 'sport',   hp: 127,  kg: 198, gears: 6, redline: 16000, cda: 0.40, grip: 0.92, price: 9e8,    c1: '#46e83a', c2: '#2a2a2a' },
  { id: 'gsxr',     name: 'SUZUKI GSX-R1000R',     type: 'sport',   hp: 199,  kg: 203, gears: 6, redline: 14000, cda: 0.39, grip: 0.95, price: 4e9,    c1: '#2a6cff', c2: '#f4f4f4' },
  { id: 'r1m',      name: 'YAMAHA R1M',            type: 'sport',   hp: 197,  kg: 202, gears: 6, redline: 14000, cda: 0.38, grip: 0.96, price: 1.5e10, c1: '#2e2e3a', c2: '#2ef2ff' },
  { id: 'busa',     name: 'SUZUKI HAYABUSA',       type: 'sport',   hp: 187,  kg: 264, gears: 6, redline: 11000, cda: 0.36, grip: 1.08, price: 6e10,   c1: '#c9c9cf', c2: '#9a1c1c' },
  { id: 'fireblade',name: 'HONDA CBR1000RR-R SP',  type: 'sport',   hp: 215,  kg: 201, gears: 6, redline: 14500, cda: 0.38, grip: 0.98, price: 2.5e11, c1: '#f4f4f4', c2: '#d42020' },
  { id: 'm1000rr',  name: 'BMW M 1000 RR',         type: 'sport',   hp: 210,  kg: 192, gears: 6, redline: 15100, cda: 0.37, grip: 1.00, price: 1e12,   c1: '#f4f4f4', c2: '#2a6cff' },
  { id: 'v4r',      name: 'DUCATI PANIGALE V4 R',  type: 'sport',   hp: 218,  kg: 193, gears: 6, redline: 16500, cda: 0.37, grip: 1.01, price: 5e12,   c1: '#e01818', c2: '#7a0a0a' },
  { id: 'h2r',      name: 'KAWASAKI NINJA H2R',    type: 'sport',   hp: 310,  kg: 216, gears: 6, redline: 14500, cda: 0.37, grip: 1.04, price: 3e13,   c1: '#9aa0aa', c2: '#46e83a' },
];
const BIKE = {}; BIKES.forEach((b, i) => { b.idx = i; BIKE[b.id] = b; });

const TUNES = [
  { id: 'exh',  name: 'EXHAUST',      desc: '+4% HP',             base: 0.06, g: 1.42 },
  { id: 'ecu',  name: 'ECU FLASH',    desc: '+5% HP',             base: 0.09, g: 1.50 },
  { id: 'intk', name: 'INTAKE',       desc: '+3% HP',             base: 0.04, g: 1.36 },
  { id: 'tire', name: 'DRAG TIRES',   desc: '+3% GRIP, WIDER LAUNCH WINDOW', base: 0.05, g: 1.40 },
  { id: 'wt',   name: 'WEIGHT CUT',   desc: '-1.5% WEIGHT',       base: 0.07, g: 1.45, max: 30 },
  { id: 'qs',   name: 'QUICKSHIFTER', desc: '-25% SHIFT TIME',    base: 0.10, g: 1.80, max: 8, noCVT: true },
];

const LEAGUES = [
  { name: 'PARKING LOT',         ets: [32, 29.5, 27.5] },
  { name: 'BACK ROADS',          ets: [25.5, 23.5, 21.8] },
  { name: 'FRIDAY NIGHT STREET', ets: [20, 18.6, 17.4] },
  { name: 'LOCAL STRIP',         ets: [16.4, 15.6, 14.9] },
  { name: 'COUNTY DRAGS',        ets: [14.3, 13.8, 13.3] },
  { name: 'REGIONAL SERIES',     ets: [12.9, 12.5, 12.1] },
  { name: 'NATIONALS',           ets: [11.7, 11.3, 10.9] },
  { name: 'PRO STOCK MOTO',      ets: [10.6, 10.3, 10.0] },
  { name: 'WORLD FINALS',        ets: [9.7, 9.4, 9.1] },
];
function leagueInfo(n) {
  if (n < LEAGUES.length) return { name: LEAGUES[n].name, ets: LEAGUES[n].ets };
  const k = n - LEAGUES.length;
  return { name: 'INFINITY ' + (k + 1), ets: [0, 1, 2].map(i => +(9.1 * Math.pow(0.975, k * 3 + i + 1)).toFixed(2)) };
}

const LEGACY = [
  { id: 'offline',  name: 'NIGHT SHIFT',       desc: '+1h offline earnings cap (base 2h)',   cost: l => Math.ceil(5 * Math.pow(1.6, l)),  max: 22 },
  { id: 'sponsor',  name: 'SPONSORSHIP',       desc: '+50% race payouts',                    cost: l => Math.ceil(6 * Math.pow(1.7, l)),  max: 40 },
  { id: 'start',    name: 'HEAD START',        desc: 'Start each run with more cash',        cost: l => Math.ceil(8 * Math.pow(1.9, l)),  max: 12 },
  { id: 'crew',     name: 'VETERAN CREW',      desc: 'Start runs with 1 more mechanic hired',cost: l => Math.ceil(10 * Math.pow(2.3, l)), max: 6 },
  { id: 'luck',     name: 'LUCKY WRENCH',      desc: 'Random events 20% more often',         cost: l => Math.ceil(12 * Math.pow(2, l)),   max: 5 },
  { id: 'contacts', name: 'FACTORY CONTACTS',  desc: 'Bikes 10% cheaper',                    cost: l => Math.ceil(15 * Math.pow(2, l)),   max: 5 },
  { id: 'proqs',    name: 'PRO QUICKSHIFTER',  desc: '+1 free quickshifter level, all bikes',cost: l => Math.ceil(20 * Math.pow(2.2, l)), max: 4 },
];

const owned = s => Object.keys(s.bikes).length;
const ACH = [
  ['cash1k',  'POCKET MONEY',    'Earn $1K in one run',        s => s.earnRun >= 1e3],
  ['cash1m',  'MILLIONAIRE',     'Earn $1M in one run',        s => s.earnRun >= 1e6],
  ['cash1b',  'BILLIONAIRE',     'Earn $1B in one run',        s => s.earnRun >= 1e9],
  ['cash1t',  'TRILLIONAIRE',    'Earn $1T in one run',        s => s.earnRun >= 1e12],
  ['cash1qa', 'MOTO MOGUL',      'Earn $1Qa in one run',       s => s.earnRun >= 1e15],
  ['cash1sx', 'GALACTIC GARAGE', 'Earn $1Sx in one run',       s => s.earnRun >= 1e21],
  ['taps500', 'GREASE MONKEY',   'Do 500 jobs by hand',        s => s.stats.taps >= 500],
  ['mgr1',    'HIRED HELP',      'Hire a mechanic',            s => s.biz.some(b => b.m)],
  ['mgr6',    'FULL CREW',       'Hire all 6 garage mechanics',s => s.biz.slice(0, 6).every(b => b.m)],
  ['mgrall',  'EMPIRE',          'Hire every mechanic',        s => s.biz.every(b => b.m)],
  ['lv100',   'CENTURY',         'Any job to LV 100',          s => s.biz.some(b => b.l >= 100)],
  ['lv400',   'OBSESSED',        'Any job to LV 400',          s => s.biz.some(b => b.l >= 400)],
  ['dealer',  'DEALER LICENSE',  'Open the Used Bike Lot',     s => s.biz[6].l > 0],
  ['bike2',   'SECOND RIDE',     'Own 2 bikes',                s => owned(s) >= 2],
  ['bike5',   'COLLECTOR',       'Own 5 bikes',                s => owned(s) >= 5],
  ['bike10',  'HOARDER',         'Own 10 bikes',               s => owned(s) >= 10],
  ['liter',   'LITER CLUB',      'Own a 190+ HP bike',         s => Object.keys(s.bikes).some(id => BIKE[id].hp >= 190)],
  ['bikeall', 'THE FULL GRID',   'Own every bike',             s => owned(s) >= BIKES.length],
  ['win1',    'FIRST BLOOD',     'Win a drag race',            s => s.stats.wins >= 1],
  ['win10',   'STREET KING',     'Win 10 races',               s => s.stats.wins >= 10],
  ['win100',  'DRAG LORD',       'Win 100 races',              s => s.stats.wins >= 100],
  ['perf1',   'CLEAN SHIFT',     'Hit a perfect shift',        s => s.stats.perfects >= 1],
  ['perf100', 'MUSCLE MEMORY',   '100 perfect shifts',         s => s.stats.perfects >= 100],
  ['flawless','FLAWLESS',        'Great launch + every shift perfect', s => s.stats.flawless >= 1],
  ['et15',    'SUB-15',          'Run a sub-15s quarter',      s => s.stats.bestET < 15],
  ['et12',    'SUB-12',          'Run a sub-12s quarter',      s => s.stats.bestET < 12],
  ['et10',    'SINGLE DIGITS',   'Run a sub-10s quarter',      s => s.stats.bestET < 10],
  ['et8',     'SUB-8',           'Run a sub-8s quarter',       s => s.stats.bestET < 8],
  ['et6',     'WARP SPEED',      'Run a sub-6s quarter',       s => s.stats.bestET < 6],
  ['mph100',  'TON UP',          'Trap 100+ MPH',              s => s.stats.maxMph >= 100],
  ['mph150',  'BUG SPLATTER',    'Trap 150+ MPH',              s => s.stats.maxMph >= 150],
  ['mph200',  'DOUBLE TON',      'Trap 200+ MPH',              s => s.stats.maxMph >= 200],
  ['league5', 'REGIONAL HERO',   'Reach the Regional Series',  s => s.stats.bestLeague >= 5],
  ['league9', 'TO INFINITY',     'Reach the Infinity leagues', s => s.stats.bestLeague >= 9],
  ['league20','LEGEND',          'Reach league 20',            s => s.stats.bestLeague >= 19],
  ['red',     'JUMPED THE GUN',  'Get a red light',            s => s.stats.reds >= 1],
  ['event10', 'LUCKY BREAK',     'Claim 10 random events',     s => s.stats.events >= 10],
  ['tune25',  'MAD SCIENTIST',   'Tune any part to LV 25',     s => Object.values(s.bikes).some(b => Object.values(b.tune || {}).some(v => v >= 25))],
  ['prest1',  'REBUILT',         'Rebuild (prestige) once',    s => s.prestiges >= 1],
  ['prest5',  'PHOENIX',         'Rebuild 5 times',            s => s.prestiges >= 5],
];

/* ---------------- physics ---------------- */
const QUARTER = 402.336; // meters
const MPH = 2.23694;
function curve(f) { return Math.max(0.25, 1 - Math.pow((f - 0.9) / 0.72, 2)); }
function topSpeed(P, kg, cda) {
  let lo = 0, hi = 200;
  for (let k = 0; k < 50; k++) {
    const m = (lo + hi) / 2;
    if (0.6 * cda * m * m * m + 0.015 * kg * 9.81 * m > P) hi = m; else lo = m;
  }
  return lo;
}
function statsFor(b, t, qsBonus) {
  const L = k => t[k] || 0;
  const hp = b.hp * (1 + 0.04 * L('exh')) * (1 + 0.05 * L('ecu')) * (1 + 0.03 * L('intk'));
  const kg = b.kg * Math.pow(0.985, L('wt')) + 80;
  const grip = b.grip * (1 + 0.03 * L('tire'));
  const shift = 0.30 * Math.pow(0.75, L('qs') + (qsBonus || 0));
  const P = hp * 745.7;
  const vNat = topSpeed(P, kg, b.cda);
  const gf = 1 + 0.05 * (t.gear || 0);
  const vTop = vNat * 1.1 / gf;
  const vg = [];
  if (b.gears === 1) vg.push(vTop);
  else for (let i = 0; i < b.gears; i++) vg.push(vTop * (0.38 + 0.62 * Math.pow(i / (b.gears - 1), 0.85)));
  const lw = Math.min(0.36, 0.14 + 0.008 * L('tire'));
  return { P, hp, kg, grip, cda: b.cda, shift, vg, cvt: b.gears === 1, lw, redline: b.redline };
}
function simInit() { return { x: 0, v: 0, t: 0, gear: 0, shiftT: 0, spinT: 0, bogT: 0, boostT: 0, rpm: 0.3, lim: false }; }
function simStep(s, st, dt) {
  let p;
  const vg = st.vg[s.gear];
  if (s.shiftT > 0) { s.shiftT -= dt; p = 0; s.lim = false; }
  else if (st.cvt) { if (s.v / vg >= 1) { p = st.P * 0.1; s.lim = true; } else { p = st.P * 0.92; s.lim = false; } }
  else { const f = Math.max(0.3, s.v / vg); if (f >= 1) { p = st.P * 0.12; s.lim = true; } else { p = st.P * curve(f); s.lim = false; } }
  if (s.bogT > 0) { s.bogT -= dt; p *= 0.45; }
  if (s.boostT > 0) { s.boostT -= dt; p *= 1.08; }
  let tr = st.grip * st.kg * 9.81;
  if (s.spinT > 0) { s.spinT -= dt; tr *= 0.55; }
  const fd = Math.min(p / Math.max(s.v, 1.2), tr);
  const fr = 0.6 * st.cda * s.v * s.v + 0.015 * st.kg * 9.81;
  s.v = Math.max(0, s.v + (fd - fr) / st.kg * dt);
  s.x += s.v * dt; s.t += dt;
  s.rpm = st.cvt ? (s.lim ? 1 : Math.min(0.92, 0.55 + s.v / vg)) : Math.min(1, Math.max(0.3, s.v / vg));
}
function autoRun(st) {
  const s = simInit(); const dt = 1 / 240;
  while (s.x < QUARTER && s.t < 120) {
    if (!st.cvt && s.shiftT <= 0 && s.gear < st.vg.length - 1 && s.v / st.vg[s.gear] >= 0.95) { s.gear++; s.shiftT = st.shift; s.boostT = 0.5; }
    simStep(s, st, dt);
  }
  return { et: s.t, mph: s.v * MPH };
}

/* ---------------- state ---------------- */
function freshBiz() { const a = BIZ.map(() => ({ l: 0, p: 0, run: false, m: false })); a[0].l = 1; return a; }
function defaultState() {
  return {
    v: 1, cash: 0, earnRun: 0, earnAll: 0, repEarned: 0, repSpent: 0, prestiges: 0,
    biz: freshBiz(), bikes: { ruckus: { tune: {} } }, sel: 'ruckus', league: 0, lrace: 0,
    best: {}, legacy: {}, ach: {},
    stats: { taps: 0, races: 0, wins: 0, perfects: 0, flawless: 0, events: 0, reds: 0, maxMph: 0, bestET: 99, bestLeague: 0 },
    settings: { haptics: true }, buy: 1, buffs: {}, sponsor: 0, last: Date.now(), started: Date.now(),
  };
}
let S = defaultState();
const now = () => Date.now();
const lv = id => S.legacy[id] || 0;
const buffOn = k => (S.buffs[k] || 0) > now();
const repAvail = () => S.repEarned - S.repSpent;

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { applySave(JSON.parse(raw)); return true; }
  } catch (e) { }
  S = defaultState(); return false;
}
function applySave(d) {
  const D = defaultState();
  S = Object.assign(D, d);
  S.stats = Object.assign(defaultState().stats, d.stats || {});
  S.settings = Object.assign({ haptics: true }, d.settings || {});
  while (S.biz.length < BIZ.length) S.biz.push({ l: 0, p: 0, run: false, m: false });
  if (!S.bikes[S.sel]) S.sel = 'ruckus';
  if (!S.bikes.ruckus) S.bikes.ruckus = { tune: {} };
}
function save() { S.last = now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }

/* ---------------- economy ---------------- */
function globalMult() {
  let m = (1 + 0.02 * repAvail()) * (1 + 0.1 * (owned(S) - 1)) * (1 + 0.01 * Object.keys(S.ach).length);
  if (buffOn('rich')) m *= 5;
  if (buffOn('jam')) m *= 0.5;
  return m;
}
function bizTime(i) { return BIZ[i].time / bizSpeedMult(S.biz[i].l) / (buffOn('turbo') ? 2 : 1); }
function bizIncome(i) { const l = S.biz[i].l; return BIZ[i].inc * l * bizProfitMult(l) * globalMult(); }
function incomePerSec(onlyMgr) {
  let s = 0;
  for (let i = 0; i < BIZ.length; i++) { const b = S.biz[i]; if (b.l > 0 && (b.m || !onlyMgr)) s += bizIncome(i) / bizTime(i); }
  return s;
}
function bizCost(i, n) { const B = BIZ[i], l = S.biz[i].l; return B.cost * Math.pow(B.rate, l) * (Math.pow(B.rate, n) - 1) / (B.rate - 1); }
function bizMaxN(i) {
  const B = BIZ[i], l = S.biz[i].l, c0 = B.cost * Math.pow(B.rate, l);
  return Math.max(0, Math.floor(Math.log(S.cash * (B.rate - 1) / c0 + 1) / Math.log(B.rate)));
}
function buyN(i) { return S.buy === 'max' ? Math.max(1, bizMaxN(i)) : S.buy; }
function earn(x) { S.cash += x; S.earnRun += x; S.earnAll += x; }
function tickBiz(dt) {
  for (let i = 0; i < BIZ.length; i++) {
    const b = S.biz[i];
    if (b.l <= 0 || !(b.m || b.run)) continue;
    const T = bizTime(i); b.p += dt;
    if (b.p >= T) {
      if (b.m) { const n = Math.floor(b.p / T); earn(bizIncome(i) * n); b.p -= n * T; }
      else { earn(bizIncome(i)); b.p = 0; b.run = false; }
    }
  }
}
function offlineEarn(sec) {
  const cap = (2 + lv('offline')) * 3600, s = Math.min(sec, cap);
  const inc = incomePerSec(true) * s; earn(inc); return { s, inc, capped: sec > cap };
}
function bikePrice(id) { return BIKE[id].price * Math.pow(0.9, lv('contacts')) * (buffOn('sale') ? 0.6 : 1); }
function tuneCost(id, p, l) { const T = TUNES.find(x => x.id === p); return Math.max(1000, BIKE[id].price) * T.base * Math.pow(T.g, l) * (buffOn('sale') ? 0.6 : 1); }
function bikeStats(id) { return statsFor(BIKE[id], (S.bikes[id] || {}).tune || {}, lv('proqs')); }
const estCache = {};
function estET(id) {
  const t = (S.bikes[id] || {}).tune || {}; const key = id + JSON.stringify(t) + lv('proqs');
  if (!estCache[key]) estCache[key] = autoRun(bikeStats(id));
  return estCache[key];
}
function claimableRep() { return Math.max(0, Math.floor(10 * Math.sqrt(S.earnAll / 1e9)) - S.repEarned); }
function startCash() { const l = lv('start'); return l ? 1000 * Math.pow(8, l - 1) : 0; }
function racePayout() {
  let p = 60 * Math.pow(3.1, S.league) * (1 + 0.5 * S.lrace) + incomePerSec(false) * 20;
  p *= 1 + 0.5 * lv('sponsor');
  if (S.sponsor > 0) p *= 3;
  return Math.round(p);
}
const stockET = {};
function oppBikeFor(et) {
  let best = BIKES[0], d = 1e9;
  for (const b of BIKES) { if (!stockET[b.id]) stockET[b.id] = autoRun(statsFor(b, {}, 0)).et; const dd = Math.abs(stockET[b.id] - et); if (dd < d) { d = dd; best = b; } }
  return best;
}

if (!IS_BROWSER) { module.exports = { BIKES, BIKE, statsFor, autoRun, leagueInfo, BIZ, fmt }; }

/* =========================================================
   BROWSER / UI
   ========================================================= */
if (IS_BROWSER) (function () {
  const $ = s => document.querySelector(s);
  const view = $('#view');
  let tab = 'shop', selBike = null;

  /* ----- haptics (iOS 18 switch trick + vibrate fallback) ----- */
  let hLabel = null;
  function hapt(n) {
    if (!S.settings.haptics) return;
    if (navigator.vibrate) { try { navigator.vibrate(n > 1 ? [18, 50, 18] : 14); } catch (e) { } return; }
    if (!hLabel) {
      hLabel = document.createElement('label');
      hLabel.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none';
      const inp = document.createElement('input'); inp.type = 'checkbox'; inp.setAttribute('switch', '');
      hLabel.appendChild(inp); document.body.appendChild(hLabel);
    }
    hLabel.click();
    if (n > 1) setTimeout(() => hLabel && hLabel.click(), 80);
  }

  /* ----- sprites ----- */
  const TPL = {
    sport: [
      '...............ddd......',
      '..............dbbbl.....',
      '.......sss...dbbbbbl....',
      '......sbbbbbbbbbbbbbb...',
      '.....dbbbbbbbbbbbbbbbd..',
      '....ee.dbbkkkkkbbbbd....',
      '..wwwww..kkgggkk..wwwww.',
      '.wwrrrww..kgggk..wwrrrww',
      '.wrrkrrw...kkk...wrrkrrw',
      '.wwrrrww.........wwrrrww',
      '..wwwww...........wwwww.'],
    naked: [
      '..................kk....',
      '...............kkbbl....',
      '.......sss..bbbbbk......',
      '......ssbbbbbbbbbd......',
      '.....dd.kkkkkkk..d......',
      '....ee.kkgggggkk..d.....',
      '..wwwww.kgggggk..wwwww..',
      '.wwrrrww.kkkkk..wwrrrww.',
      '.wrrkrrw........wrrkrrw.',
      '.wwrrrww........wwrrrww.',
      '..wwwww..........wwwww..'],
    scooter: [
      '..................bk....',
      '.................bbl....',
      '........ssss.....bb.....',
      '.......bbbbbb....bb.....',
      '......bbbbbbbbbbbbb.....',
      '.....dbbbbbbbbbbbbd.....',
      '....ee.www..kk..www.....',
      '......wrrrw....wrrrw....',
      '......wrkrw....wrkrw....',
      '......wrrrw....wrrrw....',
      '.......www......www.....'],
  };
  const RIDER = ['..........hhhv..........', '.........hhhhvv.........', '........pppppp..........'];
  const sprCache = {};
  function sprite(bike, rider, sil) {
    const key = bike.id + (rider ? 'r' : '') + (sil ? 's' : '');
    if (sprCache[key]) return sprCache[key];
    const rows = (rider ? RIDER : []).concat(TPL[bike.type]);
    const c = document.createElement('canvas'); c.width = 24; c.height = rows.length;
    const x = c.getContext('2d');
    const pal = { b: bike.c1, d: bike.c2, k: '#111', w: '#151515', r: '#9a9aa8', s: '#2a2a2a', h: '#f4f4f4', v: '#2ef2ff', p: '#3a2f6b', g: '#666', e: '#c0c0c0', l: '#fff7a8' };
    rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; x.fillStyle = sil ? '#2e2950' : pal[ch]; x.fillRect(i, y, 1, 1); } });
    sprCache[key] = c; return c;
  }
  const urlCache = {};
  function spriteURL(bike, sil) { const k = bike.id + (sil ? 's' : ''); if (!urlCache[k]) urlCache[k] = sprite(bike, false, sil).toDataURL(); return urlCache[k]; }

  /* ----- toasts / modal / flash ----- */
  function toast(msg, cls) {
    const t = document.createElement('div'); t.className = 'toast ' + (cls || ''); t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  function modal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }

  /* ----- header ----- */
  function updateHeader() {
    $('#cash').textContent = money(S.cash);
    $('#ips').textContent = money(incomePerSec(true)) + '/S';
    $('#repTag').textContent = 'REP ' + fmt(repAvail()) + ' (+' + fmt(2 * repAvail()) + '%)';
    const chips = [];
    const add = (k, label, cls) => { if (buffOn(k)) chips.push(`<span class="chip ${cls}">${label} ${Math.ceil((S.buffs[k] - now()) / 1000)}s</span>`); };
    add('rich', 'x5 CASH', 'g'); add('turbo', 'x2 SPEED', 'c'); add('sale', 'SALE', 'y'); add('jam', 'JAMMED', 'r');
    if (S.sponsor > 0) chips.push(`<span class="chip y">SPONSOR x${S.sponsor}</span>`);
    $('#buffs').innerHTML = chips.join('');
  }

  /* ===== SHOP ===== */
  let rowRefs = [];
  function shopHTML() {
    let h = `<div class="mults">${[1, 10, 100, 'max'].map(v => `<button data-act="mult" data-v="${v}" class="${S.buy == v ? 'on' : ''}">${v === 'max' ? 'MAX' : 'x' + v}</button>`).join('')}</div>`;
    h += `<div class="sect">GARAGE JOBS</div>`;
    let teased = false;
    for (let i = 0; i < BIZ.length; i++) {
      const B = BIZ[i], b = S.biz[i];
      const vis = i === 0 || b.l > 0 || S.biz[i - 1].l > 0;
      if (i === 6 && (vis || !teased)) h += `<div class="sect">DEALERSHIP</div>`;
      if (!vis) {
        if (!teased) { h += `<div class="biz locked"><div class="tag">??</div><div class="mid"><div class="nm">??? LOCKED</div><div class="sm">BUY ${BIZ[i - 1].name} TO REVEAL</div></div></div>`; teased = true; }
        continue;
      }
      h += `<div class="biz" data-row="${i}">
        <div class="tag" style="background:${B.col}">${B.tag}</div>
        <div class="mid" data-act="work" data-i="${i}">
          <div class="r1"><span class="nm">${B.name}</span><span class="lv" data-lv></span></div>
          <div class="bar"><i data-bar></i><span data-inc></span></div>
          <div class="r3"><span class="sm" data-ms></span>${b.l ? (b.m ? '<span class="auto">AUTO</span>' : `<button class="hire" data-act="hire" data-i="${i}" data-hire>HIRE ${money(B.mgr)}</button>`) : ''}</div>
        </div>
        <button class="buy" data-act="buy" data-i="${i}" data-buy><span data-bn></span><b data-bc></b></button>
      </div>`;
    }
    h += `<div class="hint">TAP A JOB TO WORK IT. HIRE A MECHANIC TO AUTOMATE IT (EARNS OFFLINE TOO).</div>`;
    return h;
  }
  function bindShop() {
    rowRefs = [...view.querySelectorAll('[data-row]')].map(el => ({
      i: +el.dataset.row, el, lv: el.querySelector('[data-lv]'), bar: el.querySelector('[data-bar]'), inc: el.querySelector('[data-inc]'),
      ms: el.querySelector('[data-ms]'), buy: el.querySelector('[data-buy]'), bn: el.querySelector('[data-bn]'), bc: el.querySelector('[data-bc]'), hire: el.querySelector('[data-hire]'),
    }));
    updateShop(true);
  }
  function updateShop(full) {
    for (const r of rowRefs) {
      const i = r.i, b = S.biz[i], B = BIZ[i], T = bizTime(i);
      const pct = b.l === 0 ? 0 : (T < 0.15 && (b.m || b.run)) ? 100 : Math.min(100, b.p / T * 100);
      r.bar.style.width = pct + '%';
      if (full) {
        r.lv.textContent = 'LV ' + b.l;
        r.inc.textContent = b.l ? money(bizIncome(i)) + ' / ' + fmtTime(T) : 'BUY TO START';
        const ms = nextMilestone(b.l); r.ms.textContent = `LV ${ms.at}: ${ms.txt}`;
        const n = buyN(i), c = bizCost(i, n);
        r.bn.textContent = 'BUY x' + n; r.bc.textContent = money(c);
        r.buy.classList.toggle('no', S.cash < c);
        if (r.hire) r.hire.classList.toggle('no', S.cash < B.mgr);
        r.el.classList.toggle('idle', b.l > 0 && !b.m && !b.run);
      }
    }
  }

  /* ===== GARAGE ===== */
  function garageHTML() {
    if (!selBike) selBike = S.sel;
    const b = BIKE[selBike], own = !!S.bikes[selBike], st = bikeStats(selBike), est = estET(selBike);
    const t = own ? S.bikes[selBike].tune : {};
    let h = `<div class="panel detail">
      <div class="dtop"><img class="spr big" src="${spriteURL(b)}"><div>
        <div class="nm">${b.name}</div>
        <div class="sm">${b.gears === 1 ? 'CVT AUTO' : b.gears + '-SPEED'} · ${b.redline} RPM REDLINE</div>
        ${S.sel === selBike ? '<div class="pill g">RACE BIKE</div>' : ''}
      </div></div>
      <div class="statgrid">
        <span>POWER</span><b>${st.hp.toFixed(1)} HP</b>
        <span>WEIGHT</span><b>${Math.round(st.kg - 80)} KG</b>
        <span>GRIP</span><b>${st.grip.toFixed(2)} G</b>
        <span>TOP SPEED</span><b>${Math.round(st.vg[st.vg.length - 1] * MPH)} MPH</b>
        <span>SHIFT TIME</span><b>${st.cvt ? '—' : Math.round(st.shift * 1000) + ' MS'}</b>
        <span>PERFECT ET</span><b>${est.et.toFixed(2)}s @ ${Math.round(est.mph)}</b>
        <span>YOUR BEST</span><b>${S.best[selBike] ? S.best[selBike].toFixed(3) + 's' : '—'}</b>
      </div>`;
    if (!own) {
      const p = bikePrice(selBike);
      h += `<button class="btn wide ${S.cash < p ? 'no' : ''}" data-act="buybike" data-id="${selBike}">BUY ${money(p)}</button>
            <div class="sm c">EACH BIKE OWNED = +10% ALL INCOME</div>`;
    } else {
      if (S.sel !== selBike) h += `<button class="btn wide" data-act="setbike">SET AS RACE BIKE</button>`;
      h += `<div class="sect">TUNING</div>`;
      for (const T of TUNES) {
        if (T.noCVT && b.gears === 1) continue;
        const l = t[T.id] || 0, maxed = T.max && l >= T.max, c = tuneCost(selBike, T.id, l);
        h += `<div class="tune"><div><div class="nm">${T.name} <span class="lv">LV ${l}${T.max ? '/' + T.max : ''}</span></div><div class="sm">${T.desc}</div></div>
          <button class="buy sm2 ${maxed || S.cash < c ? 'no' : ''}" data-act="tune" data-p="${T.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : money(c)}</button></div>`;
      }
      if (b.gears > 1) {
        const g = t.gear || 0;
        h += `<div class="tune"><div><div class="nm">FINAL DRIVE <span class="lv">${g > 0 ? '+' + g : g}</span></div><div class="sm">+ SHORTER = PUNCHIER, LOWER TOP SPEED (FREE)</div></div>
          <div class="gearbtns"><button class="buy sm2" data-act="gear" data-d="-1">-</button><button class="buy sm2" data-act="gear" data-d="1">+</button></div></div>`;
      }
    }
    h += `</div><div class="sect">COLLECTION ${owned(S)}/${BIKES.length}</div><div class="grid">`;
    let cheapestUnowned = BIKES.find(x => !S.bikes[x.id]);
    for (const x of BIKES) {
      const o = !!S.bikes[x.id];
      const hidden = !o && x !== cheapestUnowned && bikePrice(x.id) > Math.max(S.cash, 1) * 3;
      h += `<div class="card ${o ? 'own' : ''} ${x.id === selBike ? 'sel' : ''}" data-act="pick" data-id="${x.id}">
        <img class="spr" src="${spriteURL(x, hidden)}">
        <div class="nm">${hidden ? '???' : x.name}</div>
        <div class="sm">${o ? (S.sel === x.id ? 'RACING' : 'OWNED') : money(bikePrice(x.id))}</div></div>`;
    }
    return h + '</div>';
  }

  /* ===== LEGACY ===== */
  function legacyHTML() {
    const c = claimableRep();
    let h = `<div class="panel c">
      <div class="sm">REPUTATION</div><div class="huge y">${fmt(repAvail())}</div>
      <div class="sm">+${fmt(repAvail() * 2)}% ALL INCOME (2% EACH, UNSPENT ONLY)</div>
      <div class="sep"></div>
      <div class="sm">REBUILD NOW FOR</div><div class="huge g">+${fmt(c)} REP</div>
      <div class="sm">RESETS CASH, JOBS, BIKES & LEAGUE. KEEPS REP, LEGACY, ACHIEVEMENTS & RECORDS.</div>
      <button class="btn wide ${c < 1 ? 'no' : ''}" data-act="prestige">REBUILD EMPIRE</button>
      <div class="sm dim">LIFETIME EARNED ${money(S.earnAll)} · REBUILDS ${S.prestiges}</div>
    </div><div class="sect">LEGACY SHOP (SPENDS REP)</div>`;
    for (const L of LEGACY) {
      const l = lv(L.id), maxed = l >= L.max, cost = L.cost(l);
      h += `<div class="tune"><div><div class="nm">${L.name} <span class="lv">LV ${l}/${L.max}</span></div><div class="sm">${L.desc}</div></div>
        <button class="buy sm2 ${maxed || repAvail() < cost ? 'no' : ''}" data-act="leg" data-id="${L.id}">${maxed ? 'MAX' : fmt(cost) + ' REP'}</button></div>`;
    }
    return h + `<div class="hint">SPENT REP NO LONGER GIVES THE +2% BONUS. CHOOSE WISELY.</div>`;
  }

  /* ===== STATS ===== */
  function statsHTML() {
    const st = S.stats, n = Object.keys(S.ach).length;
    let h = `<div class="sect">ACHIEVEMENTS ${n}/${ACH.length} (+${n}% INCOME)</div><div class="achs">`;
    for (const a of ACH) { const got = !!S.ach[a[0]]; h += `<div class="ach ${got ? 'got' : ''}"><div class="nm">${got ? '★ ' : ''}${a[1]}</div><div class="sm">${a[2]}</div></div>`; }
    h += `</div><div class="sect">STATS</div><div class="panel statgrid">
      <span>JOBS BY HAND</span><b>${fmt(st.taps)}</b>
      <span>RACES / WINS</span><b>${st.races} / ${st.wins}</b>
      <span>PERFECT SHIFTS</span><b>${st.perfects}</b>
      <span>FLAWLESS RUNS</span><b>${st.flawless}</b>
      <span>BEST ET</span><b>${st.bestET < 99 ? st.bestET.toFixed(3) + 's' : '—'}</b>
      <span>TOP TRAP</span><b>${Math.round(st.maxMph)} MPH</b>
      <span>EVENTS CLAIMED</span><b>${st.events}</b>
      <span>RED LIGHTS</span><b>${st.reds}</b>
    </div>
    <div class="sect">SETTINGS</div><div class="panel">
      <button class="btn wide" data-act="hapt">HAPTICS: ${S.settings.haptics ? 'ON' : 'OFF'}</button>
      <button class="btn wide alt" data-act="export">EXPORT SAVE</button>
      <button class="btn wide alt" data-act="import">IMPORT SAVE</button>
      <button class="btn wide red" data-act="reset">WIPE SAVE</button>
      <div class="sm dim c">MOTOADDICT v1 · BY KASENE08</div>
    </div>`;
    return h;
  }

  /* ===== RACE ===== */
  let R = null, rctx = null, pendingHapt = 0;
  const STARS = Array.from({ length: 40 }, () => [Math.random() * 240, Math.random() * 56, Math.random()]);
  function raceHTML() {
    const L = leagueInfo(S.league), et = L.ets[S.lrace], opp = oppBikeFor(et), est = estET(S.sel);
    return `<div class="panel league">
      <div class="r1"><span class="y">${L.name}</span><span>RACE ${S.lrace + 1}/3</span></div>
      <div class="sm">VS <b>${opp.name}</b> · THEIR ET <b class="r">${et.toFixed(2)}s</b></div>
      <div class="sm">WIN PAYS <b class="g">${money(racePayout())}</b>${S.sponsor > 0 ? ' (SPONSOR x3)' : ''}</div>
    </div>
    <div class="racewrap"><canvas id="rc" width="240" height="160"></canvas><div id="flash"></div></div>
    <div class="hud"><div>GEAR <b id="hG">N</b></div><div><b id="hS">0</b> MPH</div><div><b id="hD">1320</b> <span id="hDl">FT LEFT</span></div></div>
    <button id="rbtn" class="bigbtn">${R && R.phase !== 'done' ? '...' : 'STAGE'}</button>
    <div id="rres"></div>
    <div class="panel mybike" data-act="gotune">
      <img class="spr" src="${spriteURL(BIKE[S.sel])}">
      <div><div class="nm">${BIKE[S.sel].name}</div><div class="sm">PERFECT ET ${est.et.toFixed(2)}s · BEST ${S.best[S.sel] ? S.best[S.sel].toFixed(3) + 's' : '—'}</div><div class="sm c2">TAP TO TUNE ›</div></div>
    </div>
    <div class="hint">STAGE, WAIT FOR GREEN, TAP WHEN THE NEEDLE IS IN THE GREEN LAUNCH ZONE. THEN TAP TO SHIFT IN THE GREEN SHIFT ZONE. RED = LIMITER.</div>`;
  }
  function bindRace() {
    const c = $('#rc'); rctx = c.getContext('2d'); rctx.imageSmoothingEnabled = false;
    const btn = $('#rbtn');
    btn.addEventListener('pointerdown', e => { e.preventDefault(); raceTap(); });
    btn.addEventListener('pointerup', () => { if (pendingHapt) { hapt(pendingHapt); pendingHapt = 0; } });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    if (R && R.phase === 'done') showResult();
  }
  function setBtn(t, cls) { const b = $('#rbtn'); if (b) { b.textContent = t; b.className = 'bigbtn ' + (cls || ''); } }
  function flash(t, cls) { const f = $('#flash'); if (!f) return; f.textContent = t; f.className = ''; void f.offsetWidth; f.className = 'show ' + (cls || ''); }
  function newRace() {
    const L = leagueInfo(S.league);
    R = {
      phase: 'tree', st: bikeStats(S.sel), oppET: L.ets[S.lrace], oppRT: 0.17 + Math.random() * 0.18,
      t: 0, greenAt: 2.0 + Math.random() * 1.2, sweep: 0.3, sim: simInit(), rt: null, launchQ: null,
      perfects: 0, shifts: 0, allPerfect: true, myET: null, trap: 0, myTotal: 0, oppX: 0, shake: 0, flames: 0, foul: false, pay: 0, win: false,
    };
  }
  function raceTap() {
    if (!R || R.phase === 'done') { newRace(); setBtn('WAIT FOR GREEN', 'wait'); $('#rres').innerHTML = ''; return; }
    if (R.phase === 'tree') { if (R.t < R.greenAt) foul(); else launch(); return; }
    if (R.phase === 'run') shift();
  }
  function foul() {
    R.foul = true; S.stats.reds++; S.stats.races++; flash('RED LIGHT!', 'r'); pendingHapt = 2; endRace();
  }
  function launch(auto) {
    R.rt = R.t - R.greenAt;
    const f = R.sweep, c = 0.58, w = R.st.lw;
    if (auto) { R.sim.bogT = 0.7; R.launchQ = 'BOG'; flash('ASLEEP!', 'r'); }
    else if (Math.abs(f - c) <= w / 2) { R.launchQ = 'GREAT'; flash('GREAT LAUNCH!', 'g'); pendingHapt = 1; }
    else if (f > c) { R.sim.spinT = 0.9; R.launchQ = 'SPIN'; flash('WHEELSPIN!', 'r'); }
    else { R.sim.bogT = 0.7; R.launchQ = 'BOG'; flash('BOGGED!', 'r'); }
    R.phase = 'run'; R.shake = 6;
    setBtn(R.st.cvt ? 'HOLD ON!' : 'SHIFT', 'shift');
  }
  function shift() {
    const s = R.sim, st = R.st;
    if (st.cvt || s.shiftT > 0 || R.myET) return;
    if (s.gear >= st.vg.length - 1) { flash('TOP GEAR', 'y'); return; }
    const f = s.v / st.vg[s.gear];
    R.shifts++;
    if (f >= 0.88 && f < 0.985) { R.perfects++; S.stats.perfects++; s.boostT = 0.5; flash('PERFECT!', 'g'); pendingHapt = 1; }
    else { R.allPerfect = false; flash(f < 0.88 ? 'EARLY' : 'LATE', 'r'); }
    s.gear++; s.shiftT = st.shift; R.flames = 0.25;
  }
  function raceTick(dt) {
    if (!R) return;
    dt = Math.min(dt, 0.05);
    R.t += dt;
    if (R.shake > 0) R.shake = Math.max(0, R.shake - dt * 20);
    if (R.flames > 0) R.flames -= dt;
    if (R.phase === 'tree') {
      R.sweep = 0.45 + 0.38 * Math.sin(R.t * 5.2);
      if (R.t >= R.greenAt && !R.gshown) { R.gshown = true; setBtn('LAUNCH!', 'go'); }
      if (R.t > R.greenAt + 2.5) launch(true);
      return;
    }
    if (R.phase !== 'run') return;
    const steps = Math.max(1, Math.ceil(dt * 240));
    for (let k = 0; k < steps; k++) simStep(R.sim, R.st, dt / steps);
    if (R.sim.lim && !R.myET) R.shake = Math.max(R.shake, 1.2);
    if (!R.myET && R.sim.x >= QUARTER) { R.myET = R.sim.t; R.trap = R.sim.v; R.myTotal = R.rt + R.myET; }
    const tg = R.t - R.greenAt, ot = tg - R.oppRT;
    R.oppX = ot <= 0 ? 0 : ot < R.oppET ? QUARTER * Math.pow(ot / R.oppET, 1.7) : QUARTER + (1.7 * QUARTER / R.oppET) * (ot - R.oppET);
    const oppTotal = R.oppRT + R.oppET;
    if ((R.myET && tg >= Math.max(R.myTotal, oppTotal) + 0.6) || tg > 120) { S.stats.races++; endRace(); }
  }
  function endRace() {
    R.phase = 'done';
    const oppTotal = R.oppRT + R.oppET;
    R.win = !R.foul && !!R.myET && R.myTotal < oppTotal;
    if (R.myET) {
      const mph = R.trap * MPH;
      if (!S.best[S.sel] || R.myET < S.best[S.sel]) S.best[S.sel] = R.myET;
      S.stats.bestET = Math.min(S.stats.bestET, R.myET);
      S.stats.maxMph = Math.max(S.stats.maxMph, mph);
      if (!R.st.cvt && R.launchQ === 'GREAT' && R.allPerfect && R.perfects >= R.st.vg.length - 1) { S.stats.flawless++; R.flawless = true; }
    }
    if (R.win) {
      R.pay = racePayout(); earn(R.pay); S.stats.wins++;
      if (S.sponsor > 0) S.sponsor--;
      S.lrace++;
      if (S.lrace >= 3) { S.lrace = 0; S.league++; S.stats.bestLeague = Math.max(S.stats.bestLeague, S.league); R.cleared = true; toast('LEAGUE CLEARED! → ' + leagueInfo(S.league).name, 'y'); }
    }
    showResult(); save();
  }
  function showResult() {
    const el = $('#rres'); if (!el || !R) return;
    if (R.foul) {
      el.innerHTML = `<div class="res lose"><div class="big">RED LIGHT</div><div class="sm c">YOU LEFT BEFORE GREEN. DISQUALIFIED.</div></div>`;
      setBtn('RETRY', ''); return;
    }
    const opp = R.oppRT + R.oppET;
    el.innerHTML = `<div class="res ${R.win ? 'win' : 'lose'}">
      <div class="big">${R.win ? 'YOU WIN!' : 'YOU LOSE'}</div>
      ${R.flawless ? '<div class="pill g c">★ FLAWLESS RUN ★</div>' : ''}
      <div class="statgrid">
        <span>REACTION</span><b>${R.rt.toFixed(3)}</b>
        <span>LAUNCH</span><b class="${R.launchQ === 'GREAT' ? 'g' : 'r'}">${R.launchQ}</b>
        <span>YOUR ET</span><b>${R.myET ? R.myET.toFixed(3) + 's' : 'DNF'}</b>
        <span>TRAP</span><b>${Math.round(R.trap * MPH)} MPH</b>
        <span>OPP ET</span><b>${R.oppET.toFixed(3)}s (RT ${R.oppRT.toFixed(3)})</b>
        <span>MARGIN</span><b class="${R.win ? 'g' : 'r'}">${R.myET ? (opp - R.myTotal > 0 ? '+' : '') + (opp - R.myTotal).toFixed(3) + 's' : '—'}</b>
        ${R.st.cvt ? '' : `<span>SHIFTS</span><b>${R.perfects}/${R.shifts} PERFECT</b>`}
      </div>
      ${R.win ? `<div class="pay">+${money(R.pay)}</div>` : `<div class="sm c">TIP: TUNE IN THE GARAGE, OR NAIL YOUR SHIFTS.</div>`}
    </div>`;
    setBtn(R.win ? (R.cleared ? 'NEXT LEAGUE ›' : 'NEXT RACE ›') : 'RETRY', R.win ? 'go' : '');
    if (R.win) { const lg = view.querySelector('.league'); if (lg) { lg.outerHTML = raceHTML().split('<div class="racewrap">')[0]; } }
  }
  function drawRace() {
    if (!rctx) return;
    const c = rctx, W = 240;
    const sim = R ? R.sim : null;
    const myX = sim ? sim.x : 0;
    const sh = R && R.shake ? (Math.random() - 0.5) * R.shake : 0;
    c.save(); c.translate(Math.round(sh), Math.round(sh * 0.5));
    // sky
    c.fillStyle = '#120c24'; c.fillRect(-4, -4, W + 8, 64);
    for (const s of STARS) { c.fillStyle = s[2] > 0.7 ? '#ffffff' : '#6b5fa8'; c.fillRect(Math.floor((s[0] - myX * 0.05 + 2400) % 240), Math.floor(s[1]), 1, 1); }
    // stands (parallax)
    const off = (myX * 3 * 0.35) % 24, base = Math.floor(myX * 3 * 0.35 / 24);
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(i * 24 - off), idx = base + i;
      c.fillStyle = '#1f1838'; c.fillRect(x, 38, 23, 22);
      c.fillStyle = '#2b2350'; c.fillRect(x, 36, 23, 3);
      for (let k = 0; k < 10; k++) { const h = (idx * 37 + k * 13) % 7; c.fillStyle = ['#ff3d7f', '#2ef2ff', '#ffd23f', '#3dff7a', '#b06bff', '#e8e6ff', '#ff8a00'][h]; c.fillRect(x + 2 + (k % 5) * 4, 42 + Math.floor(k / 5) * 6, 2, 2); }
    }
    // track
    c.fillStyle = '#2a2838'; c.fillRect(-4, 60, W + 8, 70);
    c.fillStyle = '#e8e6ff'; c.fillRect(-4, 61, W + 8, 1); c.fillRect(-4, 128, W + 8, 1);
    const sx = m => Math.round(72 + (m - myX) * 3);
    // lane divider
    c.fillStyle = '#ffd23f';
    for (let m = Math.floor(myX / 4) * 4 - 20; m < myX + 80; m += 4) { const x = sx(m); c.fillRect(x, 95, 6, 1); }
    // speed streaks
    if (sim && sim.v > 25) { c.fillStyle = 'rgba(232,230,255,0.25)'; for (let k = 0; k < 8; k++) { const y = 64 + ((k * 23 + Math.floor(myX * 7)) % 62); const x = (k * 71 - myX * 9) % 260; c.fillRect(Math.floor((x + 520) % 260) - 10, y, 14 + sim.v / 4, 1); } }
    // distance boards
    const marks = [[0, 'START'], [18.288, '60FT'], [100.584, '330'], [201.168, '1/8'], [304.8, '1000'], [QUARTER, 'FINISH']];
    for (const [m] of marks) { const x = sx(m); if (x < -10 || x > 250) continue; c.fillStyle = '#e8e6ff'; c.fillRect(x, 62, 1, 66); }
    { // finish checker
      const x = sx(QUARTER);
      if (x > -10 && x < 250) for (let y = 62; y < 128; y += 3) for (let k = 0; k < 2; k++) { c.fillStyle = ((y / 3 + k) % 2 | 0) ? '#111' : '#f4f4f4'; c.fillRect(x + k * 3, y, 3, 3); }
      const s0 = sx(0); if (s0 > -10 && s0 < 250) { c.fillStyle = '#ff3d7f'; c.fillRect(s0, 62, 2, 66); }
    }
    // opponent
    const oppBike = oppBikeFor(R ? R.oppET : leagueInfo(S.league).ets[S.lrace]);
    const ox = sx(R ? R.oppX : 0) - 46;
    c.drawImage(sprite(oppBike, true), ox, 64, 48, 28);
    // player
    const me = BIKE[S.sel];
    const wheelie = sim && R.phase === 'run' && sim.t < 0.8 && R.launchQ === 'GREAT' ? 1 : 0;
    c.save(); c.translate(26, 97);
    if (wheelie) { c.translate(4, 28); c.rotate(-0.08); c.translate(-4, -28); }
    c.drawImage(sprite(me, true), 0, 0, 48, 28);
    c.restore();
    if (R && R.flames > 0) { c.fillStyle = '#ff8a00'; c.fillRect(28, 110, 6, 3); c.fillStyle = '#ffd23f'; c.fillRect(24, 111, 5, 1); }
    if (R && sim && sim.spinT > 0 && R.phase === 'run') { c.fillStyle = 'rgba(200,200,220,0.6)'; for (let k = 0; k < 6; k++) c.fillRect(26 - k * 4 + Math.random() * 3, 118 + Math.random() * 6, 4, 3); }
    // tree
    if (R && (R.phase === 'tree' || R.t < R.greenAt + 1.5)) {
      const tx = 114; c.fillStyle = '#0d0b18'; c.fillRect(tx - 2, 4, 16, 52); c.fillStyle = '#3a3554'; c.fillRect(tx + 5, 56, 2, 6);
      const lights = [R.greenAt - 1.5, R.greenAt - 1.0, R.greenAt - 0.5];
      lights.forEach((lt, i) => { c.fillStyle = R.t >= lt && R.t < R.greenAt + 0.6 ? '#ffb000' : '#3b2a00'; c.fillRect(tx + 2, 8 + i * 10, 8, 7); });
      c.fillStyle = R.foul ? '#ff2a2a' : '#3b0000'; c.fillRect(tx + 2, 38, 8, 7);
      c.fillStyle = (!R.foul && R.t >= R.greenAt) ? '#3dff7a' : '#003b10'; c.fillRect(tx + 2, 47, 8, 7);
    }
    c.restore();
    // tach
    c.fillStyle = '#0b0a14'; c.fillRect(0, 131, W, 29);
    const seg = 40, rpm = !R ? 0.2 : R.phase === 'tree' ? R.sweep : R.phase === 'run' || R.phase === 'done' ? (sim.shiftT > 0 ? Math.max(0.3, sim.rpm - 0.15) : sim.rpm) : 0.2;
    for (let i = 0; i < seg; i++) {
      const f = (i + 0.5) / seg, x = 8 + i * 5.6;
      let zone = '#2e2950', lit = '#e8e6ff';
      if (R && R.phase === 'tree') { if (Math.abs(f - 0.58) <= R.st.lw / 2) { zone = '#11502a'; lit = '#3dff7a'; } else if (f > 0.58) { lit = '#ff8a00'; } }
      else { if (f >= 0.88 && f < 0.985) { zone = '#11502a'; lit = '#3dff7a'; } else if (f >= 0.985) { zone = '#5a0d1d'; lit = '#ff2a2a'; } }
      c.fillStyle = f <= rpm ? lit : zone;
      c.fillRect(Math.round(x), 136, 4, 12);
    }
    c.fillStyle = '#8a86a8'; c.fillRect(8, 151, 224, 1);
    // HUD dom
    const hg = $('#hG'), hs = $('#hS'), hd = $('#hD'), hl = $('#hDl');
    if (hg) {
      hg.textContent = !R || R.phase === 'tree' ? 'N' : R.st.cvt ? 'D' : (sim.gear + 1);
      hs.textContent = sim ? Math.round(sim.v * MPH) : 0;
      if (R && R.myET) { hd.textContent = R.myET.toFixed(2); hl.textContent = 'ET'; }
      else { hd.textContent = Math.max(0, Math.round((QUARTER - myX) * 3.28084)); hl.textContent = 'FT LEFT'; }
    }
  }

  /* ===== EVENTS ===== */
  const EVENTS = [
    { id: 'rich',    w: 3, title: 'RICH CUSTOMER!',  txt: 'TAP: x5 INCOME FOR 30s', claim() { S.buffs.rich = now() + 30000; } },
    { id: 'tip',     w: 3, title: 'BIG TIP!',        txt: 'TAP: INSTANT CASH',      claim() { const v = Math.max(100, incomePerSec(false) * 90); earn(v); toast('+' + money(v), 'g'); } },
    { id: 'turbo',   w: 2, title: 'TURBO WRENCH!',   txt: 'TAP: JOBS 2x FASTER 45s',claim() { S.buffs.turbo = now() + 45000; } },
    { id: 'sale',    w: 2, title: 'PARTS SALE!',     txt: 'TAP: BIKES & TUNING -40% FOR 60s', claim() { S.buffs.sale = now() + 60000; } },
    { id: 'sponsor', w: 2, title: 'SPONSOR OFFER!',  txt: 'TAP: NEXT 3 RACE WINS PAY x3', claim() { S.sponsor = 3; } },
    { id: 'jam',     w: 2, neg: true, title: 'LIFT JAMMED!', txt: 'PAY TO FIX OR -50% INCOME FOR 60s', claim() { } },
  ];
  let EV = null, evTimer = 40;
  function spawnEvent() {
    const tot = EVENTS.reduce((a, e) => a + e.w, 0); let r = Math.random() * tot, e = EVENTS[0];
    for (const x of EVENTS) { r -= x.w; if (r <= 0) { e = x; break; } }
    EV = { e, left: 12, max: 12, cost: Math.max(50, incomePerSec(false) * 15) };
    evTimer = (90 + Math.random() * 150) / (1 + 0.2 * lv('luck'));
    renderEvent();
  }
  function renderEvent() {
    const el = $('#event');
    if (!EV) { el.className = 'hidden'; el.innerHTML = ''; return; }
    el.className = EV.e.neg ? 'neg' : '';
    el.innerHTML = `<div class="evt" data-act="evclaim"><div><div class="nm">${EV.e.title}</div><div class="sm">${EV.e.neg ? 'FIX FOR ' + money(EV.cost) + ' OR -50% INCOME 60s' : EV.e.txt}</div></div>
      <div class="evbtn">${EV.e.neg ? 'FIX' : 'CLAIM'}</div></div><div class="evbar"><i id="evbar"></i></div>`;
  }
  function eventsTick(dt) {
    if (EV) {
      EV.left -= dt;
      const b = $('#evbar'); if (b) b.style.width = (EV.left / EV.max * 100) + '%';
      if (EV.left <= 0) { if (EV.e.neg) { S.buffs.jam = now() + 60000; toast('LIFT JAMMED — INCOME -50%', 'r'); } EV = null; renderEvent(); }
      return;
    }
    evTimer -= dt;
    if (evTimer <= 0 && !document.hidden) spawnEvent();
  }
  function claimEvent() {
    if (!EV) return;
    if (EV.e.neg) { if (S.cash < EV.cost) { toast('NOT ENOUGH CASH TO FIX', 'r'); return; } S.cash -= EV.cost; toast('LIFT FIXED', 'g'); }
    else { EV.e.claim(); S.stats.events++; }
    hapt(1); EV = null; renderEvent(); refresh();
  }

  /* ===== ACH ===== */
  function checkAch() {
    for (const a of ACH) if (!S.ach[a[0]] && a[3](S)) { S.ach[a[0]] = now(); toast('★ ACHIEVEMENT: ' + a[1], 'y'); }
  }

  /* ===== render & actions ===== */
  function render() {
    if (tab !== 'race') { rctx = null; if (R && R.phase !== 'done') R = null; }
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'shop') { view.innerHTML = shopHTML(); bindShop(); }
    else if (tab === 'race') { view.innerHTML = raceHTML(); bindRace(); }
    else if (tab === 'garage') view.innerHTML = garageHTML();
    else if (tab === 'legacy') view.innerHTML = legacyHTML();
    else if (tab === 'stats') view.innerHTML = statsHTML();
  }
  function refresh() { if (tab === 'shop') updateShop(true); else if (tab === 'garage' || tab === 'legacy') { const y = view.scrollTop; render(); view.scrollTop = y; } }

  function act(a, el) {
    const i = +el.dataset.i;
    switch (a) {
      case 'mult': S.buy = el.dataset.v === 'max' ? 'max' : +el.dataset.v; render(); break;
      case 'work': {
        const b = S.biz[i]; if (b.l > 0 && !b.m && !b.run) { b.run = true; b.p = 0; S.stats.taps++; hapt(1); } break;
      }
      case 'buy': {
        const n = buyN(i), c = bizCost(i, n); if (S.cash < c) return;
        const before = S.biz[i].l; S.cash -= c; S.biz[i].l += n; hapt(1);
        const ms = MS_SPEED.find(t => before < t && S.biz[i].l >= t); if (ms) toast(BIZ[i].name + ' LV ' + ms + ': SPEED x2!', 'c');
        if (before === 0) render(); else updateShop(true);
        break;
      }
      case 'hire': {
        const B = BIZ[i]; if (S.cash < B.mgr || S.biz[i].m) return;
        S.cash -= B.mgr; S.biz[i].m = true; hapt(2); toast('MECHANIC HIRED: ' + B.name, 'g'); render(); break;
      }
      case 'pick': selBike = el.dataset.id; render(); view.scrollTop = 0; break;
      case 'buybike': {
        const id = el.dataset.id, p = bikePrice(id); if (S.cash < p || S.bikes[id]) return;
        S.cash -= p; S.bikes[id] = { tune: {} }; S.sel = id; hapt(2); toast('NEW BIKE: ' + BIKE[id].name, 'y'); render(); break;
      }
      case 'setbike': S.sel = selBike; hapt(1); render(); break;
      case 'tune': {
        const p = el.dataset.p, t = S.bikes[selBike].tune, l = t[p] || 0, T = TUNES.find(x => x.id === p);
        if (T.max && l >= T.max) return; const c = tuneCost(selBike, p, l); if (S.cash < c) return;
        S.cash -= c; t[p] = l + 1; hapt(1); refresh(); break;
      }
      case 'gear': { const t = S.bikes[selBike].tune; t.gear = Math.max(-4, Math.min(4, (t.gear || 0) + +el.dataset.d)); hapt(1); refresh(); break; }
      case 'leg': {
        const L = LEGACY.find(x => x.id === el.dataset.id), l = lv(L.id), c = L.cost(l);
        if (l >= L.max || repAvail() < c) return; S.repSpent += c; S.legacy[L.id] = l + 1; hapt(2); refresh(); break;
      }
      case 'prestige': {
        const g = claimableRep(); if (g < 1) { toast('EARN MORE FIRST (NEED $' + fmt(1e9 * Math.pow((S.repEarned + 1) / 10, 2)) + ' LIFETIME)', 'r'); return; }
        modal(`<div class="nm c">REBUILD EMPIRE?</div><div class="sm c">YOU GAIN <b class="g">+${fmt(g)} REP</b> (+${fmt(g * 2)}% INCOME).<br>CASH, JOBS, BIKES & LEAGUE RESET.</div>
          <button class="btn wide" data-act="doprestige">REBUILD</button><button class="btn wide alt" data-act="closemodal">CANCEL</button>`); break;
      }
      case 'doprestige': {
        const g = claimableRep(); if (g < 1) return;
        S.repEarned += g; S.prestiges++; S.cash = startCash(); S.earnRun = 0; S.biz = freshBiz();
        for (let k = 0; k < lv('crew'); k++) S.biz[k].m = true;
        S.bikes = { ruckus: { tune: {} } }; S.sel = 'ruckus'; selBike = 'ruckus'; S.league = 0; S.lrace = 0; S.buffs = {}; S.sponsor = 0; R = null;
        closeModal(); hapt(2); toast('EMPIRE REBUILT · +' + fmt(g) + ' REP', 'y'); save(); tab = 'shop'; render(); break;
      }
      case 'gotune': selBike = S.sel; tab = 'garage'; render(); break;
      case 'evclaim': claimEvent(); break;
      case 'hapt': S.settings.haptics = !S.settings.haptics; if (S.settings.haptics) hapt(2); render(); break;
      case 'export': {
        save(); const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
        modal(`<div class="nm c">EXPORT SAVE</div><textarea readonly id="ta">${code}</textarea><button class="btn wide" data-act="copy">COPY</button><button class="btn wide alt" data-act="closemodal">CLOSE</button>`); break;
      }
      case 'copy': { const ta = $('#ta'); ta.select(); try { navigator.clipboard.writeText(ta.value); toast('COPIED', 'g'); } catch (e) { document.execCommand('copy'); } break; }
      case 'import': modal(`<div class="nm c">IMPORT SAVE</div><textarea id="ta" placeholder="PASTE SAVE CODE"></textarea><button class="btn wide" data-act="doimport">LOAD</button><button class="btn wide alt" data-act="closemodal">CANCEL</button>`); break;
      case 'doimport': {
        try { applySave(JSON.parse(decodeURIComponent(escape(atob($('#ta').value.trim()))))); save(); closeModal(); toast('SAVE LOADED', 'g'); R = null; render(); }
        catch (e) { toast('BAD SAVE CODE', 'r'); } break;
      }
      case 'reset': modal(`<div class="nm c r">WIPE EVERYTHING?</div><div class="sm c">THIS DELETES ALL PROGRESS, REP & ACHIEVEMENTS. NO UNDO.</div><button class="btn wide red" data-act="doreset">WIPE</button><button class="btn wide alt" data-act="closemodal">CANCEL</button>`); break;
      case 'doreset': localStorage.removeItem(SAVE_KEY); S = defaultState(); R = null; selBike = null; closeModal(); tab = 'shop'; render(); break;
      case 'closemodal': closeModal(); break;
    }
    updateHeader();
  }

  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; hapt(1); render(); view.scrollTop = 0; return; }
    const el = e.target.closest('[data-act]');
    if (el && !el.classList.contains('no')) act(el.dataset.act, el);
    else if (el) toast('NOT ENOUGH CASH', 'r');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);

  /* ===== main loop ===== */
  let lastWall = Date.now(), uiAcc = 0, slowAcc = 0, saveAcc = 0;
  function frame() {
    const n = Date.now(); let dt = (n - lastWall) / 1000; lastWall = n;
    if (dt > 5) { const r = offlineEarn(dt); if (r.inc > 0) welcome(r); dt = 0; }
    tickBiz(dt);
    eventsTick(dt);
    if (tab === 'race') { raceTick(dt); drawRace(); }
    uiAcc += dt; slowAcc += dt; saveAcc += dt;
    if (tab === 'shop') updateShop(false);
    if (uiAcc > 0.2) { uiAcc = 0; updateHeader(); if (tab === 'shop') updateShop(true); }
    if (slowAcc > 1) { slowAcc = 0; checkAch(); }
    if (saveAcc > 5) { saveAcc = 0; save(); }
    requestAnimationFrame(frame);
  }
  function welcome(r) {
    modal(`<div class="nm c">WELCOME BACK</div><div class="sm c">YOUR MECHANICS WORKED ${fmtTime(r.s)}${r.capped ? ' (CAP HIT)' : ''}</div>
      <div class="huge g c">+${money(r.inc)}</div>${r.capped ? '<div class="sm c dim">UPGRADE NIGHT SHIFT IN LEGACY FOR A LONGER CAP</div>' : ''}
      <button class="btn wide" data-act="closemodal">LET'S GO</button>`);
  }

  /* ===== boot ===== */
  const had = load();
  if (had) { const away = (now() - S.last) / 1000; if (away > 10) { const r = offlineEarn(away); if (r.inc > 0) welcome(r); } }
  else modal(`<div class="nm c y">MOTOADDICT</div><div class="sm c">START WITH A HONDA RUCKUS AND A TIRE PATCH STAND.<br><br>GRIND JOBS → HIRE MECHANICS → BUY BIKES → TUNE → DOMINATE THE DRAG STRIP → REBUILD FOR REP.<br><br>IT NEVER ENDS.</div><button class="btn wide" data-act="closemodal">START ENGINE</button>`);
  S.last = now(); render(); updateHeader(); requestAnimationFrame(frame);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
