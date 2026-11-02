// Isometric pixel-art dealership (Prison Empire Tycoon-style camera).
// Drawn at half resolution with hard edges, then scaled with crisp pixels.
// Everything is driven by the location's layout (data/layout.js), theme
// (data/themes.js) and material-upgrade levels.
import { GLYPH } from './font.js';
import { renderBike3D } from './bike3d.js';
import { getLayout, roomAt } from '../data/layout.js';
import { THEMES } from '../data/themes.js';

const T = 12;
export let W = 940, H = 490;
let OX = 452, OY = 144;
export const P = (x, y, z = 0) => [Math.round(OX + (x - y) * T), Math.round(OY + ((x + y) * T) / 2 - z * T)];
export const toMap = (x, y, z = 0) => P(x, y, z);
let L, TH, M = {}, glassCtx = null;

/** Map canvas size + origin for a location. */
export function mapFor(i) {
  const lay = getLayout(i);
  const x0 = -18, y0 = -16, x1 = lay.SW + 24, y1 = lay.SD + 20;
  const minSx = (x0 - y1) * T, maxSx = (x1 - y0) * T, minSy = ((x0 + y0) * T) / 2, maxSy = ((x1 + y1) * T) / 2;
  return { W: Math.ceil(maxSx - minSx), H: Math.ceil(maxSy - minSy) + 40, OX: Math.round(-minSx), OY: Math.round(-minSy) + 40 };
}
function configure(i) {
  L = getLayout(i);
  TH = THEMES[i];
  ({ W, H, OX, OY } = mapFor(i));
}

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
  for (let guard = 0; guard < 4000; guard++) {
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
function ellipse(cx, cy, r, z, c, ry = r) {
  const pts = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; pts.push(P(cx + Math.cos(a) * r, cy + Math.sin(a) * ry, z)); }
  poly(pts, c);
}
function disc(cx, cy, r, c) {
  ctx.fillStyle = c;
  for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3); ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}
// wall-face panel (posters, TVs): a rectangle on the +y face of an along-x wall at y = wy
const facePanel = (x0, x1, wy, z0, z1, c) => poly([P(x0, wy, z1), P(x1, wy, z1), P(x1, wy, z0), P(x0, wy, z0)], c);
// ...and on the +x face of an along-y wall at x = wx
const facePanelY = (y0, y1, wx, z0, z1, c) => poly([P(wx, y0, z1), P(wx, y1, z1), P(wx, y1, z0), P(wx, y0, z0)], c);
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

const C = {
  ink: '#120b1c', white: '#ffffff', cream: '#f4f0e6',
  hedge: '#3f8f2a', hedge2: '#2f6f20', hedge3: '#57b03c',
  glass: 'rgba(166,225,255,0.55)', glassR: 'rgba(110,190,235,0.6)',
  wood: '#c27a3a', wood2: '#a8652e', carpet: '#5a4878', carpet2: '#4d3d69', blue: '#3a5fc4', blue2: '#33539f',
  gray: '#8f97a8', gray2: '#7d8596', gold: '#d4a017', gold2: '#a87c0c',
  shadow: 'rgba(18,11,28,0.22)', ylw: '#ffd23f',
};
const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f <= 1 ? v * f : v + (255 - v) * (f - 1))));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
};
const tri = (c) => [shade(c, 1.12), c, shade(c, 0.72)];
const lvl = (id) => M[id] || 0;

// ---------- people ----------
function personDraw(x, y, { shirt, pants = '#2e323d', skin = '#e8b06a', hair = '#3d2b56', tie, mop, sit, hat, step = 0, tool, cap } = {}) {
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
  if (cap) box(x - 0.14, y + 0.1, z0 + 0.8, 0.28, 0.12, 0.04, tri(cap));
  box(x - 0.14, y - 0.13, z0 + 0.58, 0.04, 0.28, 0.3, tri(hair));
  const [ex, ey] = P(x, y + 0.14, z0 + 0.74);
  rect(C.ink, ex - 2, ey, 1, 1); rect(C.ink, ex + 1, ey + 1, 1, 1);
  box(x + 0.18, y - 0.06, z0 + 0.04, 0.09, 0.12, 0.48, tri(shirt));
  if (mop) { box(x + 0.3, y + 0.05, 0, 0.05, 0.05, 1.2, tri('#c27a3a')); box(x + 0.15, y - 0.05, 0, 0.35, 0.25, 0.06, tri('#a6e1ff')); }
  if (tool === 'wrench') box(x + 0.28, y + 0.08, z0 + 0.1, 0.05, 0.05, 0.35, tri('#a2a9b8'));
  if (tool === 'hose') box(x + 0.28, y + 0.08, z0 + 0.2, 0.25, 0.05, 0.05, tri('#2e323d'));
  if (tool === 'clip') box(x + 0.28, y + 0.08, z0 + 0.2, 0.05, 0.2, 0.25, tri('#f4f0e6'));
}

function tree(x, y, s = 1, kind = 'round') {
  ellipse(x, y, 0.7 * s, 0, C.shadow);
  if (kind === 'palm') {
    box(x - 0.08, y - 0.08, 0, 0.16, 0.16, 2.6 * s, tri('#8a6a3a'));
    const [sx, sy] = P(x, y, 2.6 * s);
    for (const [dx, dy] of [[-7, 1], [7, 1], [-4, -3], [4, -3], [0, 3]]) { line([sx, sy], [sx + dx, sy + dy + 3], C.hedge2); line([sx, sy - 1], [sx + dx, sy + dy + 2], C.hedge); }
    disc(sx, sy, 2, C.hedge3);
    return;
  }
  if (kind === 'scraggly') {
    box(x - 0.08, y - 0.08, 0, 0.16, 0.16, 1.2 * s, tri('#6b4a2a'));
    const [sx, sy] = P(x, y, 1.6 * s);
    disc(sx, sy, Math.round(5 * s), '#6a7a2e'); disc(sx - 2, sy - 1, Math.round(3 * s), '#7a8a3a');
    return;
  }
  box(x - 0.1, y - 0.1, 0, 0.2, 0.2, 0.9 * s, tri('#6b4423'));
  const [sx, sy] = P(x, y, 1.8 * s);
  const r = Math.round(9 * s);
  disc(sx, sy, r, C.hedge2);
  disc(sx - 1, sy - 1, r - 1, C.hedge);
  disc(sx - 3, sy - 3, Math.max(2, Math.round(r / 2.4)), C.hedge3);
}
const bush = (x, y, c = C.hedge) => { const [sx, sy] = P(x, y, 0.3); disc(sx, sy, 3, shade(c, 0.8)); disc(sx - 1, sy - 1, 2, c); };
const flowers = (x, y) => { const cols = ['#e04a3a', '#ffd23f', '#ff8ae2', '#f4f0e6']; for (let k = 0; k < 5; k++) { const [sx, sy] = P(x + (k % 3) * 0.3, y + Math.floor(k / 3) * 0.3); rect(C.hedge2, sx, sy, 1, 2); rect(cols[k % 4], sx, sy - 1, 2, 1); } };

// ---------- 3D bikes ----------
const bikeCache = new Map();
function showBike(v, x, y, deg, lift = 0) {
  const k = `${v}|${deg}|${lift}`;
  if (!bikeCache.has(k)) bikeCache.set(k, renderBike3D(v, (deg * Math.PI) / 180, T, { lift }));
  const s = bikeCache.get(k);
  ellipse(x, y, 0.9, lift, C.shadow);
  const [sx, sy] = P(x, y);
  ctx.drawImage(s.c, sx - s.ax, sy - s.ay);
}

// ---------- neighbourhood (sets the location's mood) ----------
function house(x, y, style) {
  if (style === 'shacks') {
    box(x, y, 0, 3, 2.6, 1.2, tri('#8a7a62'));
    poly([P(x - 0.2, y - 0.2, 1.2), P(x + 3.2, y - 0.2, 1.2), P(x + 3.2, y + 2.8, 1.2), P(x - 0.2, y + 2.8, 1.2)], '#7a5a3a');
    quad(x + 0.4, y + 2.6, 0.6, 0.02, 0.4, '#3a3028');
    rect('#5a4a3a', ...P(x + 1.6, y + 2.6, 0.8), 3, 2);
    return;
  }
  if (style === 'houses') {
    box(x, y, 0, 4, 3, 1.6, tri('#e8dcc4'));
    poly([P(x, y + 3, 1.6), P(x + 4, y + 3, 1.6), P(x + 4, y + 1.5, 2.6), P(x, y + 1.5, 2.6)], '#b4553a');
    poly([P(x + 4, y, 1.6), P(x + 4, y + 3, 1.6), P(x + 4, y + 1.5, 2.6)], '#8f3f2a');
    poly([P(x, y, 1.6), P(x + 4, y, 1.6), P(x + 4, y + 1.5, 2.6), P(x, y + 1.5, 2.6)], '#c4654a');
    for (const wx of [0.6, 2.6]) facePanel(x + wx, x + wx + 0.7, y + 3.01, 0.6, 1.2, '#a6e1ff');
    return;
  }
  if (style === 'villas') {
    box(x, y, 0, 6, 4, 2.2, tri('#f6f4ee'));
    box(x + 0.3, y + 0.3, 2.2, 5.4, 3.4, 0.15, tri('#3a3d48'));
    for (const wx of [0.6, 2.4, 4.2]) facePanel(x + wx, x + wx + 1.1, y + 4.01, 0.5, 1.8, '#9fd6f5');
    quad(x + 1, y + 4.6, 3, 1.6, 0, '#5ab0e8');
    quad(x + 1.2, y + 4.8, 2.6, 1.2, 0, '#a6e1ff');
    return;
  }
  // mansions
  box(x, y, 0, 8, 5, 2.6, tri('#fbf8f1'));
  box(x + 2.5, y + 1, 2.6, 3, 3, 1.4, tri('#fbf8f1'));
  box(x - 0.1, y - 0.1, 2.6, 8.2, 5.2, 0.18, tri('#d4a017'));
  for (const wx of [0.5, 2.2, 3.9, 5.6]) facePanel(x + wx, x + wx + 1.1, y + 5.01, 0.4, 2.1, '#9fd6f5');
  for (const cx of [1.4, 6.6]) box(x + cx, y + 5.1, 0, 0.25, 0.25, 2.6, tri('#ffffff'));
  quad(x + 0.6, y + 6, 6.8, 2.4, 0, '#3a9ad8');
  quad(x + 0.8, y + 6.2, 6.4, 2, 0, '#7cc8f0');
  tree(x - 1.5, y + 6, 1.1, 'palm'); tree(x + 9.5, y + 2, 1.2, 'palm');
}

function ground() {
  const [g1, g2, g3] = TH.grass;
  rect(g1, 0, 0, W, H);
  seed = 11;
  for (let i = 0; i < (W * H) / 30; i++) rect(rnd() > 0.5 ? g2 : g3, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
  const { SW, SD } = L;
  // the lot
  quad(-8, -8, SW + 22, SD + 13, 0, TH.lot);
  for (let x = -8; x < SW + 14; x += 2) line(P(x, -8), P(x, SD + 5), TH.lot2);
  for (let y = -8; y < SD + 5; y += 2) line(P(-8, y), P(SW + 14, y), TH.lot2);
  if (TH.cracks) { seed = 5; for (let k = 0; k < 60; k++) { const x = -8 + rnd() * (SW + 22), y = -8 + rnd() * (SD + 13); line(P(x, y), P(x + rnd() * 1.4, y + rnd() * 0.8), shade(TH.lot2, 0.8)); } }
  // plaza pavers
  for (let x = 0; x < SW; x++) for (let y = SD; y < SD + 5; y++) quad(x, y, 1, 1, 0, (x + y) % 2 ? TH.plaza[0] : TH.plaza[1]);
  // lawn islands
  quad(-8, SD + 1.5, 7.5, 3.5, 0, g1);
  quad(SW + 12, -8, 2, SD + 13, 0, g1);
  // parking
  const pk = L.parking, pl = lvl('parking');
  const asph = pl === 0 ? shade(TH.lot2, 0.85) : '#4b5161';
  quad(pk.x0, pk.y0, pk.x1 - pk.x0, pk.y1 - pk.y0, 0, asph);
  if (pl === 0) { seed = 9; for (let k = 0; k < 160; k++) { const [sx, sy] = P(pk.x0 + rnd() * (pk.x1 - pk.x0), pk.y0 + rnd() * (pk.y1 - pk.y0)); rect(shade(asph, rnd() > 0.5 ? 0.85 : 1.15), sx, sy, 1, 1); } }
  else for (let x = pk.x0 + 1; x <= pk.x1 - 1; x += 2.4) { line(P(x, pk.y0 + 0.2), P(x, pk.y0 + 2.2), '#f4f0e6'); line(P(x, pk.y1 - 2.2), P(x, pk.y1 - 0.2), '#f4f0e6'); }
  if (pl >= 3) for (let x = pk.x0 + 4; x < pk.x1 - 2; x += 9.6) quad(x, pk.y0 + 2.4, 2.2, 0.4, 0, g1);
  // sidewalk + road
  const ry = pk.y1;
  quad(-30, ry, 80, 1, 0, TH.sidewalk);
  quad(-30, ry + 1, 80, 3.4, 0, TH.road);
  for (let x = -30; x < 50; x += 2) quad(x, ry + 2.6, 1, 0.2, 0, TH.roadLine);
  quad(-30, ry + 4.4, 80, 1, 0, TH.sidewalk);
}

function neighbours() {
  const { SW, SD } = L;
  const st = TH.neighbours;
  const across = L.parking.y1 + 6;
  const list = [];
  for (let x = -14; x < SW + 22; x += st === 'mansions' ? 14 : st === 'villas' ? 10 : 7) list.push([x, across]);
  for (let y = -12; y < SD; y += st === 'mansions' ? 12 : 8) list.push([st === 'mansions' ? -30 : st === 'villas' ? -26 : -22, y]);
  list.push([SW + 16, -12], [4, -15], [SW - 4, -15]);
  return list.map(([x, y]) => ({ d: x + y, f: () => house(x, y, st) }));
}

// ---------- floors ----------
function floors() {
  const [fa, fb] = TH.floors[Math.min(lvl('flooring'), TH.floors.length - 1)];
  const rugs = { lounge: TH.rugs, finance: C.blue, vip: '#5a1420' };
  for (const r of L.rooms) {
    for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < r.y1; y++) {
      let c;
      if (r.id === 'show') c = (x + y) % 2 ? fa : fb;
      else if (r.id === 'parts') c = y % 2 ? C.wood : C.wood2;
      else if (r.id === 'lounge') c = (x + y) % 2 ? shade(rugs.lounge, 0.8) : shade(rugs.lounge, 0.7);
      else if (r.id === 'finance') c = (x + y) % 2 ? C.blue : C.blue2;
      else if (r.id === 'detail') c = '#8fb8d0';
      else if (r.id === 'rest') c = (x + y) % 2 ? '#f4f0e6' : '#d5dae3';
      else if (r.id === 'vip') c = (x + y) % 2 ? '#3a1018' : '#2e0c14';
      else if (r.id === 'service') c = (x + y) % 3 ? '#6f7789' : '#646c7e';
      else c = (x * 3 + y) % 4 ? C.gray : C.gray2;
      quad(x, y, 1, 1, 0, c);
    }
  }
  if (lvl('flooring') === 0 && TH.cracks) { seed = 2; for (let k = 0; k < 30; k++) { const x = 0.5 + rnd() * (L.SW - 1), y = 0.5 + rnd() * (L.SD - 1); line(P(x, y), P(x + 0.6, y + rnd() * 0.5), '#7a766c'); } }
  // light pools from good lighting
  const li = lvl('lighting');
  if (li >= 2) for (let x = 2; x < L.SW - 1; x += 4) for (let y = 2.5; y < L.SD - 1; y += 4) ellipse(x, y, 1.2, 0, `rgba(255,240,180,${0.08 + 0.04 * li})`);
  // service bay oil stains, detailing water
  for (const [dx, dy] of [[5.6, 5.6], [2.6, 8.4]]) { const [sx, sy] = P(L.SW + dx, dy); rect('#4b5161', sx - 3, sy, 7, 2); }
  ellipse(L.detailBay[0], L.detailBay[1], 1.7, 0, '#5ab0e8');
  ellipse(L.detailBay[0], L.detailBay[1], 1.15, 0, '#a6e1ff');
}

// ---------- walls ----------
function walls(list) {
  const segs = new Set();
  for (const r of L.rooms) {
    for (let x = r.x0; x < r.x1; x++) { segs.add(`x:${r.y0}:${x}`); segs.add(`x:${r.y1}:${x}`); }
    for (let y = r.y0; y < r.y1; y++) { segs.add(`y:${r.x0}:${y}`); segs.add(`y:${r.x1}:${y}`); }
  }
  const t = 0.3, h = 1.0, win = lvl('windows');
  const ext = [TH.extT, TH.extL, TH.extR], int = [TH.intT, TH.intL, TH.intR];
  for (const k of segs) {
    if (L.doors.has(k)) continue;
    const [ax, c, a] = k.split(':');
    const cc = +c, aa = +a;
    if (ax === 'x') {
      const inside = roomAt(L, aa + 0.5, cc + 0.5);
      const pal = inside ? int : ext;
      list.push({ d: aa + 0.5 + cc, f: () => {
        if (L.glass(k)) {
          const base = win === 0 ? 0.45 : win === 1 ? 0.25 : 0.12;
          const draw = () => {
            box(aa, cc - t / 2, 0, 1, t, base, pal);
            box(aa, cc - t / 2, base, 1, t, h - base, [win >= 2 ? '#ffffff' : TH.intT, C.glass, C.glassR]);
            if (win === 0) box(aa + 0.45, cc - t / 2, base, 0.1, t, h - base, pal); // chunky mullion
            line(P(aa + 0.2, cc + 0.15, base + 0.2), P(aa + 0.5, cc + 0.15, base + 0.6), 'rgba(255,255,255,0.8)');
            if (win >= 3 && aa % 3 === 0) { const [sx, sy] = P(aa + 0.5, cc + 0.16, 0.6); rect(TH.accent, sx - 2, sy, 4, 1); }
          };
          if (glassCtx && cc === L.SD) { const prev = ctx; ctx = glassCtx; draw(); ctx = prev; } else draw();
        } else box(aa, cc - t / 2, 0, 1, t, h, pal, inside ? null : TH.extEdge);
      } });
    } else {
      const inside = roomAt(L, cc + 0.5, aa + 0.5);
      list.push({ d: cc + aa + 0.5, f: () => box(cc - t / 2, aa, 0, t, 1, h, inside ? int : ext) });
    }
  }
}

// ---------- the showroom's display spots ----------
function displaySpots(add, opts) {
  const cap = opts.capacity ?? 0;
  const onSpot = new Map((opts.display || []).map((d) => [d.spot, d]));
  const st = lvl('stands');
  L.spots.slice(0, cap).forEach((sp) => {
    const shown = onSpot.get(sp.id);
    const sel = opts.selected && shown && shown.uid === opts.selected;
    if (sp.kind === 'feature') {
      add(sp.x + sp.y, () => {
        ellipse(sp.x, sp.y, 1.8, 0, st >= 3 ? '#1a1c22' : '#5a4878');
        ellipse(sp.x, sp.y, 1.8, 0.12, sel ? '#ffd23f' : st >= 4 ? C.gold : st >= 2 ? '#e6e9ef' : '#c2b6d6');
        ellipse(sp.x, sp.y, 1.4, 0.12, st >= 3 ? '#2e323d' : '#d5dae3');
        if (st >= 2) for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const [sx, sy] = P(sp.x + Math.cos(a) * 1.6, sp.y + Math.sin(a) * 1.6, 0.13); rect(st >= 3 ? '#a6e1ff' : '#fff1a8', sx, sy, 1, 1); }
        if (shown) showBike(shown.model, sp.x, sp.y, sp.h, 0.12);
      });
    } else {
      const alongX = Math.abs(Math.cos((sp.h * Math.PI) / 180)) >= Math.abs(Math.sin((sp.h * Math.PI) / 180));
      const [w, d] = alongX ? [2.5, 1.1] : [1.1, 2.5];
      const pal = sel ? ['#fff1a8', '#ffd23f', '#e09a00']
        : st === 0 ? ['#c8c2b4', '#a8a296', '#8f897e']
          : st === 1 ? [C.white, '#d5dae3', '#b8c1d4']
            : st === 2 ? [shade(TH.accent, 1.1), TH.accent, shade(TH.accent, 0.7)]
              : st === 3 ? ['#2e323d', '#1a1c22', '#0e0f13'] : ['#2e323d', C.gold, C.gold2];
      const hgt = st === 0 ? 0.05 : 0.1 + Math.min(st, 3) * 0.04;
      add(sp.x + sp.y + 0.6, () => {
        box(sp.x - w / 2, sp.y - d / 2, 0, w, d, hgt, pal);
        if (st >= 3) line(P(sp.x - w / 2, sp.y + d / 2, hgt * 0.5), P(sp.x + w / 2, sp.y + d / 2, hgt * 0.5), '#a6e1ff');
        if (shown) showBike(shown.model, sp.x, sp.y, sp.h, hgt);
      });
    }
  });
}

// ---------- interior furnishing driven by material upgrades ----------
const plantPot = (x, y, big) => { box(x - 0.2, y - 0.2, 0, 0.4, 0.4, 0.35, tri(big ? '#2e323d' : '#c27a3a')); const [sx, sy] = P(x, y, 0.35); disc(sx, sy - 4, big ? 5 : 4, C.hedge); disc(sx - 1, sy - 5, 2, C.hedge3); };

function showroomExtras(add) {
  const { SW, SD } = L;
  // wall art & posters on the back wall (y = 0) and side wall (x = 0)
  const art = lvl('art');
  const posterCols = ['#e04a3a', '#3a5fc4', '#ffd23f', '#7ce35b', '#ff8a6b', '#5a4878'];
  for (let k = 0; k < art * 2; k++) {
    const x0 = 1.4 + k * ((SW - 3) / Math.max(1, art * 2));
    add(0.2 + x0, () => {
      facePanel(x0, x0 + 0.8, 0.16, 0.35, 0.9, art >= 3 ? C.gold : C.ink);
      facePanel(x0 + 0.06, x0 + 0.74, 0.17, 0.4, 0.85, posterCols[k % 6]);
      facePanel(x0 + 0.2, x0 + 0.6, 0.18, 0.5, 0.7, '#f4f0e6');
    });
  }
  // lighting: pendant lamps hanging from above
  const li = lvl('lighting');
  for (let x = 2; x < SW - 1 && li > 0; x += li >= 3 ? 3 : 4.5) for (let y = 2.5; y < SD - 1; y += li >= 3 ? 3.5 : 5) {
    add(x + y + 0.05, () => {
      const [ax, ay] = P(x, y, 3.2), [bx, by] = P(x, y, 2.3);
      line([ax, ay], [bx, by], '#4b5161');
      if (li >= 4) { disc(bx, by + 2, 3, '#fff1a8'); disc(bx, by + 2, 2, '#ffffff'); } else { rect(li >= 2 ? '#ffd23f' : '#c2b6d6', bx - 3, by, 7, 2); rect('#fff1a8', bx - 2, by + 2, 5, 1); }
    });
  }
  // chandelier over the first turntable
  const ch = lvl('chandelier');
  if (ch > 0) {
    const f = L.spots[0];
    add(f.x + f.y + 0.1, () => {
      const [ax, ay] = P(f.x, f.y, 4.2), [bx, by] = P(f.x, f.y, 3.0);
      line([ax, ay], [bx, by], C.gold2);
      const r = 3 + ch * 2;
      disc(bx, by + 2, r, 'rgba(255,241,168,0.35)');
      for (let k = 0; k < 6 + ch * 2; k++) { const a = (k / (6 + ch * 2)) * Math.PI * 2; rect(k % 2 ? '#ffffff' : '#a6e1ff', Math.round(bx + Math.cos(a) * r * 0.8), Math.round(by + 2 + Math.sin(a) * r * 0.4), 1, 2); }
      rect(C.gold, bx - r, by + 1, r * 2 + 1, 1);
    });
  }
  // reception / front desk (office upgrade makes it grander)
  const of = lvl('office');
  const dk = L.desk;
  add(dk.x + dk.y + 1, () => {
    const len = 1.8 + of * 0.3;
    const pal = of >= 3 ? ['#f4f0e6', '#2e323d', '#1a1c22'] : of >= 1 ? ['#5ab0e8', '#3a5fc4', '#1d2d6b'] : ['#c8a878', '#a8865a', '#8a6a42'];
    box(dk.x - 0.3, dk.y - len / 2, 0, 0.6, len, 0.45, pal, of >= 1 ? '#a6e1ff' : null);
    box(dk.x - 0.25, dk.y - 0.2, 0.45, 0.08, 0.45, 0.32, [C.ink, '#2e323d', C.ink]);
    if (of >= 2) plantPot(dk.x + 0.2, dk.y + len / 2 + 0.4, true);
  });
  // sculptures on plinths
  const sc = lvl('sculpture');
  const scPos = [[SW - 1.2, SD - 2.2], [1.6, SD - 2.4], [SW - 1.2, 2.4], [SW / 2 + 3.5, SD - 2.2], [SW / 2 - 3.5, 2.6]];
  for (let k = 0; k < Math.min(sc, scPos.length); k++) {
    const [x, y] = scPos[k];
    add(x + y, () => { box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.6, tri('#f4f0e6')); const [sx, sy] = P(x, y, 0.6); disc(sx, sy - 5, 3, k % 2 ? C.gold : '#a2a9b8'); rect(k % 2 ? C.gold2 : '#6f7789', sx - 1, sy - 3, 3, 3); });
  }
  // corner plants (more with landscaping)
  for (const [x, y] of [[SW - 0.6, 0.6], [0.6, SD - 0.6]]) add(x + y, () => plantPot(x, y, lvl('landscaping') >= 3));
  // AC units on the outside of the back wall
  for (let k = 0; k < lvl('ac'); k++) { const x = 2 + k * 3; add(x - 6.4, () => box(x, -6.6, 0.3, 1.0, 0.4, 0.6, tri('#d5dae3'))); }
  // security cameras on wall tops
  const camPos = [[0.3, 0.3], [SW - 0.3, 0.3], [0.3, SD - 0.3], [SW - 0.3, SD - 0.3]];
  for (let k = 0; k < Math.min(lvl('cameras'), camPos.length); k++) {
    const [x, y] = camPos[k];
    add(x + y + 0.2, () => { box(x - 0.1, y - 0.1, 1.0, 0.2, 0.2, 0.15, tri('#2e323d')); const [sx, sy] = P(x, y, 1.15); rect('#e04a3a', sx, sy, 1, 1); });
  }
}

function lounge(add) {
  const r = L.rooms.find((q) => q.id === 'lounge');
  const cu = lvl('couch'), co = lvl('coffee'), tv = lvl('tv'), kid = lvl('kids');
  const len = 1.6 + cu * 0.5;
  const cc = TH.couch;
  // couch along the left wall
  add(r.x0 + r.y0 + 1.5, () => {
    if (cu === 0) { for (let k = 0; k < 2; k++) box(r.x0 + 0.3, r.y0 + 1 + k * 0.8, 0, 0.45, 0.45, 0.45, tri('#8f97a8')); return; }
    box(r.x0 + 0.2, r.y0 + 0.8, 0, 0.3, len, 0.75, tri(shade(cc, 0.85)));
    box(r.x0 + 0.5, r.y0 + 0.8, 0, 0.55, len, 0.38, tri(cc));
    if (cu >= 3) for (let k = 0; k < Math.floor(len); k++) box(r.x0 + 0.55, r.y0 + 1 + k, 0.38, 0.3, 0.5, 0.1, tri('#f4f0e6'));
  });
  if (cu >= 2) add(r.x0 + 2 + r.y0 + 2, () => box(r.x0 + 1.8, r.y0 + 1.4, 0, 0.7, 1.3, 0.22, tri(cu >= 4 ? '#2e323d' : '#a8652e')));
  // coffee station along the back wall
  if (co > 0) add(r.x0 + 3 + r.y0 + 0.4, () => {
    box(r.x0 + 3.2, r.y0 + 0.2, 0, 2.2, 0.5, 0.55, tri(co >= 2 ? '#2e323d' : '#a2a9b8'));
    box(r.x0 + 3.4, r.y0 + 0.25, 0.55, 0.35, 0.3, 0.32, tri('#1a1c22'));
    if (co >= 3) for (let k = 0; k < 3; k++) box(r.x0 + 3.4 + k * 0.6, r.y0 + 0.9, 0, 0.25, 0.25, 0.45, tri(C.gold));
  });
  // TV on the back wall
  if (tv > 0) add(r.x0 + 0.2 + r.y0, () => {
    const w = 0.8 + tv * 0.6;
    facePanel(r.x0 + 0.4, r.x0 + 0.4 + w, r.y0 + 0.16, 0.35, 0.35 + w * 0.45, C.ink);
    facePanel(r.x0 + 0.48, r.x0 + 0.32 + w, r.y0 + 0.17, 0.4, 0.3 + w * 0.45, '#3a5fc4');
    facePanel(r.x0 + 0.6, r.x0 + 0.8, r.y0 + 0.18, 0.5, 0.6, '#7ce35b');
  });
  // kids' area
  if (kid > 0) {
    const kx = r.x0 + 2.4, ky = r.y1 - 2.4;
    add(kx + ky - 2, () => { quad(kx - 0.2, ky - 0.2, 2.4, 1.8, 0, '#ffd23f'); quad(kx, ky, 2, 1.4, 0, '#ffe68a'); });
    if (kid >= 2) add(kx + ky, () => { box(kx + 0.3, ky + 0.3, 0, 0.3, 0.3, 0.3, tri('#e04a3a')); box(kx + 1.1, ky + 0.6, 0, 0.35, 0.25, 0.2, tri('#3a5fc4')); });
    if (kid >= 3) add(kx + ky + 1, () => { box(kx + 1.2, ky - 0.1, 0, 0.8, 0.7, 0.7, tri('#7ce35b')); poly([P(kx + 1.2, ky + 0.6, 0.7), P(kx + 2, ky + 0.6, 0.7), P(kx + 1.6, ky + 0.25, 1.1)], '#e04a3a'); });
  }
  // champagne bar lives in the VIP lounge if there is one, else here
  if (lvl('champagne') > 0 && lvl('vip') === 0) add(r.x0 + r.y1, () => champagneBar(r.x0 + 0.4, r.y1 - 1.2));
}
function champagneBar(x, y) {
  const c = lvl('champagne');
  box(x, y, 0, 2.4, 0.6, 0.6, tri('#1a1c22'), C.gold);
  for (let k = 0; k < 2 + c; k++) { const [sx, sy] = P(x + 0.3 + k * 0.4, y + 0.3, 0.6); rect('#d4ffd8', sx, sy - 4, 1, 4); rect(C.gold, sx, sy - 5, 1, 1); }
}

function vipLounge(add, list) {
  const v = lvl('vip');
  if (!v) return;
  const x0 = -12, y0 = 0;
  for (let x = x0; x < x0 + 6; x++) for (let y = y0; y < y0 + 6; y++) quad(x, y, 1, 1, 0, (x + y) % 2 ? '#3a1018' : '#2e0c14');
  for (let x = x0; x < x0 + 6; x++) { list.push({ d: x + 0.5 + y0, f: () => box(x, y0 - 0.15, 0, 1, 0.3, 1, [TH.intT, TH.intL, TH.intR]) }); list.push({ d: x + 0.5 + y0 + 6, f: () => box(x, y0 + 5.85, 0, 1, 0.3, 1, [TH.extT, TH.extL, TH.extR]) }); }
  for (let y = y0; y < y0 + 6; y++) { list.push({ d: x0 + y + 0.5, f: () => box(x0 - 0.15, y, 0, 0.3, 1, 1, [TH.intT, TH.intL, TH.intR]) }); }
  for (let k = 0; k < v + 1; k++) add(x0 + 1 + k * 1.5 + y0 + 1, () => { box(x0 + 0.6 + k * 1.6, y0 + 0.6, 0, 1.2, 0.5, 0.6, tri('#5a1420')); box(x0 + 0.6 + k * 1.6, y0 + 1.1, 0, 1.2, 0.5, 0.3, tri('#7a1f2b')); });
  add(x0 + 3 + y0 + 3, () => { box(x0 + 2.2, y0 + 2.6, 0, 1.4, 1, 0.3, tri('#1a1c22'), C.gold); });
  if (lvl('champagne')) add(x0 + y0 + 6, () => champagneBar(x0 + 0.6, y0 + 4.4));
}

function otherRooms(add) {
  const { SW, SD } = L;
  // parts & gear: shelves scale with the shelves upgrade
  const sh = lvl('shelves');
  const cols = ['#e04a3a', '#ffd23f', '#3a5fc4', C.white, '#7ce35b', '#ff8a6b', '#1a1c22'];
  add(SW + 0.6, () => {
    box(SW + 0.4, 0.2, 0, 5.2, 0.5, 1.0, tri('#a8652e'));
    const per = 4 + sh * 2;
    for (let i = 0; i < per; i++) for (const z of [0.55, 0.95]) { const [sx, sy] = P(SW + 0.7 + i * (4.8 / per), 0.7, z); rect(cols[(i + (z > 0.6 ? 3 : 0)) % 7], sx - 1, sy - 3, 3, 3); }
  });
  if (sh >= 2) add(SW + 5.5 + 3, () => box(SW + 5.1, 2.4, 0, 0.5, 2.2, 0.95, tri('#5a4878')));
  if (sh >= 3) add(SW + 2 + 5.4, () => { box(SW + 2.6, 4.8, 0, 2, 0.5, 0.9, tri('#a8652e')); for (let k = 0; k < 6; k++) { const [sx, sy] = P(SW + 2.8 + k * 0.3, 5.3, 0.7); rect(cols[k % 7], sx, sy - 2, 2, 2); } });
  const pc = L.partsCounter;
  add(pc.x + pc.y + 0.6, () => box(pc.x, pc.y, 0, 2.0, 0.5, 0.45, tri('#f4f0e6')));
  // service bay: one lift per service-bay level (min 1)
  const sb = lvl('serviceBay');
  L.lifts.slice(0, Math.min(L.lifts.length, 1 + Math.floor(sb / 2))).forEach(([x, y]) => add(x + y + 1.2, () => { box(x - 1.5, y - 0.5, 0, 3.0, 1.0, 0.28, tri('#2e323d')); line(P(x - 1.5, y + 0.5, 0.28), P(x + 1.5, y + 0.5, 0.28), C.ylw); }));
  add(SW + 7.2 + 6.4, () => box(SW + 7.0, 6.4, 0, 0.6, 1.4, 0.8, ['#ff6b5a', '#e04a3a', '#7a1f2b'], '#ff8a6b'));
  if (sb >= 2) add(SW + 7 + 9, () => box(SW + 7.0, 8.4, 0, 0.6, 1.4, 0.8, tri('#3a5fc4')));
  add(SW + 7 + SD + 1.5, () => { for (let i = 0; i < 3; i++) ellipse(SW + 7.2, SD + 1.6, 0.35, i * 0.18, i % 2 ? '#2e323d' : '#1a1c22'); });
  // detailing bay equipment
  const db = lvl('detailBay');
  if (db >= 1) add(SW + 11 + 0.8, () => box(SW + 11.0, 0.5, 0, 0.6, 0.8, 0.7, tri('#ffd23f')));
  if (db >= 3) add(SW + 7 + 0.8, () => box(SW + 6.4, 0.4, 0, 1.6, 0.5, 0.9, tri('#a2a9b8')));
  // finance office
  const of = lvl('office');
  add(-1.2, () => box(-4.4, 2.0, 0, 2.0, 0.6, 0.45, tri(of >= 2 ? '#3a2418' : '#6b4423')));
  add(-5.0, () => box(-5.7, 0.3, 0, 0.5, 0.8, 0.85, tri('#8f97a8')));
  add(-1.0, () => box(-2.0, 0.6, 0, 1.2, 0.5, 0.4, tri('#8a5a32')));
  // restrooms
  const rr = lvl('restrooms');
  for (let k = 0; k < 3; k++) { const x = -5.4 + k * 1.2; add(x - 2.6, () => box(x, -3.8, 0, 0.08, 1.6, 0.75, tri(rr >= 2 ? '#f4f0e6' : '#c8c2b4'))); }
  add(-4.2, () => box(-5.6, -1.0, 0, 2.6 + rr * 0.4, 0.5, 0.4, tri(rr >= 3 ? '#f4f0e6' : '#d5dae3')));
  if (rr >= 3) add(-1, () => plantPot(-0.6, -0.6, true));
  // security office
  add(SW + 1 + -3.2, () => { box(SW + 1.0, -3.2, 0, 2.0, 0.6, 0.45, tri('#4b5161')); for (let k = 0; k < 2 + lvl('cameras'); k++) box(SW + 1.1 + k * 0.45, -3.15, 0.45, 0.4, 0.08, 0.3, ['#120b1c', '#5ab0e8', '#120b1c']); });
  // storage crates
  for (const [x, y] of [[1, -5.4], [2, -5.4], [1, -4.4], [SW - 1.6, -5.2], [SW - 1.6, -1.4], [4, -1.3]]) add(x + y + 0.8, () => box(x, y, 0, 0.8, 0.8, 0.7, tri('#c27a3a')));
  for (const [x, y] of [[6.0, -5.0], [6.0, -3.4]]) add(x + y + 1.6, () => box(x, y, 0, 2.4, 0.7, 0.75, tri('#d2bb8e')));
}

function exterior(add) {
  const { SW, SD } = L;
  const pl = L.plaza;
  // signage
  const sg = lvl('signage');
  const sign = 'MOTOADDICT', w = textW(sign);
  if (sg === 0) add(SD + 0.1 + 2, () => { const [sx, sy] = P(2.5, SD + 0.16, 0.75); rect('#8a7a62', sx - 22, sy - 4, 44, 8); text('MOTO', sx - 8, sy - 2, '#f4f0e6'); });
  else if (sg === 1) add(SD + 4, () => { const [sx, sy] = P(4, SD + 0.16, 0.9); rect(C.ink, sx - w / 2 - 2, sy - 7, w + 4, 9); rect(TH.accent, sx - w / 2 - 1, sy - 6, w + 2, 7); text(sign, Math.round(sx - w / 2), sy - 5, '#fff1a8'); });
  else {
    const px = 1.6, py = SD + 4.2, hgt = sg >= 3 ? 1.9 : 1.3;
    add(px + py, () => {
      box(px - 0.12, py - 0.12, 0, 0.25, 0.25, hgt, tri('#4b5161'));
      const [sx, sy] = P(px, py, hgt);
      if (sg >= 3) disc(sx, sy - 6, w / 2 + 6, 'rgba(255,210,63,0.25)');
      rect(C.ink, sx - w / 2 - 3, sy - 11, w + 6, 11);
      rect(sg >= 4 ? C.gold : TH.accent, sx - w / 2 - 2, sy - 10, w + 4, 9);
      text(sign, Math.round(sx - w / 2), sy - 8, sg >= 4 ? '#1a1c22' : '#fff1a8', sg >= 4 ? null : '#7a1f2b');
    });
  }
  // outdoor display: flags + canopy
  const od = lvl('outdoor');
  const flagCols = ['#e04a3a', '#3a5fc4', '#ffd23f', '#7ce35b'];
  for (let k = 0; k < od * 2; k++) {
    const x = SW - 0.6 - k * 1.6, y = pl.y0 + 0.6 + (k % 2) * 3.4;
    add(x + y, () => { box(x - 0.04, y - 0.04, 0, 0.08, 0.08, 2.2, tri('#a2a9b8')); const [sx, sy] = P(x, y, 2.2); rect(flagCols[k % 4], sx + 1, sy, 8, 5); rect(C.white, sx + 1, sy + 5, 8, 1); });
  }
  if (od >= 2) add(SW - 4 + pl.y0 + 3, () => { for (const [dx, dy] of [[0, 0], [3, 0], [0, 2.5], [3, 2.5]]) box(SW - 5 + dx, pl.y0 + 1 + dy, 0, 0.1, 0.1, 1.6, tri('#f4f0e6')); poly([P(SW - 5, pl.y0 + 1, 1.6), P(SW - 2, pl.y0 + 1, 1.6), P(SW - 2, pl.y0 + 3.5, 1.6), P(SW - 5, pl.y0 + 3.5, 1.6)], TH.accent); });
  // fountain
  const fo = lvl('fountain');
  if (fo > 0) {
    const fx = SW / 2 - 3.5, fy = pl.y0 + 2.6, r = 1.0 + fo * 0.35;
    add(fx + fy, () => {
      ellipse(fx, fy, r, 0, '#d8d0c0'); ellipse(fx, fy, r, 0.3, '#f6f2ea'); ellipse(fx, fy, r - 0.25, 0.3, '#5ab0e8');
      box(fx - 0.15, fy - 0.15, 0.3, 0.3, 0.3, 0.8 + fo * 0.3, tri('#f6f2ea'));
      const [sx, sy] = P(fx, fy, 1.1 + fo * 0.3);
      for (let k = -2; k <= 2; k++) rect('#a6e1ff', sx + k * 2, sy - 2 + Math.abs(k), 1, 4);
    });
  }
  // valet stand
  const va = lvl('valet');
  if (va > 0) add(L.door + 3 + SD + 2, () => { box(L.door + 2.6, SD + 1.6, 0, 0.6, 0.4, 0.7, tri('#1a1c22'), C.gold); if (va >= 2) personDraw(L.door + 3.0, SD + 2.4, { shirt: '#1a1c22', tie: C.gold, hat: '#1a1c22' }); });
  // rooftop showcase: a tower with a hero bike on top
  const rt = lvl('rooftop');
  if (rt > 0) add(-3.2 + SD + 3.2, () => {
    const x = -3.2, y = SD + 3.2, hgt = 2.6 + rt; // on the lawn beside the plaza, clear of the storefront
    box(x - 0.6, y - 0.6, 0, 1.2, 1.2, hgt, tri(rt >= 2 ? '#f6f2ea' : '#d5dae3'), C.gold);
    showBike(rt >= 2 ? 'ninja-h2r' : 'panigale-v4r', x, y, -20, hgt);
  });
  // landscaping: hedges, flowers and trees
  const la = lvl('landscaping');
  const kind = TH.trees;
  const trees = [[-7, SD + 2.4, 1.1], [-4.5, SD + 3.6, 0.9], [SW + 13, -2, 1], [SW + 13, 4, 1.1], [-3, -7.4, 1], [SW - 2, -7.4, 1.1], [SW + 13, SD - 1, 1]];
  trees.slice(0, 3 + la).forEach(([x, y, s]) => add(x + y + 0.3, () => tree(x, y, s, kind)));
  if (la >= 1) for (let x = 0.5; x < SW; x += 2.5) if (Math.abs(x - L.door - 1) > 2) add(x + SD + 4.9, () => bush(x, SD + 4.6));
  if (la >= 2) for (let x = 1; x < SW; x += 3.1) if (Math.abs(x - L.door - 1) > 2) add(x + SD + 4.5, () => flowers(x, SD + 4.1));
  if (la >= 3) add(-6 + SD + 3, () => flowers(-6, SD + 2.4));
  // parking lamps + fence
  const pk = L.parking, plv = lvl('parking');
  if (plv >= 2) for (let x = pk.x0 + 3; x < pk.x1; x += 8) add(x + pk.y0 + 2.5, () => { box(x - 0.05, pk.y0 + 2.4, 0, 0.1, 0.1, 2.0, tri('#4b5161')); const [sx, sy] = P(x, pk.y0 + 2.4, 2.0); rect('#fff1a8', sx - 2, sy - 1, 5, 2); });
  if (TH.fence === 'chain') for (let y = -8; y < SD + 5; y += 1) add(-8 + y, () => { box(-8.05, y, 0, 0.05, 0.05, 0.9, tri('#8f97a8')); line(P(-8, y, 0.9), P(-8, y + 1, 0.9), '#a2a9b8'); line(P(-8, y, 0.5), P(-8, y + 1, 0.5), '#a2a9b8'); });
  if (TH.fence === 'gold') for (let y = -8; y < SD + 5; y += 2) add(-8 + y, () => box(-8.1, y, 0, 0.2, 0.2, 0.8, tri(C.gold)));
}

// =====================================================================
/**
 * Draw a location. opts: { loc, mat, capacity, display, selected, glass (canvas) }
 */
export async function renderDealership(canvas, opts = {}) {
  configure(opts.loc ?? 0);
  M = opts.mat || {};
  canvas.width = W; canvas.height = H;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  glassCtx = null;
  if (opts.glass) { opts.glass.width = W; opts.glass.height = H; glassCtx = opts.glass.getContext('2d'); glassCtx.imageSmoothingEnabled = false; }
  ground();
  floors();
  const list = [];
  const add = (d, f) => list.push({ d, f });
  list.push(...neighbours());
  walls(list);
  vipLounge(add, list);
  displaySpots(add, opts);
  showroomExtras(add);
  lounge(add);
  otherRooms(add);
  exterior(add);
  list.sort((a, b) => a.d - b.d).forEach((o) => o.f());
  return canvas;
}

/** Which display spot (if any) is under a map-pixel point. Front-most first. */
export function spotAt(mx, my, cap, loc = 0) {
  configure(loc);
  const list = L.spots.slice(0, cap).map((s) => ({ s, p: P(s.x, s.y) })).sort((a, b) => b.p[1] - a.p[1]);
  for (const { s, p } of list) if (Math.abs(mx - p[0]) < 24 && my > p[1] - 30 && my < p[1] + 9) return s.id;
  return null;
}

/**
 * Draw people (+ trash piles) onto a transparent layer.
 * people: [{x, y, look, step, bubble}] · piles: [[x, y], ...]
 */
export function drawPeople(canvas, people, loc = 0, piles = []) {
  configure(loc);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  const prev = ctx;
  ctx = c;
  for (const [x, y] of piles) { const [sx, sy] = P(x, y); rect('#8a4a23', sx - 4, sy - 2, 9, 3); rect('#c27a3a', sx - 2, sy - 4, 5, 2); rect('#f4f0e6', sx + 2, sy - 4, 2, 2); rect('#5a4878', sx - 3, sy - 3, 2, 1); }
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
  } else if (kind === 'z') {
    text('Z', sx - 1, sy - 8, '#a6e1ff', C.ink);
  } else if (kind === 'wrench') {
    rect('#a2a9b8', sx - 1, sy - 8, 2, 6); rect('#a2a9b8', sx - 2, sy - 9, 4, 2);
  }
}
