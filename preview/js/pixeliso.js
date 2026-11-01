// Isometric pixel-art dealership (Prison Empire Tycoon-style camera), landscape.
// Drawn at half resolution with hard edges, then scaled 2x with crisp pixels.
import { GLYPH } from './styles/pixel.js';
import { renderBike3D } from './bike3d.js';

// Landscape: 422x195 pixels, shown at 2x on an 844x390 (iPhone landscape) screen.
export const W = 422, H = 195;
const T = 12, OX = 199, OY = 41;
export const P = (x, y, z = 0) => [Math.round(OX + (x - y) * T), Math.round(OY + ((x + y) * T) / 2 - z * T)];

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
function person(x, y, { shirt, pants = '#2e323d', skin = '#e8b06a', hair = '#3d2b56', tie, mop, sit, hat } = {}) {
  ellipse(x, y, 0.28, 0, C.shadow);
  if (sit) {
    box(x - 0.14, y - 0.12, 0.42, 0.11, 0.42, 0.12, tri(pants));
    box(x + 0.03, y - 0.12, 0.42, 0.11, 0.42, 0.12, tri(pants));
    box(x - 0.17, y - 0.12, 0.5, 0.34, 0.2, 0.52, tri(shirt));
  } else {
    box(x - 0.14, y - 0.06, 0, 0.11, 0.12, 0.8, tri(pants));
    box(x + 0.03, y - 0.06, 0, 0.11, 0.12, 0.8, tri(pants));
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
function bike(v, x, y, deg, lift = 0) {
  const k = `${v}|${deg}|${lift}`;
  if (!bikeCache.has(k)) bikeCache.set(k, renderBike3D(v, (deg * Math.PI) / 180, T, { lift }));
  const s = bikeCache.get(k);
  ellipse(x, y, 0.9, lift, C.shadow);
  const [sx, sy] = P(x, y);
  ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
}

// ---------- layout (tile = 1 m) ----------
const ROOMS = [
  { id: 'show', x0: 0, y0: 0, x1: 10, y1: 8 },
  { id: 'parts', x0: 10, y0: 0, x1: 14, y1: 4 },
  { id: 'service', x0: 10, y0: 4, x1: 16, y1: 9 },
  { id: 'detail', x0: 14, y0: 0, x1: 18, y1: 4 },
  { id: 'security', x0: 10, y0: -3, x1: 13, y1: 0 },
  { id: 'storage', x0: 0, y0: -5, x1: 10, y1: 0 },
  { id: 'lounge', x0: 0, y0: 8, x1: 4, y1: 12 },
  { id: 'finance', x0: -4, y0: 4, x1: 0, y1: 8 },
  { id: 'rest', x0: -4, y0: 0, x1: 0, y1: 4 },
];
const inRoom = (x, y) => ROOMS.find((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
const DOORS = new Set(['x:8:6', 'x:8:7', 'x:8:2', 'y:10:1', 'y:10:6', 'y:0:7', 'y:0:1', 'x:0:8', 'x:9:13', 'x:9:14', 'x:4:16', 'x:4:17', 'y:13:-1', 'y:4:10']);
const GLASS = (k) => /^x:8:(4|5|8|9)$/.test(k) || /^x:12:(0|1|2|3)$/.test(k);
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
  for (let i = 0; i < 2600; i++) rect(rnd() > 0.5 ? C.grass2 : C.grass3, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
  quad(-4.5, -5.5, 23, 18, 0, C.conc);
  for (let x = -4; x < 19; x += 2) line(P(x, -5.5), P(x, 12.5), C.conc2);
  for (let y = -5; y < 13; y += 2) line(P(-4.5, y), P(18.5, y), C.conc2);
  quad(-4.5, 8, 4.5, 4.5, 0, C.grass);
  quad(18, -5.5, 3, 9.5, 0, C.grass);
  for (let x = 4; x < 10; x++) for (let y = 8; y < 12; y++) quad(x, y, 1, 1, 0, (x + y) % 2 ? '#e2cfa8' : '#d2bb8e');
  quad(-6, 12.5, 26, 4, 0, C.asph);
  for (let x = -5; x <= 19; x += 2.2) { line(P(x, 12.7), P(x, 14.4), C.line); line(P(x, 14.6), P(x, 16.3), C.line); }
  quad(16, 4, 4.5, 5, 0, C.dirt);
  seed = 3;
  for (let i = 0; i < 90; i++) { const [sx, sy] = P(16 + rnd() * 4.5, 4 + rnd() * 5); rect(C.dirt2, sx, sy, 1, 1); }
  quad(-12, 16.5, 40, 1, 0, C.conc2);
  quad(-12, 17.5, 40, 3.4, 0, C.road);
  for (let x = -12; x < 28; x += 2) quad(x, 19.1, 1, 0.2, 0, C.ylw);
  quad(-12, 20.9, 40, 1, 0, C.conc2);
}

function floors() {
  for (const r of ROOMS) for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < r.y1; y++) quad(x, y, 1, 1, 0, FLOORS[r.id](x, y));
  for (const [x, y] of [[2.3, 3.2], [7.2, 2.4], [3.4, 6.3], [8.1, 5.6], [6.4, 7.1]]) { const [sx, sy] = P(x, y); rect(C.white, sx, sy, 3, 1); }
  for (const [x, y] of [[15.2, 7.6], [12.6, 8.4]]) { const [sx, sy] = P(x, y); rect('#4b5161', sx - 3, sy, 7, 2); }
  ellipse(16, 2, 1.5, 0, '#5ab0e8');
  ellipse(16, 2, 1.0, 0, '#a6e1ff');
  quad(1.4, 10.4, 2.3, 1.4, 0, '#ffd23f');
  quad(1.6, 10.6, 1.9, 1.0, 0, '#ffe68a');
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
        if (GLASS(k)) { box(aa, cc - t / 2, 0, 1, t, 0.2, pal); box(aa, cc - t / 2, 0.2, 1, t, h - 0.2, [C.intT, C.glass, C.glassR]); line(P(aa + 0.2, cc + 0.15, 0.4), P(aa + 0.5, cc + 0.15, 0.85), 'rgba(255,255,255,0.8)'); }
        else box(aa, cc - t / 2, 0, 1, t, h, pal, inside ? null : '#e2a050');
      } });
    } else {
      const inside = inRoom(cc + 0.5, aa + 0.5);
      const pal = inside ? [C.intT, C.intL, C.intR] : [C.extT, C.extL, C.extR];
      list.push({ d: cc + aa + 0.5, f: () => box(cc - t / 2, aa, 0, t, 1, h, pal) });
    }
  }
}

export async function renderDealership(canvas) {
  canvas.width = W; canvas.height = H;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ground();
  floors();
  const L = [];
  const add = (d, f) => L.push({ d, f });
  walls(L);
  const plat = (x, y, w, d) => box(x, y, 0, w, d, 0.1, [C.white, C.intR, '#b8c1d4']);

  // ---- showroom: spacious, bikes on platforms, hero H2 on a turntable ----
  add(1.5, () => plat(1.0, 0.4, 8.0, 1.3));
  for (const [v, x] of [['r1', 2.4], ['panigale', 5.0], ['s1000rr', 7.6]]) add(x + 1.05, () => bike(v, x, 1.05, -25, 0.1));
  add(4.6, () => plat(0.4, 1.8, 1.3, 3.9));
  for (const [v, y] of [['ninja500', 2.8], ['cbr', 4.8]]) add(1.05 + y, () => bike(v, 1.05, y, 65, 0.1));
  add(9.8, () => {
    ellipse(5.4, 4.4, 1.6, 0, '#5a4878');
    ellipse(5.4, 4.4, 1.6, 0.12, '#c2b6d6');
    ellipse(5.4, 4.4, 1.25, 0.12, '#d5dae3');
    bike('h2', 5.4, 4.4, -20, 0.12);
  });
  add(14.6, () => { box(8.0, 6.3, 0, 1.6, 0.5, 0.45, ['#5ab0e8', '#3a5fc4', '#1d2d6b'], '#a6e1ff'); box(8.6, 6.35, 0.45, 0.45, 0.08, 0.32, [C.ink, '#2e323d', C.ink]); });
  add(14.3, () => person(8.8, 5.95, { shirt: '#ffd23f', hair: '#8a4a23' }));
  add(10.0, () => person(3.4, 6.6, { shirt: '#3a5fc4', skin: '#8a4a23', hair: C.ink }));
  add(10.9, () => person(4.0, 6.9, { shirt: C.white, tie: '#e04a3a', pants: '#2e323d' }));
  add(8.9, () => person(6.6, 2.3, { shirt: '#7ce35b', hair: '#ffd23f' }));
  add(14.5, () => person(6.9, 7.6, { shirt: '#e04a3a', hair: '#3d2b56', skin: '#c27a3a' }));
  add(11.6, () => { const [sx, sy] = P(8.3, 3.3); rect('#8a4a23', sx - 4, sy - 2, 9, 3); rect('#c27a3a', sx - 2, sy - 4, 5, 2); rect(C.cream, sx + 2, sy - 4, 2, 2); });
  add(11.9, () => person(9.0, 2.9, { shirt: '#2a8f9a', hair: '#1d2d6b', mop: true }));
  for (const [x, y] of [[9.5, 0.6], [0.6, 7.4], [9.5, 7.5]]) add(x + y, () => { box(x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.35, tri('#c27a3a')); const [sx, sy] = P(x, y, 0.35); disc(sx, sy - 4, 4, C.hedge); disc(sx - 1, sy - 5, 2, C.hedge3); });
  // ---- parts & gear ----
  add(10.5, () => {
    box(10.3, 0.2, 0, 3.4, 0.5, 1.0, tri('#a8652e'));
    const cols = ['#e04a3a', '#ffd23f', '#3a5fc4', C.white, '#7ce35b', '#ff8a6b', '#1a1c22'];
    for (let i = 0; i < 7; i++) for (const z of [0.55, 0.95]) { const [sx, sy] = P(10.55 + i * 0.47, 0.7, z); rect(cols[(i + (z > 0.6 ? 3 : 0)) % 7], sx - 1, sy - 3, 3, 3); }
  });
  add(13.4, () => box(10.3, 2.4, 0, 0.45, 1.3, 0.9, tri('#5a4878')));
  add(14.2, () => person(12.4, 2.1, { shirt: '#ff8a6b', hair: C.ink }));
  add(14.8, () => box(11.6, 2.5, 0, 1.6, 0.5, 0.45, tri('#f4f0e6')));
  add(16.0, () => person(12.6, 3.4, { shirt: '#5a4878', hair: '#8a4a23' }));
  // ---- service bay ----
  for (const [y, v] of [[4.8, 'rsv4'], [6.9, 'ninja500']]) add(11 + y + 1, () => { box(11.0, y, 0, 3.0, 1.0, 0.28, tri('#2e323d')); line(P(11.0, y + 1, 0.28), P(14.0, y + 1, 0.28), C.ylw); bike(v, 12.5, y + 0.5, 0, 0.28); });
  add(20.4, () => person(14.8, 5.6, { shirt: '#ff8a6b', pants: '#ff8a6b', hair: '#3d2b56' }));
  add(19.9, () => box(15.2, 4.3, 0, 0.6, 1.2, 0.8, ['#ff6b5a', '#e04a3a', '#7a1f2b'], '#ff8a6b'));
  add(23.6, () => { for (let i = 0; i < 3; i++) ellipse(15.3, 8.2, 0.35, i * 0.18, i % 2 ? '#2e323d' : '#1a1c22'); });
  // ---- detailing ----
  add(18, () => bike('cbr', 16, 2, -35));
  add(19.8, () => person(17.2, 2.6, { shirt: '#5ab0e8', hair: C.ink }));
  add(18.5, () => { for (const [x, y] of [[15.3, 1.6], [15.7, 2.8], [16.8, 1.3]]) { const [sx, sy] = P(x, y, 0.4); rect(C.white, sx, sy, 2, 2); rect(C.white, sx + 3, sy - 2, 1, 1); } });
  // ---- security ----
  add(9.6, () => { box(10.6, -2.2, 0, 1.8, 0.6, 0.45, tri('#4b5161')); for (const x of [10.8, 11.5]) box(x, -2.15, 0.45, 0.45, 0.08, 0.3, ['#120b1c', '#5ab0e8', '#120b1c']); });
  add(9.0, () => person(11.6, -2.6, { shirt: '#1d2d6b', hair: C.ink, hat: '#1d2d6b' }));
  // ---- storage ----
  for (const [x, y] of [[1, -4.5], [2, -4.5], [1, -3.5], [8.6, -4.4], [8.6, -1.2], [3.2, -1.1]]) add(x + y + 0.8, () => box(x, y, 0, 0.8, 0.8, 0.7, tri('#c27a3a')));
  for (const [x, y] of [[4.6, -4.2], [4.6, -2.8]]) add(x + y + 1.6, () => box(x, y, 0, 2.4, 0.7, 0.75, tri('#d2bb8e')));
  // ---- lounge ----
  add(9.8, () => { box(0.2, 8.6, 0, 0.3, 2.4, 0.75, tri('#c4382b')); box(0.5, 8.6, 0, 0.55, 2.4, 0.38, tri('#e04a3a')); });
  add(10.3, () => person(0.75, 9.3, { shirt: '#3a5fc4', hair: '#ffd23f', sit: true }));
  add(11.4, () => person(0.75, 10.4, { shirt: '#f4f0e6', hair: '#3d2b56', skin: '#8a4a23', sit: true }));
  add(11.6, () => box(1.5, 9.2, 0, 0.6, 1.3, 0.22, tri('#a8652e')));
  add(12.6, () => { box(3.3, 8.4, 0, 0.5, 1.5, 0.55, tri('#a2a9b8')); box(3.35, 8.6, 0.55, 0.3, 0.35, 0.3, tri('#2e323d')); });
  add(8.4, () => { const a = P(0.4, 8.16, 0.85), b = P(1.7, 8.16, 0.85), c = P(1.7, 8.16, 0.4), d = P(0.4, 8.16, 0.4); poly([a, b, c, d], C.ink); poly([P(0.5, 8.17, 0.8), P(1.6, 8.17, 0.8), P(1.6, 8.17, 0.45), P(0.5, 8.17, 0.45)], '#3a5fc4'); });
  add(13.3, () => { box(2.0, 11.0, 0, 0.3, 0.3, 0.3, tri('#e04a3a')); box(2.7, 10.8, 0, 0.35, 0.25, 0.2, tri('#3a5fc4')); });
  // ---- finance ----
  add(2.4, () => person(-2.1, 5.0, { shirt: '#2e323d', tie: '#ffd23f', hair: '#a2a9b8' }));
  add(3.0, () => box(-3.0, 5.4, 0, 1.8, 0.6, 0.45, tri('#6b4423')));
  add(4.6, () => person(-2.1, 6.7, { shirt: '#e04a3a', hair: C.ink, sit: true }));
  add(0.6, () => box(-3.8, 4.2, 0, 0.5, 0.7, 0.85, tri('#8f97a8')));
  // ---- restrooms ----
  for (const x of [-3.4, -2.4, -1.4]) add(x + 1.0, () => box(x, 0.2, 0, 0.08, 1.4, 0.75, tri('#e6e9ef')));
  add(-0.2, () => box(-3.6, 3.3, 0, 2.6, 0.5, 0.4, tri('#e6e9ef')));
  // ---- plaza: outdoor display, sign, flags, bench ----
  add(16.5, () => bike('r1', 6.0, 10.4, -30));
  add(19.0, () => bike('ninja500', 8.6, 10.6, -60));
  add(16.6, () => person(7.2, 9.4, { shirt: '#ffd23f', hair: C.ink, skin: '#8a4a23' }));
  for (const [x, y, c] of [[9.6, 8.5, '#e04a3a'], [9.6, 11.6, '#3a5fc4']]) add(x + y, () => { box(x - 0.04, y - 0.04, 0, 0.08, 0.08, 2.2, tri('#a2a9b8')); const [sx, sy] = P(x, y, 2.2); rect(c, sx + 1, sy, 8, 5); rect(C.white, sx + 1, sy + 5, 8, 1); });
  add(16.0, () => {
    box(4.5, 11.3, 0, 0.25, 0.25, 1.2, tri('#4b5161'));
    const [sx, sy] = P(4.62, 11.42, 1.2), s = 'MOTOADDICT', w = textW(s);
    rect(C.ink, sx - w / 2 - 3, sy - 11, w + 6, 11); rect('#c4382b', sx - w / 2 - 2, sy - 10, w + 4, 9);
    text(s, Math.round(sx - w / 2), sy - 8, '#fff1a8', '#7a1f2b');
  });
  // ---- parking ----
  const car = (x, y, col) => add(x + y + 1.2, () => {
    ellipse(x + 0.5, y + 1, 1.1, 0, C.shadow);
    box(x, y, 0.1, 1.0, 2.0, 0.42, tri(col));
    box(x + 0.05, y + 0.45, 0.52, 0.9, 1.0, 0.32, ['#a6e1ff', shade(col, 0.95), shade(col, 0.7)]);
  });
  car(-2.0, 12.6, '#e04a3a'); car(4.6, 12.6, '#e6e9ef'); car(11.2, 14.4, '#3a5fc4'); car(-4.2, 14.4, '#2e323d'); car(13.4, 12.6, '#ffd23f');
  add(22.4, () => bike('s1000rr', 8.6, 13.6, 90));
  add(23.1, () => bike('panigale', 9.4, 13.6, 90));
  add(21.8, () => person(7.4, 14.2, { shirt: '#c2b6d6', hair: '#ffd23f' }));
  for (const [x, y] of [[3.4, 14.5], [16.2, 12.6]]) add(x + y, () => { box(x - 0.05, y - 0.05, 0, 0.1, 0.1, 2.0, tri('#4b5161')); const [sx, sy] = P(x, y, 2.0); rect('#fff1a8', sx - 2, sy - 1, 5, 2); });
  // ---- landscaping + expansion plot ----
  add(14.5, () => box(-6, 16.2, 0, 9.6, 0.4, 0.45, [C.hedge3, C.hedge, C.hedge2]));
  add(27, () => box(6.6, 16.2, 0, 13.4, 0.4, 0.45, [C.hedge3, C.hedge, C.hedge2]));
  for (let i = 0; i <= 4; i++) add(16 + i + 4, () => box(16 + i - 0.05, 3.95, 0, 0.1, 0.1, 0.5, tri('#a8652e')));
  for (let i = 0; i <= 5; i++) add(16 + 4 + i, () => box(15.95, 4 + i - 0.05, 0, 0.1, 0.1, 0.5, tri('#a8652e')));
  add(22.2, () => {
    box(16.9, 4.9, 0, 0.12, 0.12, 1.9, tri('#6b4423'));
    const [sx, sy] = P(16.96, 4.96, 1.9);
    rect(C.ink, sx - 13, sy - 13, 27, 14); rect(C.ylw, sx - 12, sy - 12, 25, 12);
    text('BUILD', sx - 9, sy - 11, C.ink); text('$45K', sx - 7, sy - 5, '#7a1f2b');
  });
  for (const [x, y, s] of [[-3, -2.5, 1], [-1.2, -4.6, 0.9], [-5, 2, 1.1], [17.5, -1.5, 1], [19.4, 1.2, 1.1], [-3.4, 9.4, 1.1], [-1.4, 11.2, 0.9], [-5.6, 11.8, 1], [20.6, 7.5, 1], [21.4, 11, 1.2], [1, 23, 1.2], [9, 23.5, 1], [16, 23, 1.1], [-7, 6, 1.2], [-8, 14, 1]]) {
    add(x + y + 0.3, () => tree(x, y, s));
  }
  add(12.0, () => box(-2.6, 10.0, 0, 1.4, 0.4, 0.3, tri('#c27a3a')));

  L.sort((a, b) => a.d - b.d).forEach((o) => o.f());

  // ---- overlays ----
  const pop = '+$32,700';
  { const [px, py] = P(5.4, 4.4, 2.6), w = textW(pop), x0 = px - Math.round(w / 2); rect(C.ink, x0 - 3, py - 3, w + 6, 11); rect('#3f9d3a', x0 - 2, py - 2, w + 4, 9); text(pop, x0, py, '#fff1a8', '#1f4f2a'); }
  { const [sx, sy] = P(3.4, 6.6, 2.1); rect(C.ink, sx - 4, sy - 10, 9, 11); rect(C.white, sx - 3, sy - 9, 7, 9); rect('#e04a3a', sx, sy - 8, 1, 5); rect('#e04a3a', sx, sy - 2, 1, 1); rect(C.ink, sx - 1, sy + 1, 2, 2); }
  { const [sx, sy] = P(6.6, 2.3, 2.1); rect(C.ink, sx - 7, sy - 10, 15, 10); rect(C.white, sx - 6, sy - 9, 13, 8); rect('#3a5fc4', sx - 3, sy - 7, 7, 2); rect(C.ink, sx - 4, sy - 5, 2, 2); rect(C.ink, sx + 3, sy - 5, 2, 2); rect(C.white, sx - 1, sy, 2, 1); rect(C.white, sx - 2, sy + 2, 1, 1); }
  { const [sx, sy] = P(4.8, 7.6, 0.1); const s = '9/12', w = textW(s) + 9; rect(C.ink, sx - 2, sy - 4, w, 9); rect('#2a1d3d', sx - 1, sy - 3, w - 2, 7); rect('#7ce35b', sx, sy - 2, 3, 2); rect(C.ink, sx, sy, 1, 1); rect(C.ink, sx + 2, sy, 1, 1); text(s, sx + 5, sy - 2, C.white); }
  { const [sx, sy] = P(12.5, 5.3, 1.9); rect(C.ink, sx - 3, sy - 3, 7, 7); rect('#ffd23f', sx - 2, sy - 2, 5, 5); rect('#c27a3a', sx, sy - 1, 1, 3); }
  return canvas;
}
