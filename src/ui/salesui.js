// Haggle panel, trade-in offers and floating "+$" effects.
import { BIKE } from '../data/bikes.js';
import { getLayout } from '../data/layout.js';
import { pendingHaggles, acceptOffer, counterOffer, refuseOffer, acceptTradeIn, declineTradeIn, tradeInValue } from '../core/sales.js';
import { freeSpace } from '../core/showroom.js';
import { haggleSeconds } from '../core/effects.js';
import { money } from '../core/format.js';
import { toMap } from '../render/world.js';
import { openModal, toast } from './modal.js';
import { thumb } from './thumbs.js';
import { fill } from './icons.js';

// ---------------- haggling ----------------
export function makeHaggle(G, onSale) {
  const el = document.getElementById('haggle');
  let shown = null; // customer id currently in the panel
  let lastKey = '';

  function render() {
    const s = G.state, i = s.activeLoc, t = G.now();
    const list = pendingHaggles(s, i).sort((a, b) => a.deadline - b.deadline);
    const c = list[0];
    if (!c) { if (shown !== null) { el.hidden = true; shown = null; lastKey = ''; } return; }
    const left = Math.max(0, c.deadline - t), total = c.round === 1 ? 25000 : 15000;
    const key = `${c.id}|${c.round}|${c.offer}|${list.length}`;
    if (key !== lastKey) {
      lastKey = key;
      shown = c.id;
      const bike = s.locations[i].bikes.find((b) => b.uid === c.bikeUid);
      const name = bike ? BIKE[bike.model].name : 'bike';
      const counter = Math.round((c.offer + (c.list - c.offer) / 2) / 10) * 10;
      el.innerHTML = `
        <div class="hg-head"><b>${c.round === 1 ? 'Haggle!' : 'Last offer!'}</b><span class="hg-timer"><i></i></span>${list.length > 1 ? `<em>+${list.length - 1} waiting</em>` : ''}</div>
        <div class="hg-body">${bike ? `<img src="${thumb(bike.model, 12)}" alt="">` : ''}<span>${c.round === 1 ? 'Customer offers' : 'Final offer'} <b>${money(c.offer)}</b> for the <b>${name}</b> <span class="dim">(list ${money(c.list)})</span></span></div>
        <div class="hg-btns">
          <button class="btn go" data-a="accept">Accept ${money(c.offer)}</button>
          ${c.round === 1 ? `<button class="btn" data-a="counter">Counter ${money(counter)}</button>` : ''}
          <button class="btn no" data-a="refuse">${c.round === 1 ? 'Refuse' : 'No deal'}</button>
        </div>`;
      el.hidden = false;
    }
    el.querySelector('.hg-timer i').style.width = `${(left / total) * 100}%`;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || shown === null) return;
    const s = G.state, i = s.activeLoc, t = G.now();
    const c = pendingHaggles(s, i).find((x) => x.id === shown);
    if (!c) return;
    const bike = s.locations[i].bikes.find((x) => x.uid === c.bikeUid);
    const spot = bike?.spot;
    let r;
    if (b.dataset.a === 'accept') r = acceptOffer(s, i, c.id, t);
    if (b.dataset.a === 'counter') r = counterOffer(s, i, c.id, t);
    if (b.dataset.a === 'refuse') r = refuseOffer(s, i, c.id, t);
    if (!r?.ok) return;
    if (r.result === 'sold') { toast(r.hardBargain ? `Hard bargain! They paid full price: ${money(r.price)}` : `Sold for ${money(r.price)}!`); onSale(r.report, spot); }
    if (r.result === 'lastOffer') toast(`They came back with ${money(r.offer)}`);
    if (r.result === 'walked') { toast('They walked out.'); onSale(r.report, null); }
    lastKey = '';
    G.changed();
    render();
  });
  return { render };
}

// ---------------- trade-ins ----------------
export function makeTradeIn(G) {
  const card = document.getElementById('tradein');
  let key = '';
  function render() {
    const o = G.state.tradeIn, t = G.now();
    if (!o || o.expiresAt <= t || o.loc !== G.state.activeLoc) { if (!card.hidden) card.hidden = true; key = ''; return; }
    const k = `${o.model}|${o.at}`;
    if (k !== key) {
      key = k;
      card.innerHTML = `<img class="pb" src="${thumb(o.model, 14)}" alt=""><div><b>TRADE-IN!</b><span>${BIKE[o.model].name} · ${o.condition}%</span><em id="tiTime"></em></div>`;
      card.hidden = false;
    }
    const left = Math.max(0, o.expiresAt - t);
    card.querySelector('#tiTime').textContent = `${Math.floor(left / 60000)}m ${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}s`;
  }
  card.addEventListener('click', () => open());
  async function open() {
    const o = G.state.tradeIn;
    if (!o) return;
    const bk = BIKE[o.model], value = tradeInValue(o), space = freeSpace(G.state, o.loc) > 0;
    await openModal({
      title: 'Trade-in offer',
      cls: 'bikecard',
      body: await fill(`
        <div class="bc">
          <div class="art"><img class="big" src="${thumb(o.model, 40)}" alt=""></div>
          <div class="info">
            <div class="br">${bk.brand} ${bk.name} · ${bk.color} · used</div>
            <div class="specs"><span>{{engine:22}}<b>${bk.cc}</b>cc</span><span>{{bolt:22}}<b>${bk.hp}</b>hp</span><span>{{speed:22}}<b>${bk.mph}</b>mph</span></div>
            <div class="rows">
              <div><span>Condition</span><b>${o.condition}%</b></div>
              <div><span>They want</span><b>${money(o.cost)}</b></div>
              <div><span>Resale value now</span><b class="g">${money(value)}</b></div>
              <div><span>New price</span><b>${money(bk.price)}</b></div>
            </div>
            <p class="sub">Hire a mechanic to repair it and raise its value.${space ? '' : ' <b class="warn">No free display spot.</b>'}</p>
          </div>
        </div>`),
      actions: [
        { label: `Buy for ${money(o.cost)}`, kind: 'go', onClick: () => {
          const r = acceptTradeIn(G.state, G.now());
          if (!r.ok) { toast(r.reason); return false; }
          toast(`${bk.name} added to your showroom`);
          G.changed();
          return true;
        } },
        { label: 'Decline', onClick: () => { declineTradeIn(G.state); G.changed(); } },
      ],
    });
  }
  return { render, open };
}

// ---------------- floating money ----------------
export function floatMoney(amount, x, y, kind = 'sale') {
  const layer = document.getElementById('layer');
  const [mx, my] = toMap(x, y, 2.4);
  const el = document.createElement('div');
  el.className = `float ${kind}`;
  el.textContent = `+${money(amount)}`;
  el.style.left = `${mx}px`;
  el.style.top = `${my}px`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}
export const spotXY = (spotId, loc = 0) => { const s = getLayout(loc).spot[spotId]; return s ? [s.x, s.y] : getLayout(loc).focus; };
