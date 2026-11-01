// Style 2 — Flat vector minimal. Side-on showroom, no outlines, pastel palette.
import { paintBike, bikeSVG, VARIANTS, H2_SPECS } from '../bike.js';

const C = { navy: '#1d2541', coral: '#ff7a59', mint: '#3ecf9a', mustard: '#ffb020', sky: '#8fd3f4', lilac: '#a99bff', cream: '#f7f1ea', wall: '#efe7dc', floor: '#e3dcd2', skin: '#f2c7a5', skin2: '#c98c62', skin3: '#8a5a3c' };

const BASE = {
  tire: '#252a3a', rim: '#3a4157', rimInner: '#2f3548', hub: '#d7dbe4', disc: '#c2c8d4', caliper: C.mustard,
  swingarm: '#3a4157', engine: '#4b536c', engineDetail: '#5d6683', seat: '#252a3a', fork: C.mustard, forkLow: '#c2c8d4',
  dark: '#14182a', glass: '#7d8fb0', light: '#fff8e1', exhaust: '#c9cfda',
};
export const flatBikeInner = (v = 'h2', o = {}) => {
  const vv = { ...VARIANTS[v] };
  vv.bodyHi = null; // flat: two-tone only
  return paintBike({ ...BASE, ...vv }, { badge: v === 'h2', ...o });
};
const bike = (v, cx, base, k) => `<g transform="translate(${cx},${base}) scale(${k}) translate(-166,-177)">${flatBikeInner(v)}</g>`;

function person(x, base, { shirt, pants = C.navy, skin = C.skin, hair = C.navy, h = 1, tie, sit, mop, flip } = {}) {
  const t = `translate(${x},${base}) scale(${(flip ? -1 : 1) * h},${h})`;
  const legs = sit ? '' : `<rect x="-9" y="-34" width="8" height="34" rx="4" fill="${pants}"/><rect x="1" y="-34" width="8" height="34" rx="4" fill="${pants}"/>`;
  const by = sit ? -40 : -74;
  return `<g transform="${t}">
    ${legs}
    <path d="M-14,${by + 44} L-12,${by + 8} Q0,${by - 2} 12,${by + 8} L14,${by + 44} Z" fill="${shirt}"/>
    ${tie ? `<path d="M0,${by + 6} l-3,6 3,16 3,-16z" fill="${tie}"/>` : ''}
    <rect x="-4" y="${by - 6}" width="8" height="10" fill="${skin}"/>
    <circle cx="0" cy="${by - 16}" r="12" fill="${skin}"/>
    <path d="M-12,${by - 16} a12,12 0 0 1 24,0 q-4,-6 -12,-5 q-8,-1 -12,5z" fill="${hair}"/>
    ${mop ? `<rect x="14" y="${by + 10}" width="3" height="70" fill="${C.mustard}" transform="rotate(12 15 ${by + 10})"/><rect x="18" y="-6" width="22" height="7" rx="3" fill="${C.sky}"/>` : ''}
  </g>`;
}

function plant(x, base, s = 1) {
  return `<g transform="translate(${x},${base}) scale(${s})">
    <path d="M-12,0 L-15,-26 H15 L12,0 Z" fill="${C.coral}"/>
    <path d="M0,-26 C-24,-40 -26,-70 -6,-84 C-2,-60 2,-50 0,-26Z" fill="${C.mint}"/>
    <path d="M0,-26 C22,-36 30,-62 14,-80 C6,-58 2,-46 0,-26Z" fill="#2fb383"/>
    <path d="M0,-26 C-4,-50 -2,-80 6,-96 C10,-70 6,-50 0,-26Z" fill="#56dca9"/>
  </g>`;
}

export function flatScene() {
  let s = '';
  s += `<rect width="390" height="844" fill="${C.cream}"/>`;
  // back wall + window band
  s += `<rect y="150" width="390" height="250" fill="${C.wall}"/>`;
  s += `<rect x="0" y="196" width="390" height="12" fill="#e2d8ca"/>`;
  for (let i = 0; i < 3; i++) {
    const x = 18 + i * 124;
    s += `<g><rect x="${x}" y="218" width="106" height="120" rx="10" fill="#cdeaf7"/>
      <rect x="${x}" y="296" width="106" height="42" fill="#b5e0f2"/>
      <path d="M${x},338 v-34 h18 v-22 h16 v16 h14 v-30 h22 v36 h14 v-14 h22 v48 z" fill="#9fcde4"/>
      <circle cx="${x + 78}" cy="244" r="11" fill="#fff6d6"/>
      <path d="M${x + 20},338 l32,-120 h8 l-32,120z" fill="#fff" opacity=".35"/>
      <rect x="${x}" y="218" width="106" height="120" rx="10" fill="none" stroke="#fff" stroke-width="6"/></g>`;
  }
  s += `<rect x="95" y="160" width="200" height="30" rx="15" fill="${C.navy}"/>`;
  s += `<text x="195" y="181" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="15" letter-spacing="3" fill="#fff">MOTOADDICT</text>`;
  for (const x of [40, 350]) s += `<rect x="${x - 1}" y="150" width="2" height="34" fill="${C.navy}"/><path d="M${x - 16},198 a16,14 0 0 1 32,0z" fill="${C.mustard}"/>`;
  // floor
  s += `<rect y="398" width="390" height="446" fill="${C.floor}"/>`;
  s += `<rect y="398" width="390" height="8" fill="#d6cec2"/>`;
  for (let y = 450; y < 844; y += 48) s += `<rect y="${y}" width="390" height="2" fill="#d9d1c6"/>`;
  // wall plinths with bikes
  s += `<rect x="6" y="386" width="120" height="14" rx="7" fill="#fff"/><rect x="264" y="386" width="120" height="14" rx="7" fill="#fff"/><rect x="140" y="386" width="110" height="14" rx="7" fill="#fff"/>`;
  s += bike('r1', 66, 388, 0.42);
  s += bike('panigale', 324, 388, 0.42);
  s += bike('ninja500', 195, 388, 0.38);
  // hero platform + spotlight
  s += `<path d="M160,150 L230,150 L320,526 L70,526 Z" fill="#fff6d6" opacity=".5"/>`;
  s += `<ellipse cx="195" cy="528" rx="122" ry="15" fill="#c9c0b3"/>`;
  s += `<ellipse cx="195" cy="522" rx="122" ry="15" fill="#fff"/>`;
  s += bike('h2', 195, 522, 0.62);
  // desk (right)
  s += person(352, 492, { shirt: C.mustard, skin: C.skin, hair: '#8a4a2a', h: 0.85 });
  s += `<rect x="306" y="470" width="90" height="60" rx="10" fill="${C.navy}"/><rect x="306" y="470" width="90" height="9" rx="4.5" fill="#2c3660"/>`;
  s += `<rect x="318" y="448" width="32" height="22" rx="3" fill="#2c3660"/>`;
  s += plant(26, 470, 0.75);
  // customer + salesman (left front)
  s += person(52, 582, { shirt: C.sky, skin: C.skin3, hair: '#1b1b1b', h: 0.95 });
  s += person(94, 582, { shirt: '#fff', pants: C.navy, tie: C.coral, skin: C.skin, hair: '#4a3020', flip: true, h: 1 });
  s += `<g transform="translate(52,470)"><rect x="-30" y="-34" width="60" height="30" rx="15" fill="#fff"/><path d="M-6,-5 l6,10 6,-10z" fill="#fff"/><text x="0" y="-14" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="13" fill="${C.navy}">R1?</text></g>`;
  // janitor + trash (right front)
  s += `<g transform="translate(262,586)"><ellipse cx="0" cy="-4" rx="16" ry="6" fill="#b49a78"/><circle cx="-6" cy="-9" r="5" fill="#c9b08c"/><rect x="3" y="-16" width="8" height="10" fill="#fff" transform="rotate(14 7 -11)"/></g>`;
  s += person(310, 586, { shirt: C.mint, skin: C.skin2, hair: '#222', mop: true, flip: true, h: 0.95 });
  // income pop
  s += `<g transform="translate(195,428)"><rect x="-56" y="-20" width="112" height="32" rx="16" fill="${C.mint}"/><text x="0" y="2" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="15" fill="#fff">+$32,700</text></g>`;
  return `<svg class="scene-svg" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

export const flatBikeArt = () => bikeSVG(`<ellipse cx="165" cy="178" rx="130" ry="6" fill="#1d2541" opacity=".12"/>${flatBikeInner('h2')}`, { w: '100%', h: '100%' });

export function flatIcon() {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${C.coral}"/>
    <circle cx="256" cy="230" r="170" fill="#ffb59f"/>
    <circle cx="256" cy="230" r="120" fill="#ffd6c9"/>
    <rect y="372" width="512" height="140" fill="${C.navy}"/>
    <g transform="translate(256,384) scale(1.55) translate(-166,-177)">${flatBikeInner('h2', { badge: false })}</g>
  </svg>`;
}

export const flat = {
  id: 'flat',
  num: 2,
  name: 'Flat Vector Minimal',
  blurb: 'Clean side-on view, no outlines, soft pastel palette and modern app UI. Calm, tidy and very readable on small screens.',
  scene: flatScene,
  bike: flatBikeArt,
  icon: flatIcon,
  specs: H2_SPECS,
};
