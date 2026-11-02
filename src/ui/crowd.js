// Turns the customer simulation into people walking around the showroom.
// Positions are derived from each customer's phase + timestamps, so nothing
// visual needs saving. Customers who leave become short-lived "ghosts" that
// walk out of the door.
import { SPOT, SPOTS } from '../data/showroom.js';
import { drawPeople } from '../render/world.js';

const SPEED = 1.6; // tiles per second
const DOOR_OUT = [7.0, 12.6], DOOR_IN = [7.0, 9.5], DESK = [11.9, 6.8], IDLE = [11.4, 3.9];
const SHIRTS = ['#e04a3a', '#3a5fc4', '#7ce35b', '#ffd23f', '#f4f0e6', '#5a4878', '#ff8a6b', '#2a8f9a', '#c2b6d6', '#1d2d6b'];
const PANTS = ['#2e323d', '#1d2d6b', '#4b5161', '#6b4423', '#120b1c'];
const SKIN = ['#e8b06a', '#c27a3a', '#8a4a23', '#f2c7a5'];
const HAIR = ['#120b1c', '#3d2b56', '#8a4a23', '#ffd23f', '#a2a9b8', '#6b4423'];
const lookFor = (seed) => ({ shirt: SHIRTS[seed % 10], pants: PANTS[(seed >> 4) % 5], skin: SKIN[(seed >> 8) % 4], hair: HAIR[(seed >> 12) % 6] });
const STAFF_LOOK = { shirt: '#f4f0e6', pants: '#2e323d', tie: '#e04a3a', skin: '#e8b06a', hair: '#3d2b56' };

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Position after walking `ms` along a path of points. Returns [x, y, walking]. */
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
const pathTime = (path) => path.slice(1).reduce((t, p, k) => t + dist(path[k], p), 0) / SPEED * 1000;

export function makeCrowd(canvasIn, canvasOut) {
  const ghosts = [];
  let staff = [...IDLE];
  const lastPos = new Map();
  let lastKey = '';

  const waitSpot = (c) => [5.8 + (c.id % 3) * 0.7, 8.3 - (c.id % 2) * 0.6];
  const viewSpot = (bikes, c) => {
    const b = bikes.find((x) => x.uid === c.bikeUid) || bikes[c.id % Math.max(1, bikes.length)];
    const sp = b && SPOT[b.spot];
    return sp ? [sp.vx, sp.vy] : [7, 6];
  };

  function customerPos(c, bikes, t) {
    const enter = [DOOR_OUT, DOOR_IN, waitSpot(c)];
    const inMs = t - c.arrivedAt;
    if (inMs < pathTime(enter) || c.phase === 'queue') { const [x, y, w] = along(enter, inMs); return { x, y, walking: w }; }
    const view = viewSpot(bikes, c);
    const [x, y, w] = along([waitSpot(c), view], t - (c.servedAt ?? c.arrivedAt));
    return { x, y, walking: w, view };
  }

  return {
    /** A customer left: walk them out (via the desk if they bought). */
    leave(ev, t) {
      const p = lastPos.get(ev.cust);
      if (!p || ev.why === 'closing') return;
      const path = ev.why === 'bought' ? [[p.x, p.y], DESK, DOOR_IN, DOOR_OUT] : [[p.x, p.y], DOOR_IN, DOOR_OUT];
      ghosts.push({ path, start: t, look: p.look, bubble: ev.why === 'bought' ? '$' : null, until: t + pathTime(path) });
    },
    draw(state, t) {
      const i = state.activeLoc;
      const sim = state.locations[i].sim;
      const bikes = state.locations[i].bikes;
      const people = [];
      let serving = null;
      const frame = Math.floor(t / 180) % 4;
      for (const c of sim?.customers || []) {
        if (t < c.arrivedAt) continue;
        const p = customerPos(c, bikes, t);
        const look = lookFor(c.look);
        lastPos.set(c.id, { x: p.x, y: p.y, look });
        const bubble = c.phase === 'haggle' ? '!' : c.phase === 'browse' && !p.walking ? '...' : null;
        people.push({ x: p.x, y: p.y, look, step: p.walking ? (frame % 2) + 1 : 0, bubble });
        if (!serving && (c.phase === 'browse' || c.phase === 'haggle')) serving = p;
      }
      for (let k = ghosts.length - 1; k >= 0; k--) {
        const g = ghosts[k];
        if (t > g.until) { ghosts.splice(k, 1); continue; }
        const [x, y, w] = along(g.path, t - g.start);
        people.push({ x, y, look: g.look, step: w ? (frame % 2) + 1 : 0, bubble: t - g.start < 1500 ? g.bubble : null });
      }
      // you (the owner) do the selling until salesmen are hired in Phase 5
      const target = serving ? [serving.x + 0.7, serving.y - 0.5] : IDLE;
      const d = dist(staff, target);
      const stepLen = Math.min(d, SPEED * 0.12);
      if (d > 0.01) staff = [staff[0] + ((target[0] - staff[0]) / d) * stepLen, staff[1] + ((target[1] - staff[1]) / d) * stepLen];
      if (state.locations[i].owned) people.push({ x: staff[0], y: staff[1], look: STAFF_LOOK, step: d > 0.05 ? (frame % 2) + 1 : 0 });
      // skip the redraw when nobody moved
      const key = people.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.step},${p.bubble}`).join('|');
      if (key === lastKey) return;
      lastKey = key;
      // inside the showroom goes under the front glass; the plaza goes on top
      drawPeople(canvasIn, people.filter((p) => p.y < 9.85));
      drawPeople(canvasOut, people.filter((p) => p.y >= 9.85));
    },
    reset() { ghosts.length = 0; lastPos.clear(); lastKey = ''; },
  };
}

export { SPOTS };
