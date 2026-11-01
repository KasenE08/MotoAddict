// Low-poly 3D motorcycles for the isometric pixel world.
// Each part of the side-profile art is extruded to a real width, lit, and
// rasterized with a z-buffer, so bikes look solid from any heading.
import { P as PROFILE, REAR, FRONT, TIRE_R, RIM_R, FRAME_LINES, FORK_UP, FORK_LOW } from './bike.js';

const S = 0.00838; // meters per profile unit (tire diameter 74 units = 0.62 m)
const CX = 166, GROUND = 177;

// --- tiny SVG path flattener (absolute M/L/C/Q/Z only) ---
export function flatten(d, seg = 8) {
  const t = d.match(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi);
  const pts = [];
  let i = 0, cmd = '', cur = [0, 0];
  const num = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    if (cmd === 'Z' || cmd === 'z') continue;
    if (cmd === 'M' || cmd === 'L') { cur = [num(), num()]; pts.push(cur); if (cmd === 'M') cmd = 'L'; }
    else if (cmd === 'Q') {
      const c = [num(), num()], e = [num(), num()];
      for (let k = 1; k <= seg; k++) { const s = k / seg, a = 1 - s; pts.push([a * a * cur[0] + 2 * a * s * c[0] + s * s * e[0], a * a * cur[1] + 2 * a * s * c[1] + s * s * e[1]]); }
      cur = e;
    } else if (cmd === 'C') {
      const c1 = [num(), num()], c2 = [num(), num()], e = [num(), num()];
      for (let k = 1; k <= seg; k++) {
        const s = k / seg, a = 1 - s;
        pts.push([a * a * a * cur[0] + 3 * a * a * s * c1[0] + 3 * a * s * s * c2[0] + s * s * s * e[0], a * a * a * cur[1] + 3 * a * a * s * c1[1] + 3 * a * s * s * c2[1] + s * s * s * e[1]]);
      }
      cur = e;
    } else i++;
  }
  // drop duplicate closing point
  const f = pts[0], l = pts[pts.length - 1];
  if (pts.length > 2 && Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6) pts.pop();
  return pts;
}

const toUW = (p) => [(p[0] - CX) * S, (GROUND - p[1]) * S];
const circle = (c, r, n = 18) => Array.from({ length: n }, (_, k) => [c[0] + Math.cos((k / n) * Math.PI * 2) * r, c[1] + Math.sin((k / n) * Math.PI * 2) * r]);
function tube(a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  return [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
}

// Extrude a 2D profile polygon (profile units) between widths v0..v1 (meters).
export function extrude(poly, v0, v1, mat) {
  const p = poly.map(toUW);
  let area = 0;
  for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const ccw = area > 0, faces = [];
  faces.push({ mat, n: [0, 1, 0], pts: p.map(([u, w]) => [u, v1, w]) });
  faces.push({ mat, n: [0, -1, 0], pts: p.map(([u, w]) => [u, v0, w]) });
  for (let k = 0; k < p.length; k++) {
    const a = p[k], b = p[(k + 1) % p.length];
    const du = b[0] - a[0], dw = b[1] - a[1], L = Math.hypot(du, dw) || 1;
    const n = ccw ? [dw / L, 0, -du / L] : [-dw / L, 0, du / L];
    faces.push({ mat, n, pts: [[a[0], v0, a[1]], [b[0], v0, b[1]], [b[0], v1, b[1]], [a[0], v1, a[1]]] });
  }
  return faces;
}

// Extrude with chamfered sides: full outline in the middle, an inset outline on each
// face, joined by sloped facets. Gives tanks, fairings and tires a rounded look.
export function extrudeBevel(poly, hw, inset, mat, core = 0.65) {
  const outer = poly.map(toUW);
  const cx = outer.reduce((a, p) => a + p[0], 0) / outer.length, cw = outer.reduce((a, p) => a + p[1], 0) / outer.length;
  const inner = outer.map(([u, w]) => [cx + (u - cx) * inset, cw + (w - cw) * inset]);
  const faces = extrude(poly, -hw * core, hw * core, mat).slice(2);
  faces.push({ mat, n: [0, 1, 0], pts: inner.map(([u, w]) => [u, hw, w]) });
  faces.push({ mat, n: [0, -1, 0], pts: inner.map(([u, w]) => [u, -hw, w]) });
  for (const sgn of [1, -1]) {
    for (let k = 0; k < outer.length; k++) {
      const j = (k + 1) % outer.length;
      const A = [outer[k][0], sgn * hw * core, outer[k][1]], B = [outer[j][0], sgn * hw * core, outer[j][1]];
      const Cc = [inner[j][0], sgn * hw, inner[j][1]], D = [inner[k][0], sgn * hw, inner[k][1]];
      const e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
      let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const L = Math.hypot(...n) || 1;
      n = n.map((c) => c / L);
      if (n[1] * sgn < 0) n = n.map((c) => -c);
      faces.push({ mat, n, pts: [A, B, Cc, D] });
    }
  }
  return faces;
}

// Build the sport-bike mesh (local axes: u forward, v sideways, w up; meters).
export function bikeMesh(seg = 18) {
  const F = [];
  const add = (poly, v0, v1, mat) => F.push(...extrude(poly, v0, v1, mat));
  const bev = (poly, hw, inset, mat) => F.push(...extrudeBevel(poly, hw, inset, mat));
  const both = (poly, a, b, mat) => { add(poly, a, b, mat); add(poly, -b, -a, mat); };
  add(flatten(PROFILE.swingarm), -0.07, 0.07, 'engine');
  for (const [c, hw] of [[REAR, 0.095], [FRONT, 0.065]]) {
    bev(circle(c, TIRE_R, seg), hw, 0.9, 'tire');
    add(circle(c, RIM_R, seg), -hw - 0.006, hw + 0.006, 'rim');
    add(circle(c, 7, 10), -hw - 0.012, hw + 0.012, 'hub');
  }
  both(circle([FRONT[0], FRONT[1]], 21, 16).map((q) => q), 0.072, 0.08, 'disc');
  bev(flatten(PROFILE.engine), 0.17, 0.9, 'engine');
  add(circle([150, 104], 12, 12), 0.17, 0.19, 'engineHi');
  add(flatten(PROFILE.muffler), 0.1, 0.24, 'exhaust');
  bev(flatten(PROFILE.tank), 0.18, 0.86, 'body');
  for (const [a, b] of FRAME_LINES) both(tube(a, b, 6), 0.15, 0.19, 'frame');
  bev(flatten(PROFILE.tail), 0.11, 0.9, 'body');
  add(flatten(PROFILE.seat), -0.12, 0.12, 'seat');
  both(tube(FORK_UP[0], FORK_UP[1], 8), 0.07, 0.1, 'fork');
  both(tube(FORK_LOW[0], FORK_LOW[1], 9), 0.07, 0.1, 'forkLow');
  add(flatten(PROFILE.fender), -0.07, 0.07, 'body');
  bev(flatten(PROFILE.fairing), 0.2, 0.88, 'body');
  add(flatten(PROFILE.vent), -0.205, 0.205, 'dark');
  add(flatten(PROFILE.intake), -0.205, 0.205, 'dark');
  add(flatten(PROFILE.windscreen), -0.12, 0.12, 'glass');
  add(flatten(PROFILE.headlight), -0.15, 0.15, 'light');
  both(flatten(PROFILE.mirror), 0.2, 0.26, 'body');
  both(tube([214, 98], [262, 88], 4), 0.2, 0.208, 'accent');
  return F;
}

// Color ramps, dark -> light. Body/frame/accent come from the bike variant.
const BASE_MATS = {
  tire: ['#0e0f13', '#17181e', '#23252d'],
  rim: ['#1a1c22', '#2e323d', '#4b5161'],
  hub: ['#6f7789', '#a2a9b8'],
  disc: ['#6f7789', '#a2a9b8', '#d5dae3'],
  engine: ['#1f2229', '#2e323d', '#4b5161', '#6f7789'],
  engineHi: ['#4b5161', '#6f7789', '#a2a9b8'],
  exhaust: ['#4b5161', '#8f97a8', '#c4cad6', '#ffffff'],
  seat: ['#0e0f13', '#1a1c22', '#2a2d36'],
  dark: ['#08090c', '#120b1c'],
  glass: ['#1d2340', '#2e3a5e', '#5a6f96'],
  light: ['#c2c8d4', '#fff1a8', '#ffffff'],
  fork: ['#8a6a10', '#c9a227', '#ffd23f'],
  forkLow: ['#6f7789', '#a2a9b8', '#d5dae3'],
};
export const BIKE_COLORS = {
  h2: { body: ['#0b0c10', '#111318', '#171a20', '#1f232b', '#2d323d', '#6f7789'], frame: ['#2f6f20', '#3f9d3a', '#7ce35b', '#b8f58a'], accent: ['#3f9d3a', '#7ce35b'] },
  r1: { body: ['#101d4f', '#1a2d7a', '#2747b0', '#3a5fc4', '#7d9cf0'], frame: ['#1a1c22', '#2e323d', '#4b5161'], accent: ['#c2c8d4', '#ffffff'] },
  ninja500: { body: ['#1f4f12', '#3f8f18', '#5fbf2a', '#86e04a', '#c9f59a'], frame: ['#1a1c22', '#2e323d', '#4b5161'], accent: ['#1a1c22', '#2e323d'] },
  panigale: { body: ['#4a0a10', '#7a1f2b', '#b81d22', '#e0262c', '#ff8a8a'], frame: ['#7a1f2b', '#b81d22', '#e0262c'], accent: ['#f4f0e6', '#ffffff'] },
  cbr: { body: ['#4a0a10', '#8f0e14', '#c8141c', '#e8333b', '#ff8c8c'], frame: ['#1a1c22', '#2e323d', '#4b5161'], accent: ['#1d4fc4', '#3a6fe0'] },
  s1000rr: { body: ['#8f97a8', '#b8c0cc', '#d5dae3', '#f2f4f7', '#ffffff'], frame: ['#1a1c22', '#2e323d', '#4b5161'], accent: ['#1c69d4', '#3a8af0'] },
  rsv4: { body: ['#0b0b0d', '#18181b', '#26262a', '#3c3c42', '#77777f'], frame: ['#7a1f2b', '#c8141c', '#e8333b'], accent: ['#c8141c', '#e8333b'] },
};

const LIGHT = (() => { const l = [0.35, 0.8, 1.0], m = Math.hypot(...l); return l.map((c) => c / m); })();
const MESHES = new Map();
const meshFor = (T) => { const seg = T > 24 ? 30 : 18; if (!MESHES.has(seg)) MESHES.set(seg, bikeMesh(seg)); return MESHES.get(seg); };

/**
 * Render a bike at a heading (radians, 0 = along +x) with T pixels per meter.
 * Returns { c: canvas, ax, ay } where (ax, ay) is the ground point under the bike's center.
 */
export function renderBike3D(variant, heading, T, { outline = '#120b1c', lift = 0 } = {}) {
  const mats = { ...BASE_MATS, ...BIKE_COLORS[variant] };
  const cs = Math.cos(heading), sn = Math.sin(heading);
  const rot = ([u, v, w]) => [u * cs - v * sn, u * sn + v * cs, w];
  const xf = (q) => { const r = rot(q); r[2] += lift; return r; };
  const proj = ([x, y, z]) => [(x - y) * T, ((x + y) * T) / 2 - z * T, x + y + z];
  const faces = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of meshFor(T)) {
    const n = rot(f.n);
    if (n[0] + n[1] + n[2] <= 1e-6) continue; // facing away from the camera
    const pts = f.pts.map((p) => proj(xf(p)));
    for (const [sx, sy] of pts) { x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy); }
    const b = 0.22 + 0.78 * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    const ramp = mats[f.mat];
    faces.push({ pts, col: ramp[Math.min(ramp.length - 1, Math.floor(b * ramp.length))] });
  }
  const ox = Math.floor(x0) - 2, oy = Math.floor(y0) - 2;
  const W = Math.ceil(x1) - ox + 3, H = Math.ceil(y1) - oy + 3;
  const zb = new Float32Array(W * H).fill(-Infinity);
  const cb = new Array(W * H).fill(null);
  for (const f of faces) {
    const p = f.pts.map(([sx, sy, d]) => [sx - ox, sy - oy, d]);
    // depth plane from the widest triangle of the face
    let best = null, ba = 1e-6;
    for (let i = 1; i < p.length - 1; i++) for (let j = i + 1; j < p.length; j++) {
      const a = Math.abs((p[i][0] - p[0][0]) * (p[j][1] - p[0][1]) - (p[j][0] - p[0][0]) * (p[i][1] - p[0][1]));
      if (a > ba) { ba = a; best = [p[0], p[i], p[j]]; }
    }
    if (!best) continue;
    const [A, B, C] = best;
    const det = (B[0] - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (B[1] - A[1]);
    const ga = ((B[2] - A[2]) * (C[1] - A[1]) - (C[2] - A[2]) * (B[1] - A[1])) / det;
    const gb = ((C[2] - A[2]) * (B[0] - A[0]) - (B[2] - A[2]) * (C[0] - A[0])) / det;
    const depth = (x, y) => A[2] + ga * (x - A[0]) + gb * (y - A[1]);
    const ys = p.map((q) => q[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y < Math.min(H, Math.ceil(Math.max(...ys))); y++) {
      const yc = y + 0.5, xs = [];
      for (let k = 0; k < p.length; k++) {
        const a = p[k], b = p[(k + 1) % p.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
      xs.sort((m, n) => m - n);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); x++) {
          const z = depth(x + 0.5, yc) + 1e-4;
          const idx = y * W + x;
          if (z > zb[idx]) { zb[idx] = z; cb[idx] = f.col; }
        }
      }
    }
  }
  const c = (typeof document !== 'undefined' ? document.createElement('canvas') : null);
  if (!c) return { W, H, cb, ax: -ox, ay: -oy };
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  for (let i = 0; i < cb.length; i++) if (cb[i]) { ctx.fillStyle = cb[i]; ctx.fillRect(i % W, (i / W) | 0, 1, 1); }
  if (outline) {
    ctx.fillStyle = outline;
    const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && cb[y * W + x];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!on(x, y) && (on(x + 1, y) || on(x - 1, y) || on(x, y + 1) || on(x, y - 1))) ctx.fillRect(x, y, 1, 1);
  }
  return { c, ax: -ox, ay: -oy };
}
