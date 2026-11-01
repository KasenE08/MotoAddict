// Pixel icons: vector strokes rasterized to a small grid with a dark outline.
// 24x24 stroke paths, turned into crisp pixel icons at load time.
const PATHS = {
  copy: '<rect x="8" y="8" width="13" height="13"/><path d="M4 16V3h13"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  x: '<path d="M5 5l14 14M19 5L5 19" stroke-width="3.4"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z" fill="currentColor"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="1"/><path d="M11 18h2"/>',
  bill: '<rect x="2" y="6" width="20" height="12" rx="1"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6M19 9v6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  broom: '<path d="M14 3l-4 9"/><path d="M6 12h8l2 9H4z" fill="currentColor"/>',
  staff: '<circle cx="12" cy="7.5" r="4.5" fill="currentColor"/><path d="M3.5 22c0-5.5 3.8-8.5 8.5-8.5s8.5 3 8.5 8.5z" fill="currentColor"/>',
  bike: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l5-7h5l2 7M10 9l-2-3h-3M14 9l2-3h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  task: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 10l3 3 5-5M8 17h8"/>',
  bars: '<path d="M5 20V12M10 20V6M15 20V10M20 20V4" stroke-width="3.5"/>',
  trophy: '<path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3v2a4 4 0 0 0 4 4M17 5h4v2a4 4 0 0 1-4 4M12 14v4M7 21h10"/>',
  gear: '<circle cx="12" cy="12" r="6" stroke-width="3.4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4M4.6 4.6l2.8 2.8M16.6 16.6l2.8 2.8M4.6 19.4l2.8-2.8M16.6 7.4l2.8-2.8" stroke-width="3.4"/>',
  save: '<path d="M4 3h13l3 3v15H4z"/><path d="M8 3v6h8V3M7 21v-7h10v7"/>',
  cart: '<path d="M2 3h3l3 12h11l2-8H6"/><circle cx="9" cy="19.5" r="1.8" fill="currentColor"/><circle cx="17" cy="19.5" r="1.8" fill="currentColor"/>',
  hammer: '<path d="M4 20l9-9"/><path d="M11 5l4-2 6 6-2 4z" fill="currentColor"/>',
  truck: '<path d="M2 6h12v10H2z" fill="currentColor"/><path d="M14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2" fill="currentColor"/><circle cx="17" cy="18" r="2" fill="currentColor"/>',
  swap: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5" stroke-width="3"/>',
  rank: '<path d="M4 4l8 5 8-5v6l-8 5-8-5z" fill="currentColor"/><path d="M4 14l8 5 8-5"/>',
  engine: '<rect x="4" y="7" width="12" height="10" fill="currentColor"/><path d="M16 10h3v4h-3M8 7V4h4v3M2 10v4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  speed: '<path d="M3 17a9 9 0 0 1 18 0"/><path d="M12 17l5-6" stroke-width="3"/>',
};

function pixIcon(name, color, n = 13) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${n}" height="${n}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="square" stroke-linejoin="miter" color="${color}">${PATHS[name]}</svg>`;
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = n + 2; c.height = n + 2;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 1, 1, n, n);
      const d = x.getImageData(0, 0, c.width, c.height), a = d.data, src = new Uint8ClampedArray(a);
      const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const [r, g, b] = hx(color);
      for (let i = 0; i < a.length; i += 4) { if (a[i + 3] > 90) { a[i] = r; a[i + 1] = g; a[i + 2] = b; a[i + 3] = 255; } else a[i + 3] = 0; }
      const W = c.width, H = c.height, on = (px, py) => px >= 0 && py >= 0 && px < W && py < H && src[(py * W + px) * 4 + 3] > 90;
      for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
        if (on(px, py)) continue;
        if (on(px + 1, py) || on(px - 1, py) || on(px, py + 1) || on(px, py - 1)) { const i = (py * W + px) * 4; a[i] = 11; a[i + 1] = 14; a[i + 2] = 28; a[i + 3] = 255; }
      }
      x.putImageData(d, 0, 0);
      res(c.toDataURL());
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

const ICONS = {
  copy: '#fff6e0', upload: '#fff6e0', x: '#fff6e0', moon: '#a6e1ff', phone: '#fff6e0',
  bill: '#7ce35b', trend: '#7ce35b', star: '#ffd23f', broom: '#a6e1ff', staff: '#f4f0e6', bike: '#f4f0e6', clock: '#fff1a8',
  map: '#fff6e0', task: '#fff6e0', bars: '#fff6e0', trophy: '#fff6e0', gear: '#f4f0e6', save: '#f4f0e6', cart: '#fff6e0',
  hammer: '#fff6e0', truck: '#a6e1ff', swap: '#ffd23f', info: '#fff6e0', rank: '#ffd23f', engine: '#ff8a6b', bolt: '#ffd23f', speed: '#a6e1ff',
};

// Icons are rasterized so each icon pixel is ~2.3 screen px, whatever the display size.
const cache = new Map();
export async function iconHTML(name, size, color = ICONS[name]) {
  const n = Math.max(9, Math.round(size / 2.3) - 2);
  const key = `${name}|${color}|${n}`;
  if (!cache.has(key)) cache.set(key, await pixIcon(name, color, n));
  return `<img class="pi" src="${cache.get(key)}" width="${size}" height="${size}" alt="">`;
}
// Replace {{name:size[:color]}} tokens with icons.
export async function fill(html) {
  const toks = [...new Set(html.match(/\{\{[^}]+\}\}/g) || [])];
  const out = await Promise.all(toks.map((t) => { const [n, sz, col] = t.slice(2, -2).split(':'); return iconHTML(n, +sz, col); }));
  toks.forEach((t, i) => { html = html.split(t).join(out[i]); });
  return html;
}

