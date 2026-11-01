// Style 1 — Isometric cartoon 3D (closest to Prison Empire Tycoon).
import { paintBike, bikeSVG, VARIANTS, H2_SPECS } from '../bike.js';

const U = 19, OX = 195, OY = 300;
const pr = (x, y, z = 0) => [OX + (x - y) * U, OY + (x + y) * U / 2 - z * U];
const pts = (...p) => p.map((q) => pr(...q).map((n) => n.toFixed(1)).join(',')).join(' ');
const poly = (fill, ...p) => `<polygon points="${pts(...p)}" fill="${fill}"/>`;
const OUT = '#26304a';

function box(x, y, z, w, d, h, [top, left, right], stroke = true) {
  const s = stroke ? `stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"` : '';
  return `<g ${s}>
    <polygon points="${pts([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h])}" fill="${left}"/>
    <polygon points="${pts([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h])}" fill="${right}"/>
    <polygon points="${pts([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h])}" fill="${top}"/>
  </g>`;
}

function shadowAt(x, y, rx = 22, ry = 9) {
  const [sx, sy] = pr(x, y);
  return `<ellipse cx="${sx}" cy="${sy}" rx="${rx}" ry="${ry}" fill="#1c2340" opacity=".22" filter="url(#isoBlur)"/>`;
}

const BASE = {
  tire: '#1d2130', tireHi: '#3a4157', rim: '#2b3042', rimInner: '#454d66', hub: '#c9cfdc', disc: '#c4cad6', caliper: '#f2b83b',
  swingarm: '#323a50', engine: '#4a5370', engineDetail: '#6b7699', seat: '#262b3b', fork: '#f2b83b', forkLow: '#c4cad6',
  dark: '#11141d', glass: '#7fa4c9', light: '#fffbe0', exhaust: '#c9d1de', exhaustHi: '#ffffff',
};
export const isoBikeInner = (v = 'h2', o = {}) =>
  paintBike({ ...BASE, ...VARIANTS[v] }, { outline: 3, outlineColor: OUT, badge: v === 'h2', ...o });

// Place a side-view bike sprite onto the iso floor, aligned to the x or y axis.
function isoBike(v, x, y, axis = 'x', k = 0.22) {
  const [sx, sy] = pr(x, y);
  const m = axis === 'x' ? `${k},${k / 2},0,${k}` : `${-k},${k / 2},0,${k}`;
  return `<g transform="translate(${sx},${sy}) matrix(${m},0,0) translate(-166,-177)">${isoBikeInner(v)}</g>`;
}

function person(x, y, { shirt = '#ff7a59', pants = '#2d3550', skin = '#f4c29c', hair = '#3b2a20', tie, cap, mop, sit } = {}) {
  const [sx, sy] = pr(x, y);
  const leg = sit ? '' : `<rect x="-6" y="-14" width="5" height="13" rx="2" fill="${pants}"/><rect x="1" y="-14" width="5" height="13" rx="2" fill="${pants}"/>`;
  return `<g transform="translate(${sx},${sy})" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round">
    <ellipse cx="0" cy="0" rx="11" ry="4.5" fill="#1c2340" opacity=".25" stroke="none"/>
    ${leg}
    <rect x="-8" y="${sit ? -22 : -30}" width="16" height="18" rx="6" fill="${shirt}"/>
    ${tie ? `<path d="M0,${-29} l-2,4 2,9 2,-9z" fill="${tie}" stroke="none"/>` : ''}
    <circle cx="0" cy="${sit ? -31 : -39}" r="9" fill="${skin}"/>
    <path d="M-9,${sit ? -32 : -40} a9,9 0 0 1 18,0 q-4,-4 -9,-3 q-5,-1 -9,3z" fill="${cap || hair}"/>
    ${cap ? `<rect x="-2" y="${-46}" width="12" height="3" rx="1.5" fill="${cap}"/>` : ''}
    <circle cx="-3" cy="${sit ? -30 : -38}" r="1.2" fill="${OUT}" stroke="none"/><circle cx="3" cy="${sit ? -30 : -38}" r="1.2" fill="${OUT}" stroke="none"/>
    ${mop ? `<path d="M10,-22 L20,6" stroke="#8a5a32" stroke-width="2.5"/><path d="M14,4 h12 l2,4 h-16z" fill="#d9e6ff"/>` : ''}
  </g>`;
}

function bubble(x, y, z, content, w = 46) {
  const [sx, sy] = pr(x, y, z);
  return `<g transform="translate(${sx},${sy})">
    <path d="M${-w / 2},-34 h${w} a8,8 0 0 1 8,8 v12 a8,8 0 0 1 -8,8 h${-w / 2 + 8} l-6,8 -2,-8 h${-w / 2 + 2} a8,8 0 0 1 -8,-8 v-12 a8,8 0 0 1 8,-8z" fill="#fff" stroke="${OUT}" stroke-width="1.5"/>
    ${content}
  </g>`;
}

export function isoScene() {
  const defs = `
    <filter id="isoBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <radialGradient id="isoSpot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff6c9" stop-opacity=".85"/><stop offset="1" stop-color="#fff6c9" stop-opacity="0"/></radialGradient>
    <linearGradient id="isoSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd0ff"/><stop offset="1" stop-color="#bfe8ff"/></linearGradient>
    <linearGradient id="isoGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset=".5" stop-color="#8fd0f5"/><stop offset="1" stop-color="#6ab6e6"/></linearGradient>
    <pattern id="isoGrass" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#86cf5d"/><path d="M3 9l1-3 1 3M10 4l1-3 1 3" stroke="#6fb748" stroke-width="1.2" fill="none"/></pattern>`;
  let s = '';
  // road + sidewalk + parking around the building
  s += poly('#d9dde6', [-2, -2], [12.5, -2], [12.5, 12.5], [-2, 12.5]);
  s += poly('#596277', [-2, 12.5], [16, 12.5], [16, 17], [-2, 17]);
  s += poly('#596277', [12.5, -6], [16, -6], [16, 12.5], [12.5, 12.5]);
  for (let i = 0; i < 6; i++) s += poly('#f5f7fb', [-1 + i * 3, 14.6], [0.4 + i * 3, 14.6], [0.4 + i * 3, 14.9], [-1 + i * 3, 14.9]);
  // trees behind the building
  for (const [x, y] of [[-1, -4.5], [3, -5], [8, -5.2], [-5, 1], [-5, 6]]) {
    const [tx, ty] = pr(x, y);
    s += `<g transform="translate(${tx},${ty})" stroke="${OUT}" stroke-width="1.3"><rect x="-3" y="-14" width="6" height="14" fill="#8a5a32"/><circle cx="0" cy="-26" r="16" fill="#4fae4a"/><circle cx="-6" cy="-31" r="7" fill="#6cc860" stroke="none"/></g>`;
  }
  // floor (checker tiles)
  for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++)
    s += `<polygon points="${pts([x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1])}" fill="${(x + y) % 2 ? '#eef1f7' : '#dfe4ee'}"/>`;
  // front slab edge (gives the floor thickness)
  s += `<polygon points="${pts([0, 10, 0], [10, 10, 0], [10, 10, -0.4], [0, 10, -0.4])}" fill="#b9c1d3" stroke="${OUT}" stroke-width="1.2"/>`;
  s += `<polygon points="${pts([10, 0, 0], [10, 10, 0], [10, 10, -0.4], [10, 0, -0.4])}" fill="#a3acc2" stroke="${OUT}" stroke-width="1.2"/>`;
  // back walls
  s += `<polygon points="${pts([0, 0, 0], [10, 0, 0], [10, 0, 4.6], [0, 0, 4.6])}" fill="#ffd7a8" stroke="${OUT}" stroke-width="1.4"/>`;
  s += `<polygon points="${pts([0, 0, 0], [0, 10, 0], [0, 10, 4.6], [0, 0, 4.6])}" fill="#ffc78c" stroke="${OUT}" stroke-width="1.4"/>`;
  s += poly('#fff0dc', [-0.35, -0.35, 4.6], [10, -0.35, 4.6], [10, 0, 4.6], [0, 0, 4.6], [0, 10, 4.6], [-0.35, 10, 4.6]);
  // storefront windows on wall A
  for (let i = 0; i < 3; i++) {
    const x0 = 1 + i * 3, x1 = x0 + 2.4;
    s += `<polygon points="${pts([x0, 0, 1.1], [x1, 0, 1.1], [x1, 0, 4], [x0, 0, 4])}" fill="url(#isoGlass)" stroke="${OUT}" stroke-width="1.4"/>`;
    s += `<polygon points="${pts([x0 + 0.4, 0, 1.4], [x0 + 0.9, 0, 1.4], [x0 + 1.9, 0, 3.7], [x0 + 1.4, 0, 3.7])}" fill="#fff" opacity=".55"/>`;
  }
  // big sign on wall B
  const [sgx, sgy] = pr(0, 7.4, 3.2);
  s += `<g transform="translate(${sgx},${sgy}) matrix(1,-0.5,0,1,0,0)">
    <rect x="0" y="-22" width="150" height="30" rx="7" fill="#ff5a5f" stroke="${OUT}" stroke-width="1.6"/>
    <text x="75" y="0" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="19" fill="#fff">MOTOADDICT</text></g>`;
  // posters on wall B
  for (const [y, c] of [[2, '#5b8cff'], [4.2, '#4fd18b']]) {
    const [px, py] = pr(0, y, 2.6);
    s += `<g transform="translate(${px},${py}) matrix(1,-0.5,0,1,0,0)"><rect x="0" y="0" width="26" height="34" fill="${c}" stroke="${OUT}" stroke-width="1.4"/><circle cx="13" cy="14" r="7" fill="#fff" opacity=".8"/><rect x="5" y="25" width="16" height="3" fill="#fff"/></g>`;
  }
  // rug + lounge
  s += `<polygon points="${pts([2.2, 7.4], [5.4, 7.4], [5.4, 9.9], [2.2, 9.9])}" fill="#7f6cf0" opacity=".9"/>`;
  s += `<polygon points="${pts([2.5, 7.7], [5.1, 7.7], [5.1, 9.6], [2.5, 9.6])}" fill="none" stroke="#b9adff" stroke-width="2"/>`;
  // wall-side bikes on low plinths
  s += box(1.1, 0.5, 0, 3.2, 1.3, 0.25, ['#ffffff', '#cfd6e4', '#b8c1d4']);
  s += isoBike('r1', 2.7, 1.15, 'x', 0.25);
  s += box(6.0, 0.5, 0, 3.2, 1.3, 0.25, ['#ffffff', '#cfd6e4', '#b8c1d4']);
  s += isoBike('panigale', 7.6, 1.15, 'x', 0.25);
  s += box(0.5, 2.0, 0, 1.3, 3.2, 0.25, ['#ffffff', '#cfd6e4', '#b8c1d4']);
  s += isoBike('ninja500', 1.15, 3.6, 'y', 0.25);
  // hero H2 on a turntable with spotlight
  const [hx, hy] = pr(5.2, 4.6);
  s += `<ellipse cx="${hx}" cy="${hy + 2}" rx="64" ry="30" fill="#2b3350" stroke="${OUT}" stroke-width="1.5"/>`;
  s += `<ellipse cx="${hx}" cy="${hy - 4}" rx="64" ry="30" fill="#e9edf7" stroke="${OUT}" stroke-width="1.5"/>`;
  s += `<ellipse cx="${hx}" cy="${hy - 4}" rx="52" ry="23" fill="none" stroke="#c7cfdf" stroke-width="2"/>`;
  s += isoBike('h2', 5.2, 4.7, 'x', 0.31);
  s += `<polygon points="${hx - 26},${hy - 150} ${hx + 26},${hy - 150} ${hx + 70},${hy} ${hx - 70},${hy}" fill="url(#isoSpot)" opacity=".55"/>`;
  s += box(0.5, 6.4, 0, 1.3, 3.2, 0.25, ['#ffffff', '#cfd6e4', '#b8c1d4']);
  s += isoBike('s1000rr', 1.15, 8.0, 'y', 0.25);
  // plants
  for (const [x, y] of [[9.3, 0.6], [0.6, 9.3]]) {
    s += box(x - 0.3, y - 0.3, 0, 0.6, 0.6, 0.6, ['#c8875a', '#a86a40', '#8f5733']);
    const [px, py] = pr(x, y, 0.6);
    s += `<g stroke="${OUT}" stroke-width="1.2"><circle cx="${px}" cy="${py - 10}" r="11" fill="#4fae4a"/><circle cx="${px - 6}" cy="${py - 4}" r="7" fill="#5fc25a"/><circle cx="${px + 7}" cy="${py - 5}" r="7" fill="#5fc25a"/></g>`;
  }
  // front desk + receptionist
  s += person(8.7, 4.9, { shirt: '#ffb84d', hair: '#7a3b1f' });
  s += box(7.6, 5.4, 0, 2.2, 0.8, 1.1, ['#ffffff', '#7a8fbf', '#5c6fa0']);
  s += box(8.4, 5.5, 1.1, 0.5, 0.1, 0.55, ['#26304a', '#3a4b7a', '#26304a']);
  // customer + salesman near the hero bike
  s += person(6.0, 8.8, { shirt: '#5b8cff', pants: '#36405e', hair: '#1f1a17' });
  s += person(7.0, 8.4, { shirt: '#ffffff', pants: '#26304a', tie: '#ff5a5f', hair: '#2b1d14' });
  s += bubble(6.0, 8.8, 2.6, `<text x="0" y="-15" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="13" fill="#26304a">$$ R1?</text>`, 44);
  // browsing customer
  s += person(8.4, 2.6, { shirt: '#4fd18b', hair: '#d9a441' });
  // trash pile + janitor
  const [tx, ty] = pr(7.9, 9.5);
  s += `<g transform="translate(${tx},${ty})" stroke="${OUT}" stroke-width="1.1"><ellipse cx="0" cy="-3" rx="13" ry="6" fill="#9a7b4f"/><circle cx="-5" cy="-7" r="4" fill="#b8945f"/><rect x="2" y="-12" width="7" height="8" rx="1" fill="#e9edf7" transform="rotate(15 5 -8)"/><path d="M-9,-16 q2,-4 4,0 M4,-20 q2,-4 4,0" fill="none" stroke="#26304a"/></g>`;
  s += person(8.9, 9.3, { shirt: '#56c4d8', hair: '#4a3324', cap: '#2b8fa3', mop: true });
  // couch, coffee table, coffee bar
  s += box(2.4, 9.0, 0, 2.8, 0.8, 0.5, ['#ff8a5c', '#e2673c', '#c9552e']);
  s += box(2.4, 9.5, 0.5, 2.8, 0.3, 0.6, ['#ff9d75', '#e2673c', '#c9552e']);
  s += person(3.2, 8.9, { shirt: '#c66bff', hair: '#2b1d14', sit: true });
  s += box(2.9, 7.9, 0, 1.8, 0.7, 0.35, ['#8a5a32', '#6e4524', '#5b391d']);
  s += box(9.1, 6.6, 0, 0.8, 1.6, 1.0, ['#5a3a24', '#3f2818', '#2f1e12']);
  const [cx, cy] = pr(9.5, 7.0, 1.0);
  s += `<g stroke="${OUT}" stroke-width="1.1"><rect x="${cx - 8}" y="${cy - 16}" width="12" height="14" rx="2" fill="#c4cad6"/><circle cx="${cx + 8}" cy="${cy - 2}" r="3" fill="#fff"/></g>`;
  // floating income pop
  const [mx, my] = pr(5.0, 4.4, 4.2);
  s += `<g transform="translate(${mx},${my})"><text x="0" y="0" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="20" fill="#ffd23f" stroke="${OUT}" stroke-width="4" paint-order="stroke">+$32,700</text></g>`;
  // outdoor display bike + parked car
  s += isoBike('cbr', 10.9, 5.0, 'y', 0.22);
  return `<svg class="scene-svg" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs><rect width="390" height="844" fill="url(#isoGrass)"/><g transform="translate(195,372) scale(1.24) translate(-195,-350)">${s}</g></svg>`;
}

export function isoBikeArt() {
  return bikeSVG(isoBikeInner('h2', { shadow: 'rgba(28,35,64,.25)' }), { w: '100%', h: '100%' });
}

export function isoIcon() {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="ii-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fc9ff"/><stop offset="1" stop-color="#2f7cf6"/></linearGradient>
    <radialGradient id="ii-coin" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff4b0"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e09a00"/></radialGradient></defs>
    <rect width="512" height="512" fill="url(#ii-bg)"/>
    <circle cx="256" cy="210" r="150" fill="url(#ii-coin)" stroke="${OUT}" stroke-width="12"/>
    <circle cx="256" cy="210" r="118" fill="none" stroke="#e09a00" stroke-width="8"/>
    <text x="256" y="268" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="170" fill="#fff" stroke="${OUT}" stroke-width="10" paint-order="stroke">$</text>
    <ellipse cx="256" cy="440" rx="200" ry="22" fill="#1c2340" opacity=".3"/>
    <g transform="translate(36,240) scale(1.38)">${isoBikeInner('h2', { badge: false })}</g>
  </svg>`;
}

export const iso = {
  id: 'iso',
  num: 1,
  name: 'Isometric Cartoon',
  blurb: 'Chunky 3D-looking rooms seen from above, bright colors, soft shadows, cute little customers. Closest to Prison Empire Tycoon.',
  scene: isoScene,
  bike: isoBikeArt,
  icon: isoIcon,
  specs: H2_SPECS,
};
