import { hud, tabbar, sideButtons, haggleCard, statusBar } from './icons.js';
import { iso } from './styles/iso.js';
import { flat } from './styles/flat.js';
import { pixel } from './styles/pixel.js';
import { neon } from './styles/neon.js';
import { comic } from './styles/comic.js';

const STYLES = [iso, flat, pixel, neon, comic];

const fmt = (n) => '$' + n.toLocaleString('en-US');

function bikeCard(st, art) {
  const s = st.specs;
  return `<div class="bikecard">
    <div class="bc-tag">New arrival</div>
    <div class="bc-art">${art}</div>
    <div class="bc-name">${s.name}</div>
    <div class="bc-color">${s.color}</div>
    <div class="bc-specs">
      <div><b>${s.cc}</b><span>cc</span></div>
      <div><b>${s.hp}</b><span>HP</span></div>
      <div><b>${s.topSpeed.split(' ')[0]}</b><span>mph</span></div>
    </div>
    <div class="bc-buy"><span>Order from supplier</span><b>${fmt(s.price)}</b></div>
  </div>`;
}

function iconBlock(svg) {
  return `<div class="iconblock">
    <div class="appicon big">${svg}</div>
    <div class="home">
      <div class="app"><div class="appicon">${svg}</div><span>MotoAddict</span></div>
      <div class="app ghost"><div class="appicon"></div><span>Maps</span></div>
      <div class="app ghost"><div class="appicon"></div><span>Camera</span></div>
    </div>
  </div>`;
}

async function render() {
  const root = document.getElementById('styles');
  for (const st of STYLES) {
    const sceneHTML = await st.scene();
    const art = await st.bike();
    const ic = await st.icon();
    const sec = document.createElement('section');
    sec.className = `style s-${st.id}`;
    sec.id = `style-${st.num}`;
    sec.innerHTML = `
      <header class="st-head"><span class="st-num">${st.num}</span><div><h2>${st.name}</h2><p>${st.blurb}</p></div></header>
      <div class="st-grid">
        <div class="col">
          <h3>Main dealership screen</h3>
          <div class="phone"><div class="screen">
            <div class="scene">${sceneHTML}</div>
            ${statusBar()}${hud()}${sideButtons()}${haggleCard()}${tabbar(0)}
            <div class="homebar"></div>
          </div></div>
        </div>
        <div class="col">
          <h3>Bike card · Kawasaki Ninja H2</h3>
          ${bikeCard(st, art)}
          <h3>App icon</h3>
          ${iconBlock(ic)}
        </div>
      </div>`;
    root.appendChild(sec);
    if (st.after) await st.after(sec);
  }
  fitPhones();
  document.body.dataset.ready = '1';
}

function fitPhones() {
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) e.target.style.setProperty('--k', e.contentRect.width / 390);
  });
  document.querySelectorAll('.phone').forEach((p) => ro.observe(p));
}

document.fonts.ready.then(render);
