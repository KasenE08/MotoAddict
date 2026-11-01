// Style 5 — Comic / cel-shaded. Thick ink lines, halftone dots, pop-art colors, speech bubbles.
import { paintBike, bikeSVG, VARIANTS, H2_SPECS } from '../bike.js';

const K = { ink: '#111', red: '#ff3b3b', yellow: '#ffe14d', blue: '#1fb5ff', green: '#19c25a', cream: '#fffdf4', paper: '#fff4d6', skin: '#ffc98f', skin2: '#c98a55' };

const dots = (id, col = '#111', r = 1.3, gap = 6, op = 0.45) =>
  `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${gap / 2}" cy="${gap / 2}" r="${r}" fill="${col}" opacity="${op}"/></pattern>`;

const BASE = {
  tire: '#1b1b1b', tireHi: '#444', rim: '#3a3a3a', rimInner: '#555', hub: '#ddd', disc: '#cfcfcf', caliper: K.yellow,
  swingarm: '#333', engine: '#555', engineDetail: '#777', seat: '#222', fork: K.yellow, forkLow: '#cfcfcf',
  dark: '#111', glass: '#7fc8ff', light: '#fffbd0', exhaust: '#d6d6d6', exhaustHi: '#ffffff',
};
export const comicBikeInner = (v = 'h2', o = {}) => {
  const vv = { ...VARIANTS[v], bodyShade: 'url(#cDots)', bodyHi: '#ffffff' };
  if (v === 'h2') { vv.body = '#23262e'; vv.bodyHi = '#d9f2ff'; vv.bodyShade = 'url(#cDotsW)'; }
  return paintBike({ ...BASE, ...vv }, { outline: 3.6, outlineColor: K.ink, frameW: 6, badge: v === 'h2', ...o });
};
const bike = (v, cx, base, k) => `<g transform="translate(${cx},${base}) scale(${k}) translate(-166,-177)">${comicBikeInner(v)}</g>`;

function person(x, base, { shirt, pants = '#2b3a67', skin = K.skin, hair = '#3a2414', h = 1, tie, mop, flip } = {}) {
  const st = `stroke="${K.ink}" stroke-width="3" stroke-linejoin="round"`;
  return `<g transform="translate(${x},${base}) scale(${flip ? -h : h},${h})">
    <path d="M-10,-36 L-11,0 H-2 L0,-30 L2,0 H11 L10,-36Z" fill="${pants}" ${st}/>
    <path d="M-16,-30 L-13,-70 Q0,-78 13,-70 L16,-30 Z" fill="${shirt}" ${st}/>
    <path d="M2,-74 L13,-70 L16,-30 L4,-30Z" fill="url(#cDots)"/>
    ${tie ? `<path d="M0,-72 l-4,7 4,22 4,-22z" fill="${tie}" ${st} stroke-width="2"/>` : ''}
    <circle cx="0" cy="-90" r="15" fill="${skin}" ${st}/>
    <path d="M-15,-92 a15,15 0 0 1 30,0 q-6,-3 -10,2 q-4,-8 -10,-4 q-6,-3 -10,2z" fill="${hair}" ${st} stroke-width="2.4"/>
    <circle cx="4" cy="-89" r="2" fill="${K.ink}"/><path d="M2,-82 q4,3 8,0" stroke="${K.ink}" stroke-width="2" fill="none"/>
    ${mop ? `<path d="M14,-56 L32,0" stroke="${K.ink}" stroke-width="7"/><path d="M14,-56 L32,0" stroke="#c98a55" stroke-width="3"/><path d="M20,-4 h26 l3,7 h-32z" fill="${K.blue}" ${st} stroke-width="2.4"/>` : ''}
  </g>`;
}

const burst = (cx, cy, r1, r2, n, fill) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i * Math.PI) / n, r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r * 1.25).toFixed(1)},${(cy + Math.sin(a) * r * 0.8).toFixed(1)} `;
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${K.ink}" stroke-width="3.5" stroke-linejoin="round"/>`;
};

export function comicScene() {
  const defs = `${dots('cDots')}${dots('cDotsW', '#9fd8ff', 1.4, 6, 0.6)}${dots('cDotsY', '#e09a00', 2.2, 9, 0.55)}${dots('cDotsB', '#0d6fa8', 1.8, 8, 0.35)}`;
  let s = `<rect width="390" height="844" fill="${K.yellow}"/><rect width="390" height="844" fill="url(#cDotsY)"/>`;
  // panel
  s += `<g><rect x="10" y="150" width="370" height="456" fill="${K.cream}" stroke="${K.ink}" stroke-width="6"/>`;
  s += `<clipPath id="cPanel"><rect x="13" y="153" width="364" height="450"/></clipPath><g clip-path="url(#cPanel)">`;
  // back wall with halftone gradient
  s += `<rect x="0" y="150" width="390" height="250" fill="#bfe8ff"/><rect x="0" y="150" width="390" height="120" fill="url(#cDotsB)"/>`;
  // windows
  for (let i = 0; i < 3; i++) {
    const x = 26 + i * 118;
    s += `<rect x="${x}" y="226" width="100" height="112" fill="#e9f8ff" stroke="${K.ink}" stroke-width="4"/>`;
    s += `<path d="M${x},338 v-30 h16 v-18 h14 v12 h16 v-28 h20 v34 h14 v-14 h20 v44z" fill="#7fc8ff" stroke="${K.ink}" stroke-width="2.5"/>`;
    s += `<path d="M${x + 14},236 l26,0 -40,60 v-26z" fill="#fff"/><path d="M${x + 50},236 h12 l-44,70 h-8z" fill="#fff" opacity=".8"/>`;
  }
  // banner sign
  s += `<path d="M70,166 L320,162 L314,206 L76,210 Z" fill="${K.red}" stroke="${K.ink}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<text x="195" y="200" text-anchor="middle" font-family="Bangers" font-size="34" letter-spacing="3" fill="${K.yellow}" stroke="${K.ink}" stroke-width="2" paint-order="stroke" transform="rotate(-1 195 190)">MOTOADDICT</text>`;
  // floor
  s += `<rect y="398" width="390" height="220" fill="#ffd9a0"/><path d="M0,398 H390" stroke="${K.ink}" stroke-width="4"/>`;
  for (const y of [430, 470, 520, 580]) s += `<path d="M0,${y} H390" stroke="#e8b878" stroke-width="2.5"/>`;
  // action lines behind hero
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, r1 = 70, r2 = 260;
    s += `<path d="M${195 + Math.cos(a) * r1},${490 + Math.sin(a) * r1 * 0.6} L${195 + Math.cos(a) * r2},${490 + Math.sin(a) * r2 * 0.6}" stroke="${K.ink}" stroke-width="${i % 2 ? 1.5 : 3}" opacity=".18"/>`;
  }
  // wall bikes
  s += `<rect x="12" y="388" width="116" height="12" fill="#fff" stroke="${K.ink}" stroke-width="3"/><rect x="262" y="388" width="116" height="12" fill="#fff" stroke="${K.ink}" stroke-width="3"/>`;
  s += bike('r1', 70, 390, 0.4);
  s += bike('panigale', 320, 390, 0.4);
  s += bike('ninja500', 195, 392, 0.34);
  // hero platform + H2
  s += `<ellipse cx="195" cy="528" rx="124" ry="18" fill="#fff" stroke="${K.ink}" stroke-width="4"/><ellipse cx="195" cy="534" rx="124" ry="12" fill="url(#cDots)" opacity=".7"/>`;
  s += bike('h2', 195, 524, 0.62);
  // KA-CHING burst
  s += `<g transform="rotate(-8 322 432)">${burst(322, 432, 42, 30, 12, K.yellow)}
    <text x="322" y="428" text-anchor="middle" font-family="Bangers" font-size="18" fill="${K.red}" stroke="${K.ink}" stroke-width="1.2">KA-CHING!</text>
    <text x="322" y="447" text-anchor="middle" font-family="Bangers" font-size="15" fill="${K.ink}">+$32,700</text></g>`;
  // customer + salesman
  s += person(40, 562, { shirt: K.blue, skin: K.skin2, hair: '#111', h: 0.86 });
  s += person(84, 562, { shirt: '#fff', pants: '#2b2b2b', tie: K.red, h: 0.9, flip: true });
  s += `<g><path d="M22,408 h126 a10,10 0 0 1 10,10 v16 a10,10 0 0 1 -10,10 h-90 l-14,14 2,-14 h-24 a10,10 0 0 1 -10,-10 v-16 a10,10 0 0 1 10,-10z" fill="#fff" stroke="${K.ink}" stroke-width="3.5"/>
    <text x="85" y="433" text-anchor="middle" font-family="Bangers" font-size="17" letter-spacing=".5" fill="${K.ink}">HOW MUCH 4 THE R1?!</text></g>`;
  // janitor + trash
  s += `<g transform="translate(276,564)"><path d="M-20,0 q2,-16 14,-12 q4,-14 16,-6 q10,-4 12,18z" fill="#a8763e" stroke="${K.ink}" stroke-width="3"/><path d="M-6,-20 q2,-6 0,-12 M6,-22 q2,-6 0,-12" stroke="${K.ink}" stroke-width="2" fill="none"/></g>`;
  s += person(330, 564, { shirt: K.green, hair: '#5a3a1a', h: 0.86, mop: true, flip: true });
  s += `</g></g>`;
  return `<svg class="scene-svg" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${s}</svg>`;
}

export function comicBikeArt() {
  const defs = `${dots('cDots')}${dots('cDotsW', '#9fd8ff', 1.4, 6, 0.6)}${dots('cDotsR', '#e0261f', 2, 8, 0.5)}`;
  let s = `<rect width="320" height="190" fill="${K.yellow}"/>`;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    s += `<path d="M160,110 L${160 + Math.cos(a) * 300},${110 + Math.sin(a) * 300} L${160 + Math.cos(a + 0.13) * 300},${110 + Math.sin(a + 0.13) * 300}Z" fill="${i % 2 ? '#ffd21f' : '#fff07a'}"/>`;
  }
  s += `<rect width="320" height="190" fill="url(#cDotsR)" opacity=".35"/>`;
  s += `<g transform="translate(160,176) scale(.86) translate(-166,-177)">${comicBikeInner('h2')}</g>`;
  s += `<text x="300" y="34" text-anchor="end" font-family="Bangers" font-size="26" fill="${K.red}" stroke="${K.ink}" stroke-width="1.4" transform="rotate(-6 300 34)">VROOOM!</text>`;
  return bikeSVG(s, { w: '100%', h: '100%', defs });
}

export function comicIcon() {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${dots('ciDots', '#e0261f', 3.4, 16, 0.5)}${dots('cDots')}${dots('cDotsW', '#9fd8ff', 1.4, 6, 0.6)}</defs>
    <rect width="512" height="512" fill="${K.yellow}"/><rect width="512" height="512" fill="url(#ciDots)"/>
    ${burst(256, 206, 190, 130, 14, K.red)}
    <text x="256" y="250" text-anchor="middle" font-family="Bangers" font-size="150" fill="${K.yellow}" stroke="${K.ink}" stroke-width="8" paint-order="stroke">M!</text>
    <g transform="translate(256,486) scale(1.42) translate(-166,-177)">${comicBikeInner('h2', { badge: false, outline: 5 })}</g>
  </svg>`;
}

export const comic = {
  id: 'comic',
  num: 5,
  name: 'Comic / Cel-shaded',
  blurb: 'Bold ink outlines, halftone dot shading, pop-art colors and speech bubbles. Loud, funny and full of personality.',
  scene: comicScene,
  bike: comicBikeArt,
  icon: comicIcon,
  specs: H2_SPECS,
};
