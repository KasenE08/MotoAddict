// Isometric pixel-art dealership (Prison Empire Tycoon-style camera).
// Drawn at half resolution (195x422) with hard edges, then scaled 2x with crisp pixels.
import { paintBike, VARIANTS } from './bike.js';
import { rasterSVG, quantize, BASE, GLYPH } from './styles/pixel.js';

export const W = 195, H = 422;
const T = 12, OX = 97, OY = 126;
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

// ---------- people ----------
function person(fx, fy, { shirt, pants = '#2e323d', skin = '#e8b06a', hair = '#3d2b56', tie, mop, sit, hat } = {}) {
  const x = fx - 3, y = fy - 16;
  rect(C.shadow, x - 1, fy - 1, 9, 2);
  rect(C.ink, x, y - 1, 7, sit ? 13 : 17);
  rect(hair, x + 1, y, 5, 2);
  rect(skin, x + 1, y + 2, 5, 4);
  rect(hair, x + 1, y + 2, 1, 2);
  rect(C.ink, x + 4, y + 3, 1, 1);
  if (hat) rect(hat, x + 1, y, 6, 2);
  rect(shirt, x + 1, y + 6, 5, sit ? 4 : 6);
  rect('rgba(0,0,0,0.18)', x + 4, y + 6, 2, sit ? 4 : 6);
  if (tie) rect(tie, x + 3, y + 6, 1, 4);
  if (!sit) { rect(pants, x + 1, y + 12, 2, 4); rect(pants, x + 4, y + 12, 2, 4); rect(C.ink, x + 3, y + 12, 1, 4); }
  if (mop) { rect(C.dirt, x + 7, y + 5, 1, 12); rect('#a6e1ff', x + 6, fy - 1, 5, 2); }
}

function tree(fx, fy, s = 1) {
  rect(C.shadow, fx - 6 * s, fy - 1, 12 * s + 1, 3);
  rect('#6b4423', fx - 1, fy - 7 * s, 3, 7 * s);
  disc(fx, fy - 13 * s, Math.round(7 * s), C.hedge2);
  disc(fx - 1, fy - 14 * s, Math.round(6 * s), C.hedge);
  disc(fx - 3, fy - 16 * s, Math.round(3 * s), C.hedge3);
}

// ---------- bike sprites (side-view art, sheared onto the iso grid) ----------
async function isoBike(v, axis = 'x', k = 0.12) {
  const w = 56, h = 42, ax = 28, ay = 32;
  const m = axis === 'x' ? `${k},${k / 2},0,${k}` : `${-k},${k / 2},0,${k}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g transform="translate(${ax},${ay}) matrix(${m},0,0) translate(-166,-177)">${paintBike({ ...BASE, ...VARIANTS[v] }, { badge: false, frameW: 9 })}</g></svg>`;
  return { c: quantize(await rasterSVG(svg, w, h)), ax, ay };
}
const blit = (s, x, y, z = 0) => { const [sx, sy] = P(x, y, z); ctx.drawImage(s.c, sx - s.ax, sy - s.ay); };

// ---------- the dealership layout (tile coordinates) ----------
const ROOMS = [
  { id: 'show', x0: 3, y0: 3, x1: 11, y1: 11 },
  { id: 'parts', x0: 11, y0: 2, x1: 15, y1: 6 },
  { id: 'lounge', x0: 11, y0: 6, x1: 15, y1: 11 },
  { id: 'detail', x0: 15, y0: 6, x1: 19, y1: 11 },
  { id: 'finance', x0: -1, y0: 4, x1: 3, y1: 8 },
  { id: 'rest', x0: -1, y0: 8, x1: 3, y1: 11 },
  { id: 'security', x0: -1, y0: 0, x1: 3, y1: 4 },
  { id: 'storage', x0: 3, y0: -2, x1: 11, y1: 3 },
  { id: 'service', x0: 11, y0: 11, x1: 17, y1: 16 },
];
const inRoom = (x, y) => ROOMS.find((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1);
const DOORS = new Set(['x:11:6', 'x:11:7', 'y:11:8', 'y:11:4', 'y:3:4', 'y:3:9', 'x:3:9', 'y:3:1', 'y:11:12', 'y:11:13', 'x:11:16', 'x:11:17', 'x:6:12']);
const GLASS = (k) => /^x:11:(3|4|5|8|9|10)$/.test(k);

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
  for (let i = 0; i < 1400; i++) rect(rnd() > 0.5 ? C.grass2 : C.grass3, Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
  // back neighbour lot + fence line
  quad(-3, -4, 24, 25, 0, C.conc);
  for (let x = -3; x < 21; x += 2) line(P(x, -4), P(x, 21), C.conc2);
  for (let y = -4; y < 21; y += 2) line(P(-3, y), P(21, y), C.conc2);
  // grass islands
  quad(-3, 11, 6, 5, 0, C.grass);
  quad(19, -4, 2, 15, 0, C.grass);
  quad(-3, -4, 24, 1.2, 0, C.grass);
  // plaza pavers
  for (let x = 3; x < 11; x++) for (let y = 11; y < 16; y++) quad(x, y, 1, 1, 0, (x + y) % 2 ? '#e2cfa8' : '#d2bb8e');
  // parking lot
  quad(3, 16, 18, 5, 0, C.asph);
  for (let x = 3; x <= 21; x += 2.2) line(P(x, 16.2), P(x, 18.2), C.line);
  for (let x = 3; x <= 21; x += 2.2) line(P(x, 18.8), P(x, 20.8), C.line);
  // expansion plot (dirt)
  quad(17, 11, 4, 5, 0, C.dirt);
  seed = 3;
  for (let i = 0; i < 60; i++) { const x = 17 + rnd() * 4, y = 11 + rnd() * 5; const [sx, sy] = P(x, y); rect(C.dirt2, sx, sy, 1, 1); }
  // sidewalk + roads
  quad(-6, 21, 34, 1.2, 0, C.conc2);
  quad(21, -8, 1.2, 30, 0, C.conc2);
  quad(-6, 22.2, 34, 3.4, 0, C.road);
  quad(22.2, -8, 3.4, 33.6, 0, C.road);
  for (let x = -6; x < 22; x += 2) quad(x, 23.8, 1, 0.2, 0, C.ylw);
  for (let y = -8; y < 22; y += 2) quad(23.8, y, 0.2, 1, 0, C.ylw);
  // across the road: neighbours' lawns
  quad(-6, 25.6, 34, 10, 0, C.grass);
  quad(25.6, -8, 10, 44, 0, C.grass);
}

function floors() {
  for (const r of ROOMS) for (let x = r.x0; x < r.x1; x++) for (let y = r.y0; y < r.y1; y++) quad(x, y, 1, 1, 0, FLOORS[r.id](x, y));
  // showroom polish glints
  for (const [x, y] of [[4.3, 5.2], [8.2, 4.4], [5.4, 9.3], [9.1, 7.6]]) { const [sx, sy] = P(x, y); rect(C.white, sx, sy, 2, 1); }
  // service bay oil stains + lift markings
  for (const [x, y] of [[15.2, 14.6], [12.6, 15.2]]) { const [sx, sy] = P(x, y); rect('#4b5161', sx - 2, sy, 5, 2); }
  // detailing water
  ellipse(17, 8.6, 1.4, 0, '#5ab0e8');
  ellipse(17, 8.6, 0.9, 0, '#a6e1ff');
  // lounge rug
  quad(11.6, 7.3, 2.6, 1.6, 0, '#c4382b');
  quad(11.8, 7.5, 2.2, 1.2, 0, '#e04a3a');
}

function walls(list) {
  const segs = new Map();
  for (const r of ROOMS) {
    for (let x = r.x0; x < r.x1; x++) { segs.set(`x:${r.y0}:${x}`, 1); segs.set(`x:${r.y1}:${x}`, 1); }
    for (let y = r.y0; y < r.y1; y++) { segs.set(`y:${r.x0}:${y}`, 1); segs.set(`y:${r.x1}:${y}`, 1); }
  }
  const t = 0.3, h = 1.0;
  for (const k of segs.keys()) {
    if (DOORS.has(k)) continue;
    const [ax, c, a] = k.split(':');
    const cc = +c, aa = +a;
    if (ax === 'x') {
      const inside = inRoom(aa + 0.5, cc + 0.5);
      const pal = inside ? [C.intT, C.intL, C.intR] : [C.extT, C.extL, C.extR];
      list.push({ d: aa + 0.5 + cc, f: () => {
        if (GLASS(k)) { box(aa, cc - t / 2, 0, 1, t, 0.2, pal); box(aa, cc - t / 2, 0.2, 1, t, h - 0.2, [C.intT, C.glass, C.glassR]); line(P(aa + 0.2, cc + 0.15, 0.4), P(aa + 0.5, cc + 0.15, 0.8), 'rgba(255,255,255,0.8)'); }
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
  const B = {};
  const specs = [['h2', 'x', 0.155], ['r1', 'x'], ['panigale', 'x'], ['ninja500', 'y'], ['s1000rr', 'y'], ['cbr', 'x'], ['rsv4', 'x'], ['ninja500', 'x'], ['r1', 'y']];
  await Promise.all(specs.map(async ([v, a, k]) => { B[`${v}-${a}`] = await isoBike(v, a, k); }));

  ground();
  floors();
  const L = [];
  const add = (d, f) => L.push({ d, f });
  walls(L);

  // --- showroom ---
  add(3.9 + 3.9, () => box(3.5, 3.4, 0, 5.6, 0.9, 0.12, [C.white, C.intR, '#b8c1d4']));
  add(8.4, () => blit(B['r1-x'], 4.9, 3.85, 0.12));
  add(11, () => blit(B['panigale-x'], 7.7, 3.85, 0.12));
  add(10.2, () => { box(3.4, 5.8, 0, 0.9, 2.6, 0.12, [C.white, C.intR, '#b8c1d4']); blit(B['s1000rr-y'], 3.85, 7.1, 0.12); });
  add(15.8, () => { box(9.7, 5.1, 0, 0.9, 2.6, 0.12, [C.white, C.intR, '#b8c1d4']); blit(B['ninja500-y'], 10.15, 6.4, 0.12); });
  add(14.2, () => {
    ellipse(7.2, 7.1, 1.55, 0, '#5a4878');
    ellipse(7.2, 7.1, 1.55, 0.15, '#c2b6d6');
    ellipse(7.2, 7.1, 1.2, 0.15, '#d5dae3');
    blit(B['h2-x'], 7.2, 7.1, 0.15);
  });
  add(19.4, () => { box(8.7, 9.7, 0, 1.9, 0.5, 0.45, ['#3a5fc4', '#33539f', '#1d2d6b'], '#5ab0e8'); box(9.3, 9.75, 0.45, 0.4, 0.1, 0.35, [C.ink, '#2e323d', C.ink]); });
  add(19.0, () => person(...P(9.6, 9.3), { shirt: C.ylw, hair: '#8a4a23' }));
  add(14.6, () => person(...P(5.4, 9.2), { shirt: '#3a5fc4', skin: '#8a4a23', hair: C.ink }));
  add(15.2, () => person(...P(6.0, 9.2), { shirt: C.white, tie: '#e04a3a', pants: '#2e323d' }));
  add(11.0, () => person(...P(5.6, 5.4), { shirt: '#7ce35b', hair: '#ffd23f' }));
  add(17.6, () => person(...P(7.2, 10.4), { shirt: '#e04a3a', hair: '#3d2b56', skin: '#c27a3a' }));
  add(13.4, () => { const [sx, sy] = P(8.6, 4.9); rect('#8a4a23', sx - 3, sy - 2, 7, 3); rect('#c27a3a', sx - 1, sy - 4, 4, 2); rect(C.cream, sx + 2, sy - 3, 2, 2); });
  add(14.6, () => person(...P(9.4, 5.2), { shirt: '#2a8f9a', hair: '#1d2d6b', mop: true }));
  add(14.0, () => { const [sx, sy] = P(3.6, 10.4); rect('#c27a3a', sx - 2, sy - 4, 5, 4); disc(sx, sy - 7, 3, C.hedge); });
  // --- parts & gear ---
  add(13.5, () => {
    box(11.3, 2.3, 0, 3.4, 0.5, 0.9, ['#c27a3a', '#a8652e', '#8a4a23']);
    const cols = ['#e04a3a', '#ffd23f', '#3a5fc4', C.white, '#7ce35b', '#ff8a6b'];
    for (let i = 0; i < 6; i++) { const [sx, sy] = P(11.6 + i * 0.52, 2.8, 0.55); rect(cols[i], sx - 1, sy - 2, 3, 2); const [tx, ty] = P(11.6 + i * 0.52, 2.8, 0.85); rect(cols[(i + 3) % 6], tx - 1, ty - 2, 3, 2); }
  });
  add(17.9, () => person(...P(13.5, 4.3), { shirt: '#ff8a6b', hair: '#120b1c' }));
  add(18.0, () => box(12.6, 4.7, 0, 1.8, 0.5, 0.45, ['#f4f0e6', '#c2b6d6', '#8f7fa8']));
  add(18.4, () => person(...P(12.3, 5.6), { shirt: '#5a4878', hair: '#8a4a23' }));
  // --- lounge ---
  add(17.6, () => { box(11.6, 6.25, 0, 2.6, 0.3, 0.6, ['#e04a3a', '#c4382b', '#7a1f2b']); box(11.6, 6.55, 0, 2.6, 0.55, 0.3, ['#ff8a6b', '#e04a3a', '#c4382b']); });
  add(18.3, () => person(...P(12.3, 6.9), { shirt: '#3a5fc4', hair: '#ffd23f', sit: true }));
  add(19.1, () => person(...P(13.4, 6.9), { shirt: '#f4f0e6', hair: '#3d2b56', skin: '#8a4a23', sit: true }));
  add(20.1, () => box(12.2, 7.7, 0, 1.4, 0.6, 0.22, ['#c27a3a', '#a8652e', '#8a4a23']));
  add(23.4, () => { box(14.1, 8.2, 0, 0.6, 1.8, 0.55, ['#f4f0e6', '#a2a9b8', '#6f7789']); box(14.2, 8.4, 0.55, 0.35, 0.35, 0.3, ['#2e323d', '#4b5161', '#2e323d']); });
  add(21.5, () => { const [sx, sy] = P(13.2, 10.1); rect('#8a4a23', sx - 3, sy - 2, 7, 3); rect(C.cream, sx, sy - 4, 2, 2); });
  add(21.4, () => box(11.25, 9.6, 0, 0.6, 0.6, 0.9, ['#e04a3a', '#c4382b', '#7a1f2b']));
  // --- detailing ---
  add(25.6, () => blit(B['cbr-x'], 17.0, 8.6));
  add(27.4, () => person(...P(18.4, 9.1), { shirt: '#5ab0e8', hair: '#120b1c' }));
  add(26.0, () => { for (const [x, y] of [[16.2, 8.2], [16.6, 9.4], [17.8, 8.2]]) { const [sx, sy] = P(x, y, 0.4); rect(C.white, sx, sy, 2, 2); rect(C.white, sx + 3, sy - 2, 1, 1); } });
  // --- finance ---
  add(5.2, () => person(...P(1.1, 4.9), { shirt: '#2e323d', tie: '#ffd23f', hair: '#a2a9b8' }));
  add(5.9, () => box(0.2, 5.3, 0, 1.9, 0.6, 0.45, ['#8a4a23', '#6b4423', '#4d2f17']));
  add(7.0, () => person(...P(1.1, 6.6), { shirt: '#e04a3a', hair: '#120b1c', sit: true }));
  add(4.4, () => box(-0.8, 4.3, 0, 0.5, 0.7, 0.8, ['#a2a9b8', '#8f97a8', '#6f7789']));
  // --- restrooms ---
  for (const x of [-0.6, 0.4, 1.4]) add(x + 9.2, () => box(x, 8.2, 0, 0.08, 1.4, 0.75, [C.white, '#c2b6d6', '#8f7fa8']));
  add(10.9, () => box(0.2, 10.2, 0, 2.2, 0.5, 0.4, [C.white, '#d5dae3', '#a2a9b8']));
  // --- security ---
  add(2.6, () => person(...P(1.0, 1.0), { shirt: '#1d2d6b', hair: '#120b1c', hat: '#1d2d6b' }));
  add(3.6, () => { box(0.0, 1.6, 0, 2.2, 0.6, 0.45, ['#4b5161', '#2e323d', '#1a1c22']); for (const x of [0.3, 1.0, 1.7]) box(x, 1.65, 0.45, 0.4, 0.1, 0.35, ['#120b1c', '#5ab0e8', '#120b1c']); });
  // --- storage ---
  seed = 21;
  for (const [x, y] of [[3.4, -1.6], [4.3, -1.6], [3.4, -0.7], [5.6, -1.7], [9.6, -1.6], [10.0, 0.6], [9.2, 1.6], [3.5, 1.5]]) {
    add(x + y + 0.8, () => box(x, y, 0, 0.8, 0.8, 0.7, ['#e8b06a', '#c27a3a', '#a8652e']));
  }
  for (const [x, y] of [[6.2, -0.4], [6.2, 1.0]]) add(x + y + 1.6, () => { box(x, y, 0, 2.4, 0.7, 0.75, ['#d2bb8e', '#c2a272', '#a8865a']); const [sx, sy] = P(x + 1.2, y + 0.7, 0.45); rect('#8a4a23', sx - 3, sy - 1, 6, 1); });
  // --- service bay ---
  for (const [y, v] of [[12.0, 'rsv4-x'], [14.0, 'ninja500-x']]) {
    add(12 + y + 0.8, () => { box(11.9, y, 0, 2.8, 0.9, 0.3, ['#4b5161', '#2e323d', '#1a1c22']); line(P(11.9, y + 0.9, 0.3), P(14.7, y + 0.9, 0.3), C.ylw); blit(B[v], 13.3, y + 0.45, 0.3); });
  }
  add(28.3, () => person(...P(15.2, 13.1), { shirt: '#ff8a6b', pants: '#ff8a6b', hair: '#3d2b56' }));
  add(28.4, () => box(16.1, 11.3, 0, 0.6, 1.3, 0.7, ['#e04a3a', '#c4382b', '#7a1f2b'], '#ff8a6b'));
  add(31.6, () => { for (let i = 0; i < 3; i++) ellipse(16.2, 15.2, 0.35, i * 0.18, i % 2 ? '#2e323d' : '#1a1c22'); });
  // --- expansion plot ---
  for (let i = 0; i <= 4; i++) add(17 + i + 11, () => box(17 + i - 0.05, 10.95, 0, 0.1, 0.1, 0.5, ['#c27a3a', '#a8652e', '#8a4a23']));
  for (let i = 0; i <= 5; i++) add(17 + 11 + i, () => box(16.95, 11 + i - 0.05, 0, 0.1, 0.1, 0.5, ['#c27a3a', '#a8652e', '#8a4a23']));
  add(32.6, () => {
    const [sx, sy] = P(19, 13.6);
    rect('#6b4423', sx - 1, sy - 12, 2, 12);
    rect(C.ink, sx - 13, sy - 24, 27, 13); rect(C.ylw, sx - 12, sy - 23, 25, 11);
    text('BUILD', sx - 9, sy - 22, C.ink); text('$45K', sx - 7, sy - 16, '#7a1f2b');
  });
  // --- plaza: outdoor display, sign, flags ---
  add(16.8, () => blit(B['ninja500-x'], 4.6, 12.2));
  add(20.7, () => blit(B['r1-y'], 9.8, 11.4));
  add(17.6, () => person(...P(5.8, 12.0), { shirt: '#ffd23f', hair: '#120b1c', skin: '#8a4a23' }));
  add(19.6, () => person(...P(8.2, 11.6), { shirt: '#7ce35b', hair: '#8a4a23' }));
  for (const [x, y, c] of [[3.6, 11.6, '#e04a3a'], [10.5, 14.6, '#3a5fc4']]) add(x + y, () => { const [sx, sy] = P(x, y); rect('#a2a9b8', sx, sy - 22, 1, 22); rect(c, sx + 1, sy - 22, 6, 4); rect(C.white, sx + 1, sy - 18, 6, 1); });
  add(18.6, () => {
    const [sx, sy] = P(4.2, 14.6);
    rect('#4b5161', sx - 1, sy - 14, 3, 14);
    const s = 'MOTOADDICT', w = textW(s);
    rect(C.ink, sx - w / 2 - 3, sy - 24, w + 6, 11); rect('#c4382b', sx - w / 2 - 2, sy - 23, w + 4, 9);
    text(s, Math.round(sx - w / 2), sy - 21, '#fff1a8', '#7a1f2b');
  });
  // --- parking ---
  const car = (x, y, c, axis = 'y') => add(x + y + 1, () => {
    const [w, d] = axis === 'y' ? [1.0, 2.0] : [2.0, 1.0];
    ellipse(x + w / 2, y + d / 2, 1.0, 0, C.shadow);
    box(x, y, 0.08, w, d, 0.42, [c[0], c[1], c[2]]);
    const [cw, cd, ox, oy] = axis === 'y' ? [0.9, 1.0, 0.05, 0.45] : [1.0, 0.9, 0.45, 0.05];
    box(x + ox, y + oy, 0.5, cw, cd, 0.32, ['#a6e1ff', c[1], c[2]]);
  });
  car(5.3, 16.4, ['#e04a3a', '#c4382b', '#7a1f2b']);
  car(9.7, 16.4, [C.white, '#d5dae3', '#a2a9b8']);
  car(16.3, 18.9, ['#3a5fc4', '#33539f', '#1d2d6b']);
  car(7.5, 18.9, ['#2e323d', '#1a1c22', C.ink]);
  add(36.3, () => blit(B['s1000rr-y'], 13.3, 19.8));
  add(35.0, () => person(...P(14.0, 18.6), { shirt: '#c2b6d6', hair: '#ffd23f' }));
  for (const [x, y] of [[12.1, 17.4], [3.4, 20.5]]) add(x + y, () => { const [sx, sy] = P(x, y); rect('#4b5161', sx, sy - 22, 1, 22); rect('#fff1a8', sx - 1, sy - 24, 3, 2); });
  // --- landscaping ---
  add(29.6, () => box(-3, 20.4, 0, 6.4, 0.5, 0.45, [C.hedge3, C.hedge, C.hedge2]));
  add(29.6 + 12, () => box(12.6, 20.4, 0, 8.4, 0.5, 0.45, [C.hedge3, C.hedge, C.hedge2]));
  for (const [x, y, s] of [[-2.2, 12.4, 1], [-0.6, 14.6, 1.1], [1.6, 12.2, 0.9], [20, -2, 1], [20, 3, 1.1], [20, 8, 0.9], [-2.4, -3.4, 1], [6, -3.6, 1.1], [12, -3.4, 1], [16, -3.4, 0.9], [27, 6, 1.2], [27, 14, 1], [4, 27, 1.2], [12, 27, 1]]) {
    add(x + y + 0.5, () => tree(...P(x, y), s));
  }
  add(26.0, () => { box(-1.6, 11.6, 0, 1.2, 0.4, 0.25, ['#c27a3a', '#a8652e', '#8a4a23']); });

  L.sort((a, b) => a.d - b.d).forEach((o) => o.f());

  // --- overlays (UI-ish, always on top) ---
  const pop = '+$32,700';
  const [px, py] = P(7.2, 7.1, 3.0);
  { const w = textW(pop); const x0 = px - Math.round(w / 2); rect(C.ink, x0 - 3, py - 3, w + 6, 11); rect('#3f9d3a', x0 - 2, py - 2, w + 4, 9); text(pop, x0, py, '#fff1a8', '#1f4f2a'); }
  // haggle "!" bubble
  { const [sx, sy] = P(5.4, 9.2); rect(C.ink, sx - 4, sy - 30, 9, 10); rect(C.white, sx - 3, sy - 29, 7, 8); rect('#e04a3a', sx, sy - 28, 1, 4); rect('#e04a3a', sx, sy - 23, 1, 1); rect(C.ink, sx - 1, sy - 20, 2, 2); }
  // thought bubble with a tiny bike
  { const [sx, sy] = P(5.6, 5.4); rect(C.ink, sx - 6, sy - 31, 13, 9); rect(C.white, sx - 5, sy - 30, 11, 7); rect('#3a5fc4', sx - 3, sy - 28, 7, 2); rect(C.ink, sx - 4, sy - 26, 2, 2); rect(C.ink, sx + 2, sy - 26, 2, 2); rect(C.white, sx - 1, sy - 21, 2, 1); }
  // capacity tag like PET's room counters
  { const [sx, sy] = P(4.4, 10.6); const s = '9/12'; const w = textW(s) + 9; rect(C.ink, sx - 2, sy - 4, w, 9); rect('#2a1d3d', sx - 1, sy - 3, w - 2, 7); rect('#7ce35b', sx, sy - 2, 3, 2); rect(C.ink, sx, sy, 1, 1); rect(C.ink, sx + 2, sy, 1, 1); text(s, sx + 5, sy - 2, C.white); }
  // service income coin
  { const [sx, sy] = P(13.3, 12.45, 2.2); rect(C.ink, sx - 3, sy - 3, 7, 7); rect('#ffd23f', sx - 2, sy - 2, 5, 5); rect('#c27a3a', sx, sy - 1, 1, 3); }
  return canvas;
}
