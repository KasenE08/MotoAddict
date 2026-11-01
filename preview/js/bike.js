// Kawasaki Ninja H2 side profile (right side, facing right).
// One shared geometry, painted differently by each art style.
// ViewBox: 0 0 320 190. Ground line at y = 177.

export const VIEWBOX = '0 0 320 190';
export const REAR = [72, 140];
export const FRONT = [250, 140];
export const TIRE_R = 37;
export const RIM_R = 28;

export const P = {
  swingarm: 'M146,104 L154,116 L142,126 L80,148 L68,136 Z',
  tail: 'M156,84 L150,74 L118,71 L96,65 L58,52 L55,57 L66,69 L96,91 L130,97 L154,97 Z',
  tailShade: 'M66,69 L96,91 L130,97 L154,97 L154,90 L128,89 L98,82 L62,63 Z',
  seat: 'M152,77 C150,71 136,70 116,69 L112,73 L148,79 Z',
  engine: 'M132,82 L196,78 L204,96 L198,124 L174,131 L146,129 L134,118 Z',
  engineCover: 'M150,104 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0',
  tank: 'M148,74 C148,58 166,47 186,45 C199,44 209,48 215,55 L212,70 L196,78 Z',
  tankShade: 'M148,74 L196,78 L212,70 L213,64 L196,72 C178,73 160,72 148,67 Z',
  tankHi: 'M162,57 C170,51 182,48 197,49 C186,52 174,55 164,61 Z',
  fairing: 'M206,50 L224,44 L246,46 L270,62 L287,76 L277,86 L258,96 L240,106 L222,104 L212,90 L208,72 Z',
  fairingShade: 'M287,76 L277,86 L258,96 L240,106 L222,104 L217,96 L238,97 L262,86 Z',
  fairingHi: 'M228,50 L246,50 L268,66 L250,62 Z',
  windscreen: 'M222,44 L230,29 C240,31 248,38 252,48 L246,47 Z',
  headlight: 'M266,72 L285,76 L281,80 L262,78 Z',
  intake: 'M262,86 L279,84 L270,96 L252,98 Z',
  vent: 'M226,78 L249,73 L245,80 L228,85 Z',
  muffler: 'M155,128 L111,103 L98,110 L97,125 L144,151 Z',
  mufflerCap: 'M104,117 m-6,0 a6,10 -25 1,0 12,0 a6,10 -25 1,0 -12,0',
  fender: 'M226,112 Q250,97 277,114 L272,118 Q250,106 230,116 Z',
  mirror: 'M232,44 L241,39 L245,41 L237,47 Z',
  header: 'M196,110 C201,126 196,137 180,139 L150,141',
};

// Trellis frame tubes (the H2's signature green frame).
const FP = { A: [212, 66], B: [190, 74], C: [168, 77], D: [148, 79], E: [140, 108], F: [206, 86], G: [184, 94], I: [160, 101] };
const FL = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['A', 'F'], ['F', 'G'], ['G', 'I'], ['I', 'E'], ['B', 'F'], ['B', 'G'], ['C', 'G'], ['C', 'I'], ['D', 'I']];
export const FRAME_LINES = FL.map(([a, b]) => [FP[a], FP[b]]);
export const FRAME_PATH = FRAME_LINES.map(([a, b]) => `M${a[0]},${a[1]} L${b[0]},${b[1]}`).join(' ');

export const FORK_UP = [[222, 60], [243, 120]];
export const FORK_LOW = [[243, 120], [251, 140]];

// 5 split spokes like the H2's cast wheels.
export function spokes(cx, cy, rIn, rOut, rot = 18) {
  let d = '';
  for (let i = 0; i < 5; i++) {
    const a = ((i * 72 + rot) * Math.PI) / 180;
    for (const off of [-0.16, 0.16]) {
      const a2 = a + off;
      const x1 = cx + Math.cos(a) * rIn, y1 = cy + Math.sin(a) * rIn;
      const x2 = cx + Math.cos(a2) * rOut, y2 = cy + Math.sin(a2) * rOut;
      d += `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} `;
    }
  }
  return d.trim();
}

const circle = (c, r, attrs) => `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" ${attrs}/>`;
const line = (a, b, attrs) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${attrs}/>`;

/**
 * Generic painter. `pal` holds colors per part; `o` holds stroke/outline options.
 * Returns SVG markup (no outer <svg>) in the 320x190 coordinate space.
 */
export function paintBike(pal, o = {}) {
  const ow = o.outline ?? 0;
  const oc = o.outlineColor ?? '#111';
  const st = ow ? `stroke="${oc}" stroke-width="${ow}" stroke-linejoin="round"` : '';
  const f = (fill, extra = '') => `fill="${fill}" ${st} ${extra}`;
  const shade = (d, fill) => (fill ? `<path d="${d}" fill="${fill}"/>` : '');
  let s = '';
  if (o.shadow) s += `<ellipse cx="162" cy="178" rx="132" ry="8" fill="${o.shadow}"/>`;
  s += `<path d="${P.swingarm}" ${f(pal.swingarm)}/>`;
  for (const c of [REAR, FRONT]) {
    s += circle(c, TIRE_R, f(pal.tire));
    if (pal.tireHi) s += `<circle cx="${c[0]}" cy="${c[1]}" r="${TIRE_R - 4}" fill="none" stroke="${pal.tireHi}" stroke-width="2"/>`;
    s += circle(c, RIM_R, `fill="${pal.rimInner}"`);
    if (c === FRONT) s += circle(c, 21, `fill="none" stroke="${pal.disc}" stroke-width="5"`);
    else s += circle(c, 13, `fill="${pal.disc}"`);
    s += `<circle cx="${c[0]}" cy="${c[1]}" r="${RIM_R}" fill="none" stroke="${pal.rim}" stroke-width="4"/>`;
    s += `<path d="${spokes(c[0], c[1], 6, RIM_R - 1)}" stroke="${pal.rim}" stroke-width="3.2" stroke-linecap="round"/>`;
    s += circle(c, 6, `fill="${pal.hub}"`);
    if (ow) s += `<circle cx="${c[0]}" cy="${c[1]}" r="${RIM_R + 2}" fill="none" stroke="${oc}" stroke-width="${ow * 0.6}"/>`;
  }
  // front brake caliper
  s += `<rect x="258" y="116" width="9" height="15" rx="3" transform="rotate(-20 262 123)" ${f(pal.caliper)}/>`;
  s += `<path d="${P.header}" fill="none" stroke="${pal.exhaust}" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path d="${P.engine}" ${f(pal.engine)}/>`;
  if (pal.engineDetail) {
    s += `<path d="M138,90 L196,86 M136,97 L198,93" stroke="${pal.engineDetail}" stroke-width="2.4"/>`;
    s += `<path d="${P.engineCover}" fill="${pal.engineDetail}" ${st}/>`;
  }
  s += `<path d="${P.tank}" ${f(pal.body)}/>`;
  s += shade(P.tankShade, pal.bodyShade);
  s += shade(P.tankHi, pal.bodyHi);
  s += `<path d="${FRAME_PATH}" fill="none" stroke="${ow ? oc : 'none'}" stroke-width="${ow ? 6 + ow : 0}" stroke-linecap="round"/>`;
  s += `<path d="${FRAME_PATH}" fill="none" stroke="${pal.frame}" stroke-width="${o.frameW ?? 5}" stroke-linecap="round"/>`;
  s += `<path d="${P.tail}" ${f(pal.body)}/>`;
  s += shade(P.tailShade, pal.bodyShade);
  s += `<path d="${P.seat}" ${f(pal.seat)}/>`;
  s += line(...FORK_UP, `stroke="${pal.fork}" stroke-width="8" stroke-linecap="round"`);
  s += line(...FORK_LOW, `stroke="${pal.forkLow}" stroke-width="9" stroke-linecap="round"`);
  s += `<path d="${P.fender}" ${f(pal.body)}/>`;
  s += `<path d="${P.fairing}" ${f(pal.body)}/>`;
  s += shade(P.fairingShade, pal.bodyShade);
  s += shade(P.fairingHi, pal.bodyHi);
  s += `<path d="${P.vent}" ${f(pal.dark)}/>`;
  s += `<path d="${P.intake}" ${f(pal.dark)}/>`;
  s += `<path d="${P.windscreen}" ${f(pal.glass)}/>`;
  s += `<path d="${P.mirror}" ${f(pal.body)}/>`;
  s += `<path d="${P.headlight}" ${f(pal.light)}/>`;
  s += `<path d="${P.muffler}" ${f(pal.exhaust)}/>`;
  if (pal.exhaustHi) s += `<path d="M146,140 L106,117" stroke="${pal.exhaustHi}" stroke-width="3" stroke-linecap="round"/>`;
  s += `<path d="${P.mufflerCap}" ${f(pal.dark)}/>`;
  if (pal.accent) {
    // green pinstripe on the fairing + "H2" badge
    s += `<path d="M214,98 L238,99 L262,88" fill="none" stroke="${pal.accent}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (o.badge !== false) s += `<text x="230" y="70" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="11" fill="${pal.badge ?? pal.accent}" font-style="italic">H2</text>`;
  }
  return s;
}

export function bikeSVG(inner, { w = 320, h = 190, cls = '', defs = '' } = {}) {
  return `<svg class="${cls}" viewBox="${VIEWBOX}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${defs ? `<defs>${defs}</defs>` : ''}${inner}</svg>`;
}

// Real-world spec sheet used on every style's bike card.
export const H2_SPECS = {
  name: 'Kawasaki Ninja H2',
  cc: 998,
  hp: 228,
  topSpeed: '186 mph',
  price: 32700,
  color: 'Mirror Coated Spark Black',
};

// Simple color variants for other bikes shown in the dealership scenes.
export const VARIANTS = {
  h2: { body: '#15171c', bodyShade: '#0a0b0e', bodyHi: '#9aa3ad', frame: '#7ed321', accent: '#7ed321' },
  r1: { body: '#1f4fc4', bodyShade: '#173a93', bodyHi: '#8fb2ff', frame: '#2c2f36', accent: '#e8eef8' },
  ninja500: { body: '#5fbf2a', bodyShade: '#3f8f18', bodyHi: '#c9f59a', frame: '#1c1d20', accent: '#1c1d20' },
  panigale: { body: '#d0181e', bodyShade: '#9c0f14', bodyHi: '#ff9a9d', frame: '#d0181e', accent: '#f4f4f4' },
  cbr: { body: '#c8141c', bodyShade: '#8f0e14', bodyHi: '#ff8c8c', frame: '#2c2f36', accent: '#2457c5' },
  s1000rr: { body: '#f2f4f7', bodyShade: '#c9ced6', bodyHi: '#ffffff', frame: '#2c2f36', accent: '#1c69d4' },
  rsv4: { body: '#1b1b1d', bodyShade: '#0c0c0d', bodyHi: '#666', frame: '#c8141c', accent: '#c8141c' },
};
