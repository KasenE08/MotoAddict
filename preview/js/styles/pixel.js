// Style 3 — Pixel art. Scene drawn at 1/3 resolution on a canvas, scaled up with crisp pixels.
import { paintBike, bikeSVG, VARIANTS, H2_SPECS } from '../bike.js';

// 32-color palette (sweetie/Endesga-inspired).
const PAL = ['#120b1c', '#2a1d3d', '#3d2b56', '#5a4878', '#8f7fa8', '#c2b6d6', '#f4f0e6', '#ffffff',
  '#1a1c22', '#2e323d', '#4b5161', '#6f7789', '#a2a9b8', '#d5dae3',
  '#7a1f2b', '#c4382b', '#e04a3a', '#ff8a6b', '#8a4a23', '#c27a3a', '#e8b06a', '#ffd23f', '#fff1a8',
  '#1f4f2a', '#3f9d3a', '#7ce35b', '#b8f58a', '#1d2d6b', '#3a5fc4', '#5ab0e8', '#a6e1ff', '#2a8f9a'];
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL_RGB = PAL.map(hex);

export function nearest(r, g, b, pal = PAL_RGB) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const [pr, pg, pb] = pal[i];
    const d = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
    if (d < bd) { bd = d; best = i; }
  }
  return pal[best];
}

function rasterSVG(svg, w, h) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0, w, h);
      res(c);
    };
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function quantize(c, outline = '#120b1c') {
  const x = c.getContext('2d', { willReadFrequently: true });
  const d = x.getImageData(0, 0, c.width, c.height);
  const a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] < 110) { a[i + 3] = 0; continue; }
    const [r, g, b] = nearest(a[i], a[i + 1], a[i + 2]);
    a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255;
  }
  if (outline) {
    const [or, og, ob] = hex(outline);
    const W = c.width, H = c.height, src = new Uint8ClampedArray(a);
    const op = (px, py) => px >= 0 && py >= 0 && px < W && py < H && src[(py * W + px) * 4 + 3] > 0;
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      if (op(px, py)) continue;
      if (op(px - 1, py) || op(px + 1, py) || op(px, py - 1) || op(px, py + 1)) {
        const i = (py * W + px) * 4;
        a[i] = or; a[i + 1] = og; a[i + 2] = ob; a[i + 3] = 255;
      }
    }
  }
  x.putImageData(d, 0, 0);
  return c;
}

const BASE = {
  tire: '#1a1c22', rim: '#4b5161', rimInner: '#2e323d', hub: '#a2a9b8', disc: '#a2a9b8', caliper: '#ffd23f',
  swingarm: '#2e323d', engine: '#4b5161', engineDetail: '#6f7789', seat: '#1a1c22', fork: '#ffd23f', forkLow: '#a2a9b8',
  dark: '#120b1c', glass: '#5a4878', light: '#fff1a8', exhaust: '#a2a9b8', exhaustHi: '#ffffff',
};
const bikeSrc = (v) => bikeSVG(paintBike({ ...BASE, ...VARIANTS[v] }, { badge: false, frameW: 7 }), { w: 320, h: 190 })
  .replace('<svg ', '<svg xmlns:x="x" ');

// Pixel bike sprite whose visible bike is ~`px` pixels long.
const bikeSprite = async (v, px) => {
  const w = Math.round((px * 320) / 252), h = Math.round((w * 190) / 320);
  return quantize(await rasterSVG(bikeSrc(v), w, h));
};

// Tiny 3x5 pixel font (M and N are wider).
const GLYPH = {
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['###', '#.#', '#.#', '#.#', '###'], T: ['###', '.#.', '.#.', '.#.', '.#.'], A: ['.#.', '#.#', '###', '#.#', '#.#'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], I: ['###', '.#.', '.#.', '.#.', '###'], C: ['.##', '#..', '#..', '#..', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'], P: ['##.', '#.#', '##.', '#..', '#..'], E: ['###', '#..', '##.', '#..', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'], 2: ['###', '..#', '###', '#..', '###'], 4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '###'],
  6: ['###', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'], 8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '###'], 3: ['###', '..#', '.##', '..#', '###'], 0: ['###', '#.#', '#.#', '#.#', '###'],
  '?': ['##.', '..#', '.#.', '...', '.#.'], '+': ['...', '.#.', '###', '.#.', '...'], $: ['.##', '##.', '.#.', '.##', '##.'],
  ',': ['..', '..', '..', '.#', '#.'], ' ': ['..', '..', '..', '..', '..'],
};
function text(x, str, px, py, color, shadow) {
  let cx = px;
  for (const ch of str) {
    const g = GLYPH[ch];
    g.forEach((row, ry) => [...row].forEach((v, rx) => {
      if (v !== '#') return;
      if (shadow) { x.fillStyle = shadow; x.fillRect(cx + rx + 1, py + ry + 1, 1, 1); }
      x.fillStyle = color; x.fillRect(cx + rx, py + ry, 1, 1);
    }));
    cx += g[0].length + 1;
  }
}
const textW = (s) => [...s].reduce((n, ch) => n + GLYPH[ch][0].length + 1, -1);

function person(x, px, by, { shirt, pants = '#1d2d6b', skin = '#e8b06a', hair = '#3d2b56', tie, mop, sit } = {}) {
  const r = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const y = by - 16;
  r('#120b1c', px - 1, by, 9, 1);
  r(hair, px + 1, y, 5, 2);
  r(skin, px + 1, y + 2, 5, 4);
  r(hair, px + 1, y + 2, 1, 2);
  r('#120b1c', px + 4, y + 3, 1, 1);
  r(shirt, px, y + 6, 7, sit ? 5 : 6);
  if (tie) r(tie, px + 3, y + 6, 1, 4);
  r(skin, px, y + 11, 1, 1); r(skin, px + 6, y + 11, 1, 1);
  if (!sit) { r(pants, px + 1, y + 12, 2, 4); r(pants, px + 4, y + 12, 2, 4); }
  if (mop) { r('#c27a3a', px + 7, y + 5, 1, 11); r('#a6e1ff', px + 6, by - 1, 5, 1); }
}

export async function pixelScene() {
  const W = 130, H = 282;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // sky with dithered bands
  r('#5ab0e8', 0, 0, W, 60);
  r('#a6e1ff', 0, 40, W, 20);
  for (let yy = 34; yy < 40; yy++) for (let xx = (yy % 2); xx < W; xx += 2) r('#a6e1ff', xx, yy, 1, 1);
  for (const [cx, cy] of [[14, 20], [92, 12]]) { r('#ffffff', cx, cy, 18, 4); r('#ffffff', cx + 4, cy - 3, 9, 3); r('#d5dae3', cx, cy + 4, 18, 1); }
  // facade + sign
  r('#3d2b56', 0, 52, W, 16);
  r('#2a1d3d', 0, 66, W, 2);
  const sign = 'MOTOADDICT';
  const sw = textW(sign);
  r('#120b1c', (W - sw) / 2 - 4, 54, sw + 8, 11);
  r('#c4382b', (W - sw) / 2 - 3, 55, sw + 6, 9);
  text(x, sign, Math.round((W - sw) / 2), 57, '#fff1a8', '#7a1f2b');
  // brick back wall
  r('#c27a3a', 0, 68, W, 52);
  for (let yy = 68; yy < 120; yy += 4) {
    r('#8a4a23', 0, yy + 3, W, 1);
    for (let xx = ((yy / 4) % 2) * 4; xx < W; xx += 8) r('#8a4a23', xx, yy, 1, 3);
  }
  // windows
  for (let i = 0; i < 3; i++) {
    const wx = 6 + i * 42;
    r('#120b1c', wx - 1, 72, 34, 30);
    r('#a6e1ff', wx, 73, 32, 28);
    r('#5ab0e8', wx, 90, 32, 11);
    r('#3a5fc4', wx + 2, 92, 6, 9); r('#3a5fc4', wx + 10, 87, 7, 14); r('#3a5fc4', wx + 20, 94, 9, 7);
    r('#ffffff', wx + 4, 76, 1, 6); r('#ffffff', wx + 6, 76, 1, 3);
    r('#3d2b56', wx + 15, 73, 2, 28);
  }
  // neon OPEN sign
  r('#120b1c', 4, 104, 21, 9);
  text(x, 'OPEN', 6, 106, '#7ce35b');
  // floor (checker tiles)
  for (let yy = 120; yy < H; yy += 6) for (let xx = 0; xx < W; xx += 6) r(((xx + yy) / 6) % 2 ? '#d5dae3' : '#c2b6d6', xx, yy, 6, 6);
  r('#5a4878', 0, 120, W, 2);
  // wall plinths + bikes
  for (const px of [3, 46, 89]) { r('#f4f0e6', px, 117, 38, 3); r('#8f7fa8', px, 120, 38, 1); }
  const sprites = await Promise.all([bikeSprite('r1', 34), bikeSprite('ninja500', 32), bikeSprite('panigale', 34), bikeSprite('h2', 60)]);
  const place = (s, cx, base) => x.drawImage(s, Math.round(cx - (166 / 320) * s.width), Math.round(base - (178 / 190) * s.height));
  place(sprites[0], 22, 118); place(sprites[1], 65, 118); place(sprites[2], 108, 118);
  // hero platform
  r('#3d2b56', 26, 160, 78, 4);
  r('#5a4878', 28, 156, 74, 4);
  r('#8f7fa8', 30, 155, 70, 1);
  // spotlight (dithered)
  for (let yy = 124; yy < 156; yy++) for (let xx = 30; xx < 100; xx++) if ((xx + yy) % 2 === 0 && Math.abs(xx - 65) < 10 + (yy - 124) * 0.9) {
    const d = x.getImageData(xx, yy, 1, 1).data; r(nearest(d[0] + 40, d[1] + 40, d[2] + 20), xx, yy, 1, 1);
  }
  place(sprites[3], 65, 157);
  // income pop
  text(x, '+$32,700', 96, 126, '#ffd23f', '#120b1c');
  // reception desk + receptionist
  person(x, 113, 150, { shirt: '#ffd23f', hair: '#8a4a23' });
  r('#120b1c', 104, 147, 26, 16); r('#3a5fc4', 105, 148, 25, 14); r('#5ab0e8', 105, 148, 25, 2);
  r('#120b1c', 108, 141, 9, 7); r('#2e323d', 109, 142, 7, 5);
  // customer + salesman
  person(x, 8, 180, { shirt: '#3a5fc4', skin: '#8a4a23', hair: '#120b1c' });
  person(x, 19, 180, { shirt: '#f4f0e6', tie: '#e04a3a', pants: '#2e323d' });
  r('#120b1c', 1, 151, 21, 9); r('#f4f0e6', 2, 152, 19, 7); r('#f4f0e6', 9, 159, 2, 2);
  text(x, 'R1?', 6, 153, '#120b1c');
  // janitor + trash pile
  r('#8a4a23', 98, 177, 9, 3); r('#c27a3a', 100, 175, 5, 2); r('#f4f0e6', 104, 174, 2, 2);
  person(x, 110, 180, { shirt: '#2a8f9a', hair: '#1d2d6b', mop: true });
  // lounge bench
  r('#120b1c', 46, 172, 30, 9); r('#e04a3a', 47, 173, 28, 4); r('#7a1f2b', 47, 177, 28, 3);
  person(x, 56, 176, { shirt: '#7ce35b', hair: '#ffd23f', sit: true });
  return `<img class="pix" src="${c.toDataURL()}" alt="" style="position:absolute;inset:0;width:390px;height:846px;image-rendering:pixelated">`;
}

export async function pixelBikeArt() {
  const s = await bikeSprite('h2', 100);
  const c = document.createElement('canvas');
  c.width = 160; c.height = 95;
  const x = c.getContext('2d');
  x.fillStyle = '#5ab0e8'; x.fillRect(0, 0, 160, 95);
  x.fillStyle = '#a6e1ff'; x.fillRect(0, 60, 160, 35);
  for (let yy = 56; yy < 60; yy++) for (let xx = yy % 2; xx < 160; xx += 2) x.fillRect(xx, yy, 1, 1);
  x.fillStyle = '#8f7fa8'; x.fillRect(0, 86, 160, 9);
  x.fillStyle = '#5a4878'; x.fillRect(0, 86, 160, 1);
  x.drawImage(s, Math.round(80 - (166 / 320) * s.width), Math.round(87 - (178 / 190) * s.height));
  return `<img src="${c.toDataURL()}" alt="" style="width:100%;height:100%;image-rendering:pixelated">`;
}

export async function pixelIcon() {
  const N = 48;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const x = c.getContext('2d');
  const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  r('#2a1d3d', 0, 0, N, N);
  for (let yy = 0; yy < 30; yy++) for (let xx = yy % 2; xx < N; xx += 2) if (yy > 22) r('#3d2b56', xx, yy, 1, 1);
  r('#3d2b56', 0, 30, N, 18);
  // pixel coin
  r('#120b1c', 14, 2, 20, 20); r('#c27a3a', 15, 3, 18, 18); r('#ffd23f', 16, 4, 16, 15); r('#fff1a8', 17, 5, 4, 2);
  ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '#') r('#8a4a23', 19 + rx * 2, 5 + ry * 2, 2, 2); }));
  const s = await bikeSprite('h2', 42);
  x.drawImage(s, Math.round(24 - (166 / 320) * s.width), Math.round(44 - (178 / 190) * s.height));
  return `<img src="${c.toDataURL()}" alt="" style="width:100%;height:100%;image-rendering:pixelated">`;
}

export const pixel = {
  id: 'pixel',
  num: 3,
  name: 'Pixel Art',
  blurb: 'Retro 16-bit look with a limited color palette, chunky pixel fonts and hard-edged UI. Nostalgic and charming.',
  scene: pixelScene,
  bike: pixelBikeArt,
  icon: pixelIcon,
  specs: H2_SPECS,
};
