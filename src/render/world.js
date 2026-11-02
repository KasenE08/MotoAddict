// Isometric pixel-art dealership (Prison Empire Tycoon-style camera).
// Drawn at half resolution with hard edges, then scaled 2x with crisp pixels.
import { GLYPH } from './font.js';
import { renderBike3D } from './bike3d.js';
import { SPOTS } from '../data/showroom.js';

// The whole lot is drawn once into a big map canvas (1 map pixel = 2 CSS px);
// the screen is a draggable window onto it.
export const W = 940, H = 490;
const T = 12, OX = 452, OY = 144;
export const P = (x, y, z = 0) => [Math.round(OX + (x - y) * T), Math.round(OY + ((x + y) * T) / 2 - z * T)];
/** Map-pixel position of a tile point (used to aim the camera). */
export const toMap = (x, y, z = 0) => P(x, y, z);
let populated = true;
let glassCtx = null; // showroom front glass, drawn on its own layer above customers

// ---------- low-level pixel drawing ----------
let ctx;
const rect = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
function poly(pts, c) {
  ctx.fillStyle = c;
  const ys = pts.map((p) => p[1]);
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const xa = Math.ceil(xs[i] - 0.5), xb = Math.floor(xs[i + 1] - 0.5);
      if (xb >= xa) ctx.fillRect(xa, y, xb - xa + 1, 1);
    }
  }
}
function line(a, b, c) {
  ctx.fillStyle = c;
  let [x0, y0] = a; const [x1, y1] = b;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
const quad = (x, y, w, d, z, c) => poly([P(x, y, z), P(x + w, y, z), P(x + w, y + d, z), P(x, y + d, z)], c);
function box(x, y, z, w, d, h, [top, left, right], edge) {
  poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left);
  poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right);
  quad(x, y, w, d, z + h, top);
  if (edge) { line(P(x, y + d, z + h), P(x + w, y + d, z + h), edge); line(P(x + w, y, z + h), P(x + w, y + d, z + h), edge); }
}
function ellipse(cx, cy, r, z, c) {
  const pts = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z)); }
  poly(pts, c);
}
function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3); ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
// seeded random so the art is identical on every load
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export function text(str, px, py, color, shadow) {
  let cx = px;
  for (const ch of str) {
    const g = GLYPH[ch];
    if (!g) { cx += 3; continue; }
    g.forEach((row, ry) => [...row].forEach((v, rx) => {
      if (v !== '#') return;
      if (shadow) rect(shadow, cx + rx + 1, py + ry + 1, 1, 1);
      rect(color, cx + rx, py + ry, 1, 1);
    }));
    cx += g[0].length + 1;
  }
}
export const textW = (s) => [...s].reduce((n, ch) => n + (GLYPH[ch] ? GLYPH[ch][0].length + 1 : 3), -1);

// ---------- palette ----------
const C = {
  ink: '#120b1c', white: '#ffffff', cream: '#f4f0e6',
  grass: '#5fae3a', grass2: '#4f9a30', grass3: '#78c44a', hedge: '#3f8f2a', hedge2: '#2f6f20', hedge3: '#57b03c',
  conc: '#d5dae3', conc2: '#c4cad6', asph: '#4b5161', asph2: '#3f4552', road: '#3a3d48', line: '#f4f0e6', ylw: '#ffd23f',
  extL: '#e8b06a', extR: '#c27a3a', extT: '#fff1a8', intL: '#f4f0e6', intR: '#d5dae3', intT: '#ffffff',
  glass: 'rgba(166,225,255,0.55)', glassR: 'rgba(110,190,235,0.6)',
  wood: '#c27a3a', wood2: '#a8652e', carpet: '#5a4878', carpet2: '#4d3d69', blue: '#3a5fc4', blue2: '#33539f',
  tile: '#e6e9ef', tile2: '#cfd5e0', gray: '#8f97a8', gray2: '#7d8596', dirt: '#a8763e', dirt2: '#8a5f30',
  shadow: 'rgba(18,11,28,0.22)',
};


// ---------- 3D people (stacked shaded boxes, like PET's low-poly crowd) ----------
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};
const tri = (c) => [shade(c, 1.12), c, shade(c, 0.72)];
function person(x, y, opts = {}) {
  if (!populated) return;
  personDraw(x, y, opts);
}
function personDraw(x, y, { shirt, pants = '#2e323d', skin = '#e8b06a', hair = '#3d2b56', tie, mop, sit, hat, step = 0 } = {}) {
  ellipse(x, y, 0.28, 0, C.shadow);
  if (sit) {
    box(x - 0.14, y - 0.12, 0.42, 0.11, 0.42, 0.12, tri(pants));
    box(x + 0.03, y - 0.12, 0.42, 0.11, 0.42, 0.12, tri(pants));
    box(x - 0.17, y - 0.12, 0.5, 0.34, 0.2, 0.52, tri(shirt));
  } else {
    const l1 = step === 1 ? 0.08 : 0, l2 = step === 2 ? 0.08 : 0;
    box(x - 0.14, y - 0.06, l1, 0.11, 0.12, 0.8 - l1, tri(pants));
    box(x + 0.03, y - 0.06, l2, 0.11, 0.12, 0.8 - l2, tri(pants));
    box(x - 0.18, y - 0.1, 0.78, 0.36, 0.2, 0.55, tri(shirt));
  }
  const z0 = sit ? 0.5 : 0.78;
  box(x - 0.27, y - 0.06, z0 + 0.04, 0.09, 0.12, 0.48, tri(shirt));
  if (tie) box(x - 0.02, y + 0.1, z0 + 0.15, 0.05, 0.01, 0.36, tri(tie));
  box(x - 0.13, y - 0.12, z0 + 0.58, 0.26, 0.26, 0.28, tri(skin));
  box(x - 0.14, y - 0.13, z0 + 0.8, 0.28, 0.28, 0.1, tri(hat || hair));
  box(x - 0.14, y - 0.13, z0 + 0.58, 0.04, 0.28, 0.3, tri(hair));
  const [ex, ey] = P(x, y + 0.14, z0 + 0.74);
  rect(C.ink, ex - 2, ey, 1, 1); rect(C.ink, ex + 1, ey + 1, 1, 1);
  box(x + 0.18, y - 0.06, z0 + 0.04, 0.09, 0.12, 0.48, tri(shirt));
  if (mop) { box(x + 0.3, y + 0.05, 0, 0.05, 0.05, 1.2, tri('#c27a3a')); box(x + 0.15, y - 0.05, 0, 0.35, 0.25, 0.06, tri('#a6e1ff')); }
}

function tree(x, y, s = 1) {
  ellipse(x, y, 0.7 * s, 0, C.shadow);
  box(x - 0.1, y - 0.1, 0, 0.2, 0.2, 0.9 * s, tri('#6b4423'));
  const [sx, sy] = P(x, y, 0.9 * s + 0.9 * s);
  const r = Math.round(9 * s);
  disc(sx, sy, r, C.hedge2);
  disc(sx - 1, sy - 1, r - 1, C.hedge);
  disc(sx - 3, sy - 3, Math.max(2, Math.round(r / 2.4)), C.hedge3);
}

// ---------- 3D bikes ----------
const bikeCache = new Map();
// old mockup variant names -> roster ids
const MOCK_ID = { h2: 'ninja-h2', r1: 'yzf-r1', panigale: 'panigale-v2', s1000rr: 's1000rr', ninja500: 'ninja-500', cbr: 'cbr600rr', rsv4: 'rsv4-rr' };
function bike(v, x, y, deg, lift = 0) {
  if (!populated) return;
  showBike(MOCK_ID[v] || v, x, y, deg, lift);
}
function showBike(v, x, y, deg, lift = 0) {
  const k = `${v}|${deg}|${lift}`;
  if (!bikeCache.has(k)) bikeCache.set(k, renderBike3D(v, (deg * Math.PI) / 180, T, { lift }));
  const s = bikeCache.get(k);
  ellipse(x, y, 0.9, lift, C.shadow);
  const [sx, sy] = P(x, y);
  ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
}

// ---------- layout (tile = 1 m) — spacious: 14x10 showroom, ~6x6 side rooms ----------
const ROOMS = [
  { id: 'show', x0: 0, y0: 0, x1: 14, y1: 10 },
  { id: 'parts', x0: 14, y0: 0, x1: 20, y1: 6 },
  { id: 'service', x0: 14, y0: 6, x1: 22, y1: 13 },
  { id: 'detail', x0: 20, y0: 0, x1: 26, y1: 6 },
  { id: 'security', x0: 14, y0: -5, x1: 19, y1: 0 },
  { id: 'storage', x0: 0, y0: -6, x1: 14, y1: 0 },
  { id: 'finance', x0: -6, y0: 0, x1: 0, y1: 5 },
  { id: 'lounge', x0: -6, y0: 5, x1: 0, y1: 11 },
  { id: 'rest', x0: -6, y0: -4, x1: 0, y1: 0 },
];
const inRoom = (x, y) => ROOMS.find((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
const DOORS = new Set(['x:10:6', 'x:10:7', 'y:0:8', 'y:0:2', 'y:14:2', 'y:14:8', 'x:0:12', 'x:0:-3', 'x:13:17', 'x:13:18', 'x:6:23', 'x:6:24', 'y:19:-2', 'y:0:-2']);
const GLASS = (k) => /^x:10:\d+$/.test(k) || /^x:11:-\d$/.test(k);
const FLOORS = {
  show: (x, y) => ((x + y) % 2 ? C.tile : C.tile2),
  parts: (x, y) => (y % 2 ? C.wood : C.wood2),
  lounge: (x, y) => ((x + y) % 2 ? C.carpet : C.carpet2),
  detail: () => '#8fb8d0',
  finance: (x, y) => ((x + y) % 2 ? C.blue : C.blue2),
  rest: (x, y) => ((x + y) % 2 ? C.cream : C.intR),
  security: () => C.gray,
  storage: (x, y) => ((x * 3 + y) % 4 ? C.gray : C.gray2),
  service: (x, y) => ((x + y) % 3 ? '#6f7789' : '#646c7e'),
};

function ground() {
  rect(C.grass, 0, 0, W, H);
  seed = 11;
  for (let i = 0; i < 14000; i++) rect(rnd() > 0.5 ? C.grass2 : C.grass3, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
  quad(-7, -7, 34, 22, 0, C.conc);
  for (let x = -7; x < 27; x += 2) line(P(x, -7), P(x, 15), C.conc2);
  for (let y = -7; y < 15; y += 2) line(P(-7, y), P(27, y), C.conc2);
  for (let x = 0; x < 14; x++) for (let y = 10; y < 15; y++) quad(x, y, 1, 1, 0, (x + y) % 2 ? '#e2cfa8' : '#d2bb8e');
  quad(-7, 11.5, 6.5, 3.5, 0, C.grass);
  quad(-10, 15, 40, 5, 0, C.asph);
  for (let x = -9; x <= 28; x += 2.4) { line(P(x, 15.2), P(x, 17.3), C.line); line(P(x, 17.7), P(x, 19.8), C.line); }
  if (populated) {
    quad(22, 6, 6, 7, 0, C.dirt);
    seed = 3;
    for (let i = 0; i < 120; i++) { const [sx, sy] = P(22 + rnd() * 6, 6 + rnd() * 7); rect(C.dirt2, sx, sy, 1, 1); }
  } else quad(22, 6, 6, 7, 0, C.grass);
  quad(-14, 20, 50, 1, 0, C.conc2);
  quad(-14, 21, 50, 3.4, 0, C.road);
  for (let x = -14; x < 36; x += 2) quad(x, 22.6, 1, 0.2, 0, C.ylw);
}

function floors() {
  for (const r of ROOMS) for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < r.y1; y++) quad(x, y, 1, 1, 0, FLOORS[r.id](x, y));
  for (const [x, y] of [[2.6, 3.8], [9.2, 2.9], [4.1, 8.1], [11.6, 7.4], [8.3, 9.1], [12.8, 4.6]]) { const [sx, sy] = P(x, y); rect(C.white, sx, sy, 3, 1); }
  for (const [x, y] of [[19.6, 11.6], [16.0, 12.2]]) { const [sx, sy] = P(x, y); rect('#4b5161', sx - 3, sy, 7, 2); }
  ellipse(23, 3, 1.7, 0, '#5ab0e8');
  ellipse(23, 3, 1.15, 0, '#a6e1ff');
  quad(-4.2, 9.0, 2.4, 1.6, 0, '#ffd23f');
  quad(-4.0, 9.2, 2.0, 1.2, 0, '#ffe68a');
}

function walls(list) {
  const segs = new Set();
  for (const r of ROOMS) {
    for (let x = r.x0; x < r.x1; x++) { segs.add(`x:${r.y0}:${x}`); segs.add(`x:${r.y1}:${x}`); }
    for (let y = r.y0; y < r.y1; y++) { segs.add(`y:${r.x0}:${y}`); segs.add(`y:${r.x1}:${y}`); }
  }
  const t = 0.3, h = 1.0;
  for (const k of segs) {
    if (DOORS.has(k)) continue;
    const [ax, c, a] = k.split(':');
    const cc = +c, aa = +a;
    if (ax === 'x') {
      const inside = inRoom(aa + 0.5, cc + 0.5);
      const pal = inside ? [C.intT, C.intL, C.intR] : [C.extT, C.extL, C.extR];
      list.push({ d: aa + 0.5 + cc, f: () => {
        if (GLASS(k)) {
          const draw = () => { box(aa, cc - t / 2, 0, 1, t, 0.2, pal); box(aa, cc - t / 2, 0.2, 1, t, h - 0.2, [C.intT, C.glass, C.glassR]); line(P(aa + 0.2, cc + 0.15, 0.4), P(aa + 0.5, cc + 0.15, 0.85), 'rgba(255,255,255,0.8)'); };
          if (glassCtx && cc === 10) { const prev = ctx; ctx = glassCtx; draw(); ctx = prev; } else draw();
        }
        else box(aa, cc - t / 2, 0, 1, t, h, pal, inside ? null : '#e2a050');
      } });
    } else {
      const inside = inRoom(cc + 0.5, aa + 0.5);
      const pal = inside ? [C.intT, C.intL, C.intR] : [C.extT, C.extL, C.extR];
      list.push({ d: cc + aa + 0.5, f: () => box(cc - t / 2, aa, 0, t, 1, h, pal) });
    }
  }
}

const plantPot = (x, y) => { box(x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.35, tri('#c27a3a')); const [sx, sy] = P(x, y, 0.35); disc(sx, sy - 4, 4, C.hedge); disc(sx - 1, sy - 5, 2, C.hedge3); };
const trash = (x, y) => { if (!populated) return; const [sx, sy] = P(x, y); rect('#8a4a23', sx - 4, sy - 2, 9, 3); rect('#c27a3a', sx - 2, sy - 4, 5, 2); rect(C.cream, sx + 2, sy - 4, 2, 2); };

export async function renderDealership(canvas, opts = {}) {
  populated = opts.populated !== false;
  canvas.width = W; canvas.height = H;
  glassCtx = null;
  if (opts.glass) { opts.glass.width = W; opts.glass.height = H; glassCtx = opts.glass.getContext('2d'); glassCtx.imageSmoothingEnabled = false; }
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ground();
  floors();
  const L = [];
  const add = (d, f) => L.push({ d, f });
  walls(L);
  const plat = (x, y, w, d) => box(x, y, 0, w, d, 0.1, [C.white, C.intR, '#b8c1d4']);

  // ---- showroom (14x10): display spots driven by the player's inventory ----
  const cap = opts.capacity ?? 0;
  const onSpot = new Map((opts.display || []).map((d) => [d.spot, d]));
  SPOTS.slice(0, cap).forEach((sp) => {
    const shown = onSpot.get(sp.id);
    const sel = opts.selected && shown && shown.uid === opts.selected;
    if (sp.kind === 'feature') {
      add(sp.x + sp.y, () => {
        ellipse(sp.x, sp.y, 1.8, 0, '#5a4878');
        ellipse(sp.x, sp.y, 1.8, 0.12, sel ? '#ffd23f' : '#c2b6d6');
        ellipse(sp.x, sp.y, 1.4, 0.12, '#d5dae3');
        if (shown) showBike(shown.model, sp.x, sp.y, sp.h, 0.12);
      });
    } else {
      const alongX = Math.abs(Math.cos((sp.h * Math.PI) / 180)) >= Math.abs(Math.sin((sp.h * Math.PI) / 180));
      const [w, d] = alongX ? [2.5, 1.1] : [1.1, 2.5];
      add(sp.x + sp.y + 0.6, () => {
        box(sp.x - w / 2, sp.y - d / 2, 0, w, d, 0.1, sel ? ['#fff1a8', '#ffd23f', '#e09a00'] : sp.kind === 'window' ? ['#e6f4ff', '#bcd6ea', '#9fbcd4'] : [C.white, C.intR, '#b8c1d4']);
        if (shown) showBike(shown.model, sp.x, sp.y, sp.h, 0.1);
      });
    }
  });
  add(19.0, () => { box(12.6, 5.6, 0, 0.6, 2.2, 0.45, ['#5ab0e8', '#3a5fc4', '#1d2d6b'], '#a6e1ff'); box(12.65, 6.4, 0.45, 0.08, 0.45, 0.32, [C.ink, '#2e323d', C.ink]); });
  add(19.6, () => person(13.5, 6.7, { shirt: '#ffd23f', hair: '#8a4a23' }));
  for (const [x, y] of [[13.4, 0.6], [0.6, 9.4], [13.4, 9.4], [0.6, 2.4]]) add(x + y, () => plantPot(x, y));
  // ---- parts & gear (6x6) ----
  add(14.6, () => {
    box(14.4, 0.2, 0, 5.2, 0.5, 1.0, tri('#a8652e'));
    const cols = ['#e04a3a', '#ffd23f', '#3a5fc4', C.white, '#7ce35b', '#ff8a6b', '#1a1c22'];
    for (let i = 0; i < 10; i++) for (const z of [0.55, 0.95]) { const [sx, sy] = P(14.7 + i * 0.5, 0.7, z); rect(cols[(i + (z > 0.6 ? 3 : 0)) % 7], sx - 1, sy - 3, 3, 3); }
  });
  add(19.4, () => box(15.6, 3.4, 0, 2.0, 0.5, 0.45, tri('#f4f0e6')));
  add(19.4, () => person(16.6, 3.0, { shirt: '#ff8a6b', hair: C.ink }));
  add(21.6, () => person(17.0, 4.6, { shirt: '#5a4878', hair: '#8a4a23' }));
  add(22.6, () => box(19.0, 3.0, 0, 0.5, 1.8, 0.9, tri('#5a4878')));
  // ---- service bay (8x7) ----
  for (const [y, v] of [[7.0, 'rsv4'], [10.0, 'ninja500']]) add(15.5 + y + 1.2, () => { box(15.5, y, 0, 3.0, 1.0, 0.28, tri('#2e323d')); line(P(15.5, y + 1, 0.28), P(18.5, y + 1, 0.28), C.ylw); bike(v, 17.0, y + 0.5, 0, 0.28); });
  add(27.5, () => person(19.6, 8.0, { shirt: '#ff8a6b', pants: '#ff8a6b', hair: '#3d2b56' }));
  add(27.9, () => box(21.0, 6.4, 0, 0.6, 1.4, 0.8, ['#ff6b5a', '#e04a3a', '#7a1f2b'], '#ff8a6b'));
  add(33.0, () => { for (let i = 0; i < 3; i++) ellipse(21.0, 12.0, 0.35, i * 0.18, i % 2 ? '#2e323d' : '#1a1c22'); });
  // ---- detailing (6x6) ----
  add(26, () => bike('cbr', 23, 3, -35));
  add(27.9, () => person(24.4, 3.6, { shirt: '#5ab0e8', hair: C.ink }));
  add(26.4, () => { for (const [x, y] of [[22.2, 2.5], [22.6, 3.8], [23.8, 2.2]]) { const [sx, sy] = P(x, y, 0.4); rect(C.white, sx, sy, 2, 2); rect(C.white, sx + 3, sy - 2, 1, 1); } });
  // ---- security / storage / restrooms (mostly behind the top bar) ----
  add(13.2, () => { box(15.0, -3.2, 0, 2.0, 0.6, 0.45, tri('#4b5161')); for (const x of [15.2, 16.0]) box(x, -3.15, 0.45, 0.45, 0.08, 0.3, ['#120b1c', '#5ab0e8', '#120b1c']); });
  add(12.6, () => person(16.2, -3.6, { shirt: '#1d2d6b', hair: C.ink, hat: '#1d2d6b' }));
  for (const [x, y] of [[1, -5.4], [2, -5.4], [1, -4.4], [12.4, -5.2], [12.4, -1.4], [4.0, -1.3]]) add(x + y + 0.8, () => box(x, y, 0, 0.8, 0.8, 0.7, tri('#c27a3a')));
  for (const [x, y] of [[6.0, -5.0], [6.0, -3.4]]) add(x + y + 1.6, () => box(x, y, 0, 2.4, 0.7, 0.75, tri('#d2bb8e')));
  for (const x of [-5.4, -4.2, -3.0]) add(x - 2.6, () => box(x, -3.8, 0, 0.08, 1.6, 0.75, tri('#e6e9ef')));
  // ---- finance (6x5) ----
  add(-2.0, () => person(-3.4, 1.6, { shirt: '#2e323d', tie: '#ffd23f', hair: '#a2a9b8' }));
  add(-1.2, () => box(-4.4, 2.0, 0, 2.0, 0.6, 0.45, tri('#6b4423')));
  add(0.0, () => person(-3.4, 3.4, { shirt: '#e04a3a', hair: C.ink, sit: true }));
  add(-5.0, () => box(-5.7, 0.3, 0, 0.5, 0.8, 0.85, tri('#8f97a8')));
  add(4.0, () => plantPot(-0.6, 4.4));
  // ---- lounge (6x6) ----
  add(1.4, () => { box(-5.8, 6.0, 0, 0.3, 3.0, 0.75, tri('#c4382b')); box(-5.5, 6.0, 0, 0.55, 3.0, 0.38, tri('#e04a3a')); });
  add(1.6, () => person(-5.2, 6.9, { shirt: '#3a5fc4', hair: '#ffd23f', sit: true }));
  add(2.9, () => person(-5.2, 8.1, { shirt: '#f4f0e6', hair: '#3d2b56', skin: '#8a4a23', sit: true }));
  add(2.6, () => box(-4.2, 6.6, 0, 0.7, 1.4, 0.22, tri('#a8652e')));
  add(0.4, () => { box(-2.4, 5.2, 0, 2.0, 0.5, 0.55, tri('#a2a9b8')); box(-1.6, 5.3, 0.55, 0.35, 0.3, 0.3, tri('#2e323d')); });
  add(0.2, () => { poly([P(-5.4, 5.16, 0.85), P(-3.4, 5.16, 0.85), P(-3.4, 5.16, 0.4), P(-5.4, 5.16, 0.4)], C.ink); poly([P(-5.3, 5.17, 0.8), P(-3.5, 5.17, 0.8), P(-3.5, 5.17, 0.45), P(-5.3, 5.17, 0.45)], '#3a5fc4'); });
  add(5.9, () => { box(-3.6, 9.6, 0, 0.3, 0.3, 0.3, tri('#e04a3a')); box(-2.6, 9.4, 0, 0.35, 0.25, 0.2, tri('#3a5fc4')); });
  add(10.0, () => trash(-1.2, 10.0));
  // ---- plaza: outdoor display, sign, flags ----
  add(15.6, () => bike('r1', 3.0, 12.6, -30));
  add(23.6, () => bike('ninja500', 10.8, 12.8, -60));
  add(19.6, () => person(7.8, 11.8, { shirt: '#ffd23f', hair: C.ink, skin: '#8a4a23' }));
  for (const [x, y, c] of [[13.6, 10.6, '#e04a3a'], [13.6, 14.4, '#3a5fc4'], [1.4, 14.4, '#ffd23f']]) add(x + y, () => { box(x - 0.04, y - 0.04, 0, 0.08, 0.08, 2.2, tri('#a2a9b8')); const [sx, sy] = P(x, y, 2.2); rect(c, sx + 1, sy, 8, 5); rect(C.white, sx + 1, sy + 5, 8, 1); });
  add(19.0, () => {
    box(4.6, 14.3, 0, 0.25, 0.25, 1.2, tri('#4b5161'));
    const [sx, sy] = P(4.72, 14.42, 1.2), s = 'MOTOADDICT', w = textW(s);
    rect(C.ink, sx - w / 2 - 3, sy - 11, w + 6, 11); rect('#c4382b', sx - w / 2 - 2, sy - 10, w + 4, 9);
    text(s, Math.round(sx - w / 2), sy - 8, '#fff1a8', '#7a1f2b');
  });
  add(22.0, () => box(7.6, 14.3, 0, 1.8, 0.4, 0.3, tri('#c27a3a')));
  // ---- parking ----
  const car = (x, y, col) => populated && add(x + y + 1.2, () => {
    ellipse(x + 0.5, y + 1, 1.1, 0, C.shadow);
    box(x, y, 0.1, 1.0, 2.0, 0.42, tri(col));
    box(x + 0.05, y + 0.45, 0.52, 0.9, 1.0, 0.32, ['#a6e1ff', shade(col, 0.95), shade(col, 0.7)]);
  });
  car(-4.0, 15.3, '#e04a3a'); car(3.4, 15.3, '#e6e9ef'); car(15.4, 17.8, '#3a5fc4'); car(-6.4, 17.8, '#2e323d'); car(18.2, 15.3, '#ffd23f');
  add(26.2, () => bike('s1000rr', 10.0, 16.2, 90));
  add(27.0, () => bike('panigale', 10.8, 16.2, 90));
  add(25.4, () => person(8.6, 16.8, { shirt: '#c2b6d6', hair: '#ffd23f' }));
  for (const [x, y] of [[6.6, 17.5], [21.6, 15.4]]) add(x + y, () => { box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 2.0, tri('#4b5161')); const [sx, sy] = P(x, y, 2.0); rect('#fff1a8', sx - 2, sy - 1, 5, 2); });
  // ---- landscaping + expansion plot ----
  for (let i = 0; i <= 6; i++) add(22 + i + 6, () => box(22 + i - 0.05, 5.95, 0, 0.1, 0.1, 0.5, tri('#a8652e')));
  for (let i = 0; i <= 7; i++) add(22 + 6 + i, () => box(21.95, 6 + i - 0.05, 0, 0.1, 0.1, 0.5, tri('#a8652e')));
  if (populated) add(29.0, () => {
    box(22.9, 6.9, 0, 0.12, 0.12, 1.9, tri('#6b4423'));
    const [sx, sy] = P(22.96, 6.96, 1.9);
    rect(C.ink, sx - 13, sy - 13, 27, 14); rect(C.ylw, sx - 12, sy - 12, 25, 12);
    text('BUILD', sx - 9, sy - 11, C.ink); text('$45K', sx - 7, sy - 5, '#7a1f2b');
  });
  for (const [x, y, s] of [[-6.6, 12.4, 1.1], [-4.4, 13.6, 0.9], [-2.2, 12.6, 1], [27, 1, 1.1], [28.5, 5, 1], [-8.5, 2, 1.2], [-8.6, 8, 1], [29, 10, 1.2], [26, -3, 1], [2, 26, 1.2], [12, 26.5, 1], [20, 26, 1.1], [-12, -6, 1.2], [-14, 4, 1], [-12, 14, 1.1], [-16, 20, 1.2], [6, -12, 1.1], [18, -11, 1], [30, -6, 1.2], [33, 4, 1], [34, 16, 1.1], [26, 28, 1.2], [-6, 28, 1], [8, 30, 1.1], [-20, 10, 1], [-4, -14, 1.2], [38, 10, 1]]) {
    add(x + y + 0.3, () => tree(x, y, s));
  }

  L.sort((a, b) => a.d - b.d).forEach((o) => o.f());

  // ---- overlays ----
  if (!populated) return canvas;
  const pop = '+$32,700';
  { const [px, py] = P(6.0, 5.0, 2.6), w = textW(pop), x0 = px - Math.round(w / 2); rect(C.ink, x0 - 3, py - 3, w + 6, 11); rect('#3f9d3a', x0 - 2, py - 2, w + 4, 9); text(pop, x0, py, '#fff1a8', '#1f4f2a'); }
  { const [sx, sy] = P(4.0, 7.4, 2.1); rect(C.ink, sx - 4, sy - 10, 9, 11); rect(C.white, sx - 3, sy - 9, 7, 9); rect('#e04a3a', sx, sy - 8, 1, 5); rect('#e04a3a', sx, sy - 2, 1, 1); rect(C.ink, sx - 1, sy + 1, 2, 2); }
  { const [sx, sy] = P(8.8, 2.6, 2.1); rect(C.ink, sx - 7, sy - 10, 15, 10); rect(C.white, sx - 6, sy - 9, 13, 8); rect('#3a5fc4', sx - 3, sy - 7, 7, 2); rect(C.ink, sx - 4, sy - 5, 2, 2); rect(C.ink, sx + 3, sy - 5, 2, 2); rect(C.white, sx - 1, sy, 2, 1); rect(C.white, sx - 2, sy + 2, 1, 1); }
  { const [sx, sy] = P(5.0, 9.6, 0.1); const s = '9/12', w = textW(s) + 9; rect(C.ink, sx - 2, sy - 4, w, 9); rect('#2a1d3d', sx - 1, sy - 3, w - 2, 7); rect('#7ce35b', sx, sy - 2, 3, 2); rect(C.ink, sx, sy, 1, 1); rect(C.ink, sx + 2, sy, 1, 1); text(s, sx + 5, sy - 2, C.white); }
  { const [sx, sy] = P(17.0, 7.5, 1.9); rect(C.ink, sx - 3, sy - 3, 7, 7); rect('#ffd23f', sx - 2, sy - 2, 5, 5); rect('#c27a3a', sx, sy - 1, 1, 3); }
  return canvas;
}

/** Which display spot (if any) is under a map-pixel point. Front-most first. */
export function spotAt(mx, my, cap) {
  const list = SPOTS.slice(0, cap).map((s) => ({ s, p: P(s.x, s.y) })).sort((a, b) => b.p[1] - a.p[1]);
  for (const { s, p } of list) if (Math.abs(mx - p[0]) < 24 && my > p[1] - 30 && my < p[1] + 9) return s.id;
  return null;
}

/**
 * Draw people onto a transparent layer. people: [{x, y, look:{shirt, pants, skin, hair, tie, hat}, step, bubble}]
 */
export function drawPeople(canvas, people) {
  if (canvas.width !== W) { canvas.width = W; canvas.height = H; }
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  const prev = ctx;
  ctx = c;
  for (const p of [...people].sort((a, b) => a.x + a.y - (b.x + b.y))) {
    personDraw(p.x, p.y, { ...p.look, step: p.step });
    if (p.bubble) bubble(p.x, p.y, p.bubble);
  }
  ctx = prev;
}

function bubble(x, y, kind) {
  const [sx, sy0] = P(x, y, 2.05);
  const sy = sy0 - 2;
  if (kind === '!') {
    rect(C.ink, sx - 4, sy - 10, 9, 11); rect(C.white, sx - 3, sy - 9, 7, 9);
    rect('#e04a3a', sx, sy - 8, 1, 5); rect('#e04a3a', sx, sy - 2, 1, 1); rect(C.ink, sx - 1, sy + 1, 2, 2);
  } else if (kind === '...') {
    rect(C.ink, sx - 6, sy - 7, 13, 8); rect(C.white, sx - 5, sy - 6, 11, 6);
    for (const dx of [-3, 0, 3]) rect(C.ink, sx + dx, sy - 3, 1, 1);
  } else if (kind === '$') {
    rect(C.ink, sx - 4, sy - 9, 9, 9); rect('#ffd23f', sx - 3, sy - 8, 7, 7); rect('#a8652e', sx, sy - 7, 1, 5); rect('#a8652e', sx - 1, sy - 6, 3, 1); rect('#a8652e', sx - 1, sy - 4, 3, 1);
  }
}
