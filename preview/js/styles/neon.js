// Style 4 — Neon synthwave night. Glowing outlines, chrome-dark surfaces, retro sunset.
import { paintBike, bikeSVG, H2_SPECS } from '../bike.js';

const N = { bg: '#0d0420', bg2: '#1b0a3a', pink: '#ff2ec4', cyan: '#00f0ff', lime: '#4dff9a', yellow: '#ffe066', red: '#ff3b5c', purple: '#8a4dff' };

const neonPal = (col, accent = col) => ({
  tire: '#07020f', rim: col, rimInner: '#0d0420', hub: col, disc: col, caliper: N.yellow,
  swingarm: '#120726', engine: '#120726', engineDetail: '#2a1450', seat: '#07020f', fork: N.yellow, forkLow: col,
  dark: '#07020f', glass: '#2a1450', light: '#ffffff', exhaust: '#1d0d3a', body: '#140830', bodyShade: '#0d0420', bodyHi: null,
  frame: accent, accent, badge: accent,
});
export const neonBikeInner = (col, accent, o = {}) => paintBike(neonPal(col, accent), { outline: 2.2, outlineColor: col, frameW: 4, ...o });

const glowDefs = (id, blur = 3) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="${blur}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

function bike(col, accent, cx, base, k, reflect = true, badge = false) {
  const inner = neonBikeInner(col, accent, { badge });
  let s = `<g transform="translate(${cx},${base}) scale(${k}) translate(-166,-177)" filter="url(#nGlow)">${inner}</g>`;
  if (reflect) s += `<g transform="translate(${cx},${base}) scale(${k},${-k * 0.6}) translate(-166,-177)" opacity=".18">${inner}</g>`;
  return s;
}

function person(x, base, col, { h = 1, tie, mop, sit } = {}) {
  const st = `fill="#0d0420" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"`;
  return `<g transform="translate(${x},${base}) scale(${h})" filter="url(#nGlowS)">
    ${sit ? '' : `<path d="M-6,-34 L-7,0 M6,-34 L7,0" ${st}/>`}
    <path d="M-14,${sit ? -10 : -32} L-12,${sit ? -44 : -66} Q0,${sit ? -52 : -74} 12,${sit ? -44 : -66} L14,${sit ? -10 : -32} Z" ${st}/>
    ${tie ? `<path d="M0,-66 l-2,6 2,14 2,-14z" fill="${tie}" stroke="none"/>` : ''}
    <circle cx="0" cy="${sit ? -60 : -84}" r="11" ${st}/>
    ${mop ? `<path d="M16,-50 L26,-2 M18,0 h18" stroke="${N.yellow}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}
  </g>`;
}

export function neonScene() {
  const defs = `${glowDefs('nGlow', 2.4)}${glowDefs('nGlowS', 1.6)}${glowDefs('nGlowL', 5)}
    <linearGradient id="nBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${N.bg}"/><stop offset=".45" stop-color="${N.bg2}"/><stop offset="1" stop-color="#05010d"/></linearGradient>
    <linearGradient id="nSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0638"/><stop offset=".6" stop-color="#5a0d6e"/><stop offset="1" stop-color="#c2187a"/></linearGradient>
    <linearGradient id="nSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff066"/><stop offset=".55" stop-color="#ff8a3d"/><stop offset="1" stop-color="#ff2ec4"/></linearGradient>
    <clipPath id="nWin"><rect x="22" y="206" width="346" height="150" rx="14"/></clipPath>
    <radialGradient id="nSpot" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="${N.lime}" stop-opacity=".22"/><stop offset="1" stop-color="${N.lime}" stop-opacity="0"/></radialGradient>`;
  let s = `<rect width="390" height="844" fill="url(#nBg)"/>`;
  // window with synthwave sunset
  s += `<g clip-path="url(#nWin)"><rect x="22" y="206" width="346" height="150" fill="url(#nSky)"/>`;
  s += `<circle cx="195" cy="318" r="70" fill="url(#nSun)"/>`;
  for (let i = 0; i < 6; i++) s += `<rect x="120" y="${300 + i * 9}" width="150" height="${2 + i * 0.9}" fill="#5a0d6e"/>`;
  s += `<path d="M22,330 L70,292 L104,318 L150,276 L196,318 L232,290 L280,320 L326,284 L368,316 V356 H22Z" fill="#12052a" stroke="${N.pink}" stroke-width="1.5"/>`;
  s += `<rect x="22" y="330" width="346" height="26" fill="#12052a"/>`;
  for (let i = -8; i <= 8; i++) s += `<path d="M${195 + i * 8},330 L${195 + i * 46},356" stroke="${N.purple}" stroke-width="1"/>`;
  for (const y of [334, 340, 348]) s += `<path d="M22,${y} H368" stroke="${N.purple}" stroke-width="1"/>`;
  s += `</g><rect x="22" y="206" width="346" height="150" rx="14" fill="none" stroke="${N.cyan}" stroke-width="2.5" filter="url(#nGlow)"/>`;
  // neon sign
  s += `<text x="195" y="190" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="28" letter-spacing="3" fill="none" stroke="${N.pink}" stroke-width="1.6" filter="url(#nGlowL)">MOTOADDICT</text>`;
  s += `<text x="195" y="190" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="28" letter-spacing="3" fill="none" stroke="#ffd1f3" stroke-width=".7">MOTOADDICT</text>`;
  // perspective floor grid
  s += `<rect y="372" width="390" height="472" fill="#0a0318"/>`;
  s += `<path d="M0,372 H390" stroke="${N.pink}" stroke-width="2" filter="url(#nGlow)"/>`;
  for (let i = -12; i <= 12; i++) s += `<path d="M${195 + i * 14},372 L${195 + i * 90},844" stroke="${N.pink}" stroke-opacity=".38" stroke-width="1"/>`;
  let y = 380, gap = 8;
  while (y < 844) { s += `<path d="M0,${y.toFixed(1)} H390" stroke="${N.pink}" stroke-opacity=".38" stroke-width="1"/>`; gap *= 1.28; y += gap; }
  // back row bikes
  s += bike(N.cyan, N.cyan, 72, 400, 0.36);
  s += bike(N.lime, N.lime, 195, 400, 0.33);
  s += bike(N.red, N.red, 318, 400, 0.36);
  // hero spotlight + H2
  s += `<path d="M150,206 L240,206 L330,540 L60,540Z" fill="url(#nSpot)"/>`;
  s += `<ellipse cx="195" cy="540" rx="128" ry="16" fill="none" stroke="${N.lime}" stroke-width="2" filter="url(#nGlow)"/>`;
  s += `<ellipse cx="195" cy="540" rx="104" ry="11" fill="none" stroke="${N.lime}" stroke-opacity=".5" stroke-width="1"/>`;
  s += bike('#c8ffe0', N.lime, 195, 538, 0.62, true, true);
  // income pop
  s += `<text x="195" y="438" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="20" fill="${N.yellow}" filter="url(#nGlow)">+$32,700</text>`;
  // desk + receptionist
  s += person(354, 492, N.yellow, { h: 0.82 });
  s += `<rect x="304" y="468" width="96" height="58" rx="6" fill="#120726" stroke="${N.cyan}" stroke-width="2" filter="url(#nGlowS)"/>`;
  s += `<rect x="316" y="448" width="30" height="20" rx="2" fill="#120726" stroke="${N.cyan}" stroke-width="1.6"/>`;
  // customer + salesman
  s += person(44, 588, N.cyan, { h: 0.92 });
  s += person(84, 588, '#ffffff', { h: 0.96, tie: N.pink });
  s += `<g transform="translate(44,486)" filter="url(#nGlowS)"><rect x="-28" y="-30" width="56" height="26" rx="13" fill="#120726" stroke="${N.cyan}" stroke-width="1.8"/><text x="0" y="-12" text-anchor="middle" font-family="Orbitron" font-weight="700" font-size="11" fill="${N.cyan}">R1?</text></g>`;
  // janitor + trash
  s += `<g transform="translate(262,588)" filter="url(#nGlowS)"><path d="M-16,-2 q4,-12 12,-8 q6,-10 14,-2 q6,-2 6,10z" fill="#120726" stroke="#ff9d3d" stroke-width="2"/></g>`;
  s += person(306, 590, N.purple, { h: 0.92, mop: true });
  return `<svg class="scene-svg" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${s}</svg>`;
}

export function neonBikeArt() {
  const defs = `${glowDefs('nGlow', 2.4)}<linearGradient id="nCard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0b4f"/><stop offset=".7" stop-color="#5a0d6e"/><stop offset="1" stop-color="#c2187a"/></linearGradient>`;
  let s = `<rect width="320" height="190" fill="url(#nCard)"/><circle cx="160" cy="120" r="70" fill="#ff8a3d" opacity=".55"/>`;
  for (let i = 0; i < 5; i++) s += `<rect x="80" y="${104 + i * 8}" width="160" height="${2 + i}" fill="#5a0d6e"/>`;
  s += `<rect y="150" width="320" height="40" fill="#0a0318"/><path d="M0,150 H320" stroke="${N.pink}" stroke-width="2"/>`;
  for (let i = -10; i <= 10; i++) s += `<path d="M${160 + i * 12},150 L${160 + i * 50},190" stroke="${N.pink}" stroke-opacity=".45"/>`;
  s += `<g transform="translate(160,170) scale(.86) translate(-166,-177)" filter="url(#nGlow)">${neonBikeInner('#c8ffe0', N.lime)}</g>`;
  return bikeSVG(s, { w: '100%', h: '100%', defs });
}

export function neonIcon() {
  return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs>${glowDefs('niG', 5)}
    <linearGradient id="niBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14052e"/><stop offset=".62" stop-color="#5a0d6e"/><stop offset=".62" stop-color="#0a0318"/></linearGradient>
    <linearGradient id="niSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff066"/><stop offset="1" stop-color="#ff2ec4"/></linearGradient></defs>
    <rect width="512" height="512" fill="url(#niBg)"/>
    <circle cx="256" cy="250" r="130" fill="url(#niSun)"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="100" y="${232 + i * 16}" width="312" height="${4 + i * 2}" fill="#5a0d6e"/>`).join('')}
    <rect y="318" width="512" height="194" fill="#0a0318"/>
    <path d="M0,318 H512" stroke="${N.pink}" stroke-width="5" filter="url(#niG)"/>
    ${[-6, -4, -2, 0, 2, 4, 6].map((i) => `<path d="M${256 + i * 22},318 L${256 + i * 90},512" stroke="${N.pink}" stroke-opacity=".5" stroke-width="3"/>`).join('')}
    <g transform="translate(256,420) scale(1.42) translate(-166,-177)" filter="url(#niG)">${neonBikeInner('#c8ffe0', N.lime, { badge: false, outline: 3.5 })}</g>
  </svg>`;
}

export const neon = {
  id: 'neon',
  num: 4,
  name: 'Neon Synthwave',
  blurb: 'Dark showroom with glowing neon outlines, a retro sunset and a laser-grid floor. Moody and flashy, like a late-night bike meet. (The window sky would still follow the real clock.)',
  scene: neonScene,
  bike: neonBikeArt,
  icon: neonIcon,
  specs: H2_SPECS,
};
