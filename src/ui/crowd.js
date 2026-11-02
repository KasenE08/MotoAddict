// Turns the simulation into people: customers walking in/browsing/haggling/
// leaving, and every hired employee at their post (salesmen follow customers,
// janitors walk to trash piles, mechanics at the lifts, a guard on night patrol).
import { getLayout } from '../data/layout.js';
import { drawPeople } from '../render/world.js';
import { isOpenAt } from '../core/time.js';
import { n } from '../core/effects.js';

const SPEED = 1.6; // tiles per second
const SHIRTS = ['#e04a3a', '#3a5fc4', '#7ce35b', '#ffd23f', '#f4f0e6', '#5a4878', '#ff8a6b', '#2a8f9a', '#c2b6d6', '#1d2d6b'];
const PANTS = ['#2e323d', '#1d2d6b', '#4b5161', '#6b4423', '#120b1c'];
const SKIN = ['#e8b06a', '#c27a3a', '#8a4a23', '#f2c7a5'];
const HAIR = ['#120b1c', '#3d2b56', '#8a4a23', '#ffd23f', '#a2a9b8', '#6b4423'];
const lookFor = (seed) => ({ shirt: SHIRTS[seed % 10], pants: PANTS[(seed >> 4) % 5], skin: SKIN[(seed >> 8) % 4], hair: HAIR[(seed >> 12) % 6] });
const UNIFORM = {
  owner: { shirt: '#f4f0e6', pants: '#2e323d', tie: '#e04a3a', skin: '#e8b06a', hair: '#3d2b56' },
  salesman: { shirt: '#f4f0e6', pants: '#1d2d6b', tie: '#3a5fc4', skin: '#c27a3a', hair: '#120b1c' },
  receptionist: { shirt: '#ffd23f', pants: '#2e323d', skin: '#f2c7a5', hair: '#8a4a23' },
  marketing: { shirt: '#ff8ae2', pants: '#2e323d', skin: '#e8b06a', hair: '#ffd23f' },
  janitor: { shirt: '#2a8f9a', pants: '#2a8f9a', skin: '#8a4a23', hair: '#1d2d6b', cap: '#2a8f9a', mop: true },
  finance: { shirt: '#2e323d', pants: '#2e323d', tie: '#ffd23f', skin: '#e8b06a', hair: '#a2a9b8' },
  mechanic: { shirt: '#ff8a6b', pants: '#ff8a6b', skin: '#c27a3a', hair: '#3d2b56', cap: '#e04a3a', tool: 'wrench' },
  detailer: { shirt: '#5ab0e8', pants: '#1d2d6b', skin: '#f2c7a5', hair: '#120b1c', tool: 'hose' },
  clerk: { shirt: '#7ce35b', pants: '#2e323d', skin: '#e8b06a', hair: '#6b4423' },
  guard: { shirt: '#1d2d6b', pants: '#1d2d6b', skin: '#8a4a23', hair: '#120b1c', hat: '#1d2d6b' },
};

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function along(path, ms) {
  let left = (ms / 1000) * SPEED;
  for (let k = 0; k + 1 < path.length; k++) {
    const d = dist(path[k], path[k + 1]);
    if (left <= d) { const f = d ? left / d : 1; return [path[k][0] + (path[k + 1][0] - path[k][0]) * f, path[k][1] + (path[k + 1][1] - path[k][1]) * f, true]; }
    left -= d;
  }
  const e = path[path.length - 1];
  return [e[0], e[1], false];
}
const pathTime = (path) => (path.slice(1).reduce((t, p, k) => t + dist(path[k], p), 0) / SPEED) * 1000;

export function makeCrowd(canvasIn, canvasOut) {
  const ghosts = [];
  const walkers = new Map(); // staff that move smoothly toward a target
  const lastPos = new Map();
  let lastKey = '';

  function walk(id, target, look, frame) {
    let p = walkers.get(id);
    if (!p) { p = [...target]; walkers.set(id, p); }
    const d = dist(p, target), stepLen = Math.min(d, SPEED * 0.12);
    if (d > 0.01) { p[0] += ((target[0] - p[0]) / d) * stepLen; p[1] += ((target[1] - p[1]) / d) * stepLen; }
    return { x: p[0], y: p[1], look, step: d > 0.05 ? (frame % 2) + 1 : 0 };
  }

  return {
    leave(ev, t, loc) {
      const p = lastPos.get(ev.cust);
      if (!p || ev.why === 'closing') return;
      const L = getLayout(loc);
      const path = ev.why === 'bought' ? [[p.x, p.y], L.deskCustomer, L.doorIn, L.doorOut] : [[p.x, p.y], L.doorIn, L.doorOut];
      ghosts.push({ path, start: t, look: p.look, bubble: ev.why === 'bought' ? '$' : null, until: t + pathTime(path) });
    },
    draw(state, t) {
      const i = state.activeLoc, L = getLayout(i);
      const loc = state.locations[i], sim = loc.sim;
      const bikes = loc.bikes;
      const people = [];
      const serving = [];
      const frame = Math.floor(t / 180) % 4;
      const open = isOpenAt(t);
      // ---- customers ----
      for (const c of sim?.customers || []) {
        if (t < c.arrivedAt) continue;
        const wait = L.wait(c.id);
        const enter = [L.doorOut, L.doorIn, wait];
        const inMs = t - c.arrivedAt;
        let x, y, w;
        if (inMs < pathTime(enter) || c.phase === 'queue') [x, y, w] = along(enter, inMs);
        else {
          const b = bikes.find((q) => q.uid === c.bikeUid) || bikes[c.id % Math.max(1, bikes.length)];
          const sp = b && L.spot[b.spot];
          const view = sp ? [sp.vx, sp.vy] : L.focus;
          [x, y, w] = along([wait, view], t - (c.servedAt ?? c.arrivedAt));
        }
        const look = lookFor(c.look);
        lastPos.set(c.id, { x, y, look });
        const bubble = c.phase === 'haggle' ? '!' : c.phase === 'browse' && !w ? '...' : null;
        people.push({ x, y, look, step: w ? (frame % 2) + 1 : 0, bubble });
        if (c.phase === 'browse' || c.phase === 'haggle') serving.push([x, y]);
      }
      for (let k = ghosts.length - 1; k >= 0; k--) {
        const g = ghosts[k];
        if (t > g.until) { ghosts.splice(k, 1); continue; }
        const [x, y, w] = along(g.path, t - g.start);
        people.push({ x, y, look: g.look, step: w ? (frame % 2) + 1 : 0, bubble: t - g.start < 1500 ? g.bubble : null });
      }
      // ---- staff ----
      if (loc.owned) {
        const sellers = 1 + n(state, i, 'salesman');
        for (let k = 0; k < sellers; k++) {
          const c = serving[k];
          const target = c ? [c[0] + 0.7, c[1] - 0.5] : L.salesIdle(k);
          people.push(walk(`s${k}`, target, k === 0 ? UNIFORM.owner : UNIFORM.salesman, frame));
        }
        if (n(state, i, 'receptionist')) people.push(walk('rec', [L.desk.x + 0.7, L.desk.y], UNIFORM.receptionist, frame));
        if (n(state, i, 'receptionist') > 1) people.push(walk('rec2', [L.desk.x + 0.7, L.desk.y + 0.9], UNIFORM.receptionist, frame));
        if (n(state, i, 'finance')) people.push(walk('fin', L.finance, UNIFORM.finance, frame));
        for (let k = 0; k < n(state, i, 'marketing'); k++) people.push(walk(`mk${k}`, [L.marketing[0] - k * 1.2, L.marketing[1]], UNIFORM.marketing, frame));
        for (let k = 0; k < n(state, i, 'clerk'); k++) people.push(walk(`cl${k}`, [L.partsClerk[0] + k * 1.4, L.partsClerk[1]], UNIFORM.clerk, frame));
        for (let k = 0; k < n(state, i, 'mechanic'); k++) people.push({ ...walk(`me${k}`, L.mechanic(k), UNIFORM.mechanic, frame), bubble: open && frame === k % 4 ? 'wrench' : null });
        for (let k = 0; k < n(state, i, 'detailer'); k++) people.push(walk(`de${k}`, L.detailer(k), UNIFORM.detailer, frame));
        // janitors head for trash piles
        const pileCount = Math.ceil(sim?.piles || 0);
        for (let k = 0; k < n(state, i, 'janitor'); k++) {
          const target = k < pileCount ? (([px, py]) => [px + 0.5, py + 0.3])(L.trash(k)) : L.janitorIdle(k);
          people.push(walk(`ja${k}`, target, UNIFORM.janitor, frame));
        }
        // guards patrol at night, sit in the security office by day
        for (let k = 0; k < n(state, i, 'guard'); k++) {
          let target = [L.security[0] + k, L.security[1]];
          if (!open) { const pts = L.patrol, seg = Math.floor(t / 6000 + k * 2) % pts.length; target = pts[seg]; }
          people.push(walk(`gu${k}`, target, UNIFORM.guard, frame));
        }
      }
      const piles = Array.from({ length: Math.ceil(sim?.piles || 0) }, (_, k) => L.trash(k));
      const key = people.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.step},${p.bubble}`).join('|') + `#${piles.length}#${i}`;
      if (key === lastKey) return;
      lastKey = key;
      drawPeople(canvasIn, people.filter((p) => p.y < L.SD - 0.15), i, piles);
      drawPeople(canvasOut, people.filter((p) => p.y >= L.SD - 0.15), i);
    },
    reset() { ghosts.length = 0; lastPos.clear(); walkers.clear(); lastKey = ''; },
  };
}
