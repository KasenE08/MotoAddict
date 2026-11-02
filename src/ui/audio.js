// Sound effects (no music). Web Audio, unlocked on the first tap (iOS requirement).
const FILES = {
  click: ['click'], toggle: ['switch'], cash: ['cash1', 'cash2'], gear: ['coins', 'coins2'], door: ['door'],
  haggle: ['ui-notification'], tradein: ['ui-warning'], delivery: ['truck'], hire: ['ui-success'],
  upgrade: ['clang', 'ui-unlock'], achievement: ['ui-achievement'], reward: ['ui-reward', 'chips'], error: ['ui-error'],
  theft: ['alarm'], location: ['ui-level-up'], order: ['paper'], move: ['latch'], rev: ['engine-rev'], rideoff: ['ride-off'],
  purchase: ['ui-purchase'], page: ['page'], knock: ['knock'],
};
const VOLUME = { door: 0.35, gear: 0.6, rideoff: 0.45, rev: 0.7, truck: 0.8, click: 0.5, toggle: 0.5, theft: 0.6 };
// layered sounds play every file in the list; others pick one at random
const LAYER = new Set(['upgrade', 'reward']);
const MIN_GAP = { door: 1500, gear: 600, cash: 300, rideoff: 2500, click: 40 };

let ctx = null, master = null, muted = false;
const buffers = new Map(), loading = new Map(), last = new Map();
const base = new URL('../../assets/sfx/', import.meta.url);

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  return ctx;
}
async function load(name) {
  if (buffers.has(name)) return buffers.get(name);
  if (!loading.has(name)) loading.set(name, fetch(new URL(`${name}.mp3`, base)).then((r) => r.arrayBuffer()).then((b) => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej))).then((buf) => { buffers.set(name, buf); return buf; }).catch(() => null));
  return loading.get(name);
}

/** Call once: unlock audio on the first user gesture and warm up common sounds. */
export function initAudio(isMuted) {
  muted = !!isMuted;
  const unlock = () => {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    for (const k of ['click', 'cash', 'door', 'haggle']) for (const f of FILES[k]) load(f);
    window.removeEventListener('pointerdown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, true);
  // any button press clicks
  document.addEventListener('click', (e) => { if (e.target.closest('button')) sfx('click'); }, true);
}

export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; }
export const isMuted = () => muted;

export async function sfx(name, delay = 0) {
  if (muted || !FILES[name]) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const now = performance.now();
  if (MIN_GAP[name] && now - (last.get(name) || 0) < MIN_GAP[name]) return;
  last.set(name, now);
  const list = LAYER.has(name) ? FILES[name] : [FILES[name][Math.floor(Math.random() * FILES[name].length)]];
  for (const f of list) {
    const buf = await load(f);
    if (!buf) continue;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.value = VOLUME[name] ?? 0.8;
    src.connect(g).connect(master);
    src.start(c.currentTime + delay);
  }
}
