// Pixel HUD for the chosen style: layout modelled on Prison Empire Tycoon's main screen.
import { renderDealership } from './pixeliso.js';
import { renderBike3D } from './bike3d.js';
import { H2_SPECS } from './bike.js';

// 24x24 stroke paths, turned into crisp pixel icons at load time.
const PATHS = {
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
  bill: '#7ce35b', trend: '#7ce35b', star: '#ffd23f', broom: '#a6e1ff', staff: '#f4f0e6', bike: '#f4f0e6', clock: '#fff1a8',
  map: '#fff6e0', task: '#fff6e0', bars: '#fff6e0', trophy: '#fff6e0', gear: '#f4f0e6', save: '#f4f0e6', cart: '#fff6e0',
  hammer: '#fff6e0', truck: '#a6e1ff', swap: '#ffd23f', info: '#fff6e0', rank: '#ffd23f', engine: '#ff8a6b', bolt: '#ffd23f', speed: '#a6e1ff',
};

// Icons are rasterized so each icon pixel is ~2.3 screen px, whatever the display size.
const cache = new Map();
async function iconHTML(name, size, color = ICONS[name]) {
  const n = Math.max(9, Math.round(size / 2.3) - 2);
  const key = `${name}|${color}|${n}`;
  if (!cache.has(key)) cache.set(key, await pixIcon(name, color, n));
  return `<img class="pi" src="${cache.get(key)}" width="${size}" height="${size}" alt="">`;
}
// Replace {{name:size[:color]}} tokens with icons.
async function fill(html) {
  const toks = [...new Set(html.match(/\{\{[^}]+\}\}/g) || [])];
  const out = await Promise.all(toks.map((t) => { const [n, sz, col] = t.slice(2, -2).split(':'); return iconHTML(n, +sz, col); }));
  toks.forEach((t, i) => { html = html.split(t).join(out[i]); });
  return html;
}

export async function buildPhone(screen) {
  const canvas = document.createElement('canvas');
  canvas.className = 'world';
  await renderDealership(canvas);
  const tr = renderBike3D('r1', -0.35, 18);
  screen.innerHTML = await fill(`
    <div class="hud">
      <div class="topbar">
        <div class="pnl cash">{{bill:26}}<b>$128,450</b><span class="g">+$1,240/min</span></div>
        <div class="pill clock">{{clock:24}}<b>2:47 PM</b><span class="tag">OPEN</span></div>
        <div class="pnl stat">{{star:24}}<b>4.6</b>{{broom:24}}<b>92%</b></div>
        <div class="pnl stat">{{staff:24}}<b>14/20</b>{{bike:24}}<b>9/12</b></div>
      </div>
      <div class="pnl loc">{{rank:30}}<div><small>LOCATION 3</small><b>Maple Heights</b></div>{{swap:24}}</div>
      <div class="promo"><img class="pb" src="${tr.c.toDataURL()}" alt=""><div><b>TRADE-IN!</b><span>Yamaha R1 '19</span><em>4m 12s</em></div></div>
      <div class="rcol"><i class="tb">{{map:28}}<em>!</em></i><i class="tb">{{task:28}}<em class="n">1/3</em></i><i class="tb">{{bars:28}}</i><i class="tb">{{trophy:28}}<em class="n">2</em></i></div>
      <div class="bl"><i class="bb big">{{cart:38}}</i><i class="bb">{{hammer:34}}</i><div class="pnl deliv">{{truck:28}}<div><b>3 bikes</b><span>arrive 9 AM</span></div></div></div>
      <div class="br"><i class="sq">{{save:26}}</i><i class="sq">{{gear:26}}</i><i class="bb">{{staff:34:#fff6e0}}</i></div>
    </div>
    <div class="homebar"></div>`);
  screen.prepend(canvas);
}

export async function buildCard(el) {
  const s = renderBike3D('h2', (-22 * Math.PI) / 180, 30, { lift: 0.08 });
  const c = document.createElement('canvas');
  c.width = 150; c.height = 84;
  const x = c.getContext('2d');
  const r = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // showroom corner: back wall with windows, iso checker floor, turntable
  r('#f4f0e6', 0, 0, 150, 38); r('#d5dae3', 0, 35, 150, 3);
  for (const wx of [10, 84]) { r('#120b1c', wx, 6, 56, 24); r('#a6e1ff', wx + 1, 7, 54, 22); r('#5ab0e8', wx + 1, 21, 54, 8); r('#ffffff', wx + 5, 9, 1, 6); r('#ffffff', wx + 7, 9, 1, 3); }
  for (let yy = 38; yy < 84; yy++) for (let xx = 0; xx < 150; xx++) { const u = Math.floor((xx + 2 * (yy - 38)) / 18), v = Math.floor((xx - 2 * (yy - 38) + 300) / 18); r((u + v) % 2 ? '#e6e9ef' : '#cfd5e0', xx, yy, 1, 1); }
  const ell = (cy, rx, ry, col) => { x.fillStyle = col; for (let dy = -ry; dy <= ry; dy++) { const hw = Math.round(rx * Math.sqrt(1 - (dy / ry) ** 2)); x.fillRect(75 - hw, cy + dy, hw * 2 + 1, 1); } };
  ell(67, 62, 14, '#5a4878'); ell(64, 62, 14, '#c2b6d6'); ell(64, 50, 11, '#d5dae3');
  ell(66, 44, 7, 'rgba(18,11,28,0.22)');
  x.drawImage(s.c, 75 - s.ax + 3, 67 - s.ay);
  const sp = H2_SPECS;
  el.innerHTML = await fill(`
    <div class="ch"><span>SUPPLIER</span><b>KAWASAKI</b></div>
    <div class="art"><img src="${c.toDataURL()}" alt="Kawasaki Ninja H2"><span class="tag">SUPERCHARGED</span></div>
    <div class="nm">Ninja H2</div>
    <div class="cl">Mirror Coated Spark Black</div>
    <div class="sp">
      <div>{{engine:26}}<b>${sp.cc}</b><span>cc</span></div>
      <div>{{bolt:26}}<b>${sp.hp}</b><span>hp</span></div>
      <div>{{speed:26}}<b>${sp.topSpeed.split(' ')[0]}</b><span>mph</span></div>
    </div>
    <div class="buy"><div><span>Sells for</span><b>$${sp.price.toLocaleString('en-US')}</b></div><i class="ob">{{cart:26:#fff6e0}}<span>ORDER<small>$26,200</small></span></i></div>
    <div class="note">{{truck:22}}Arrives overnight · Ready at 9 AM</div>`);
}
